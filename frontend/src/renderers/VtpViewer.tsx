import { useEffect, useId, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useSharedViewState, type CameraSnapshot, camerasEqual } from './sharedViewState';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// VtpViewer — renders a VTK XML PolyData (.vtp) artifact inline using vtk.js.
//
// Phase 11 Plan B (frontend half). Lazy-loaded via the renderer registry —
// `pickRenderer` returns this entry when artifact.type === 'vtp'. Lives in a
// dedicated `render-vtk` Vite chunk (~2MB gz) that only ships when this
// component mounts.
//
// Spike finding: vtk.js v35 publishes `XMLImageDataReader` and
// `XMLPolyDataReader` only — no direct `.vtu` reader. CalculiX FEA decks
// (.frd) need a server-side conversion step; the conversion target should
// be .vtp (the deformed surface mesh + stress array on points) rather than
// .vtu (volume). Surface rendering with point-data scalars covers the FEA
// use case and is what vtk.js handles natively.
//
// What this MVP does:
//   1. Fetch artifact bytes via `downloadUrl` (presigned URL).
//   2. Parse with `vtkXMLPolyDataReader.parseAsArrayBuffer`.
//   3. Mount a render window inside the container <div>.
//   4. Auto-pick the first point-data array as the color-by source.
//   5. Reset camera + render.
//
// Out of scope for this MVP (deferred):
//   - Color-by-array dropdown (auto-pick only).
//   - Screenshot button.
//   - Camera state persistence.
//   - Color scale / legend.
//   - Color scale / legend.
//
// Phase 9 Plan 09-02 §2C.1 (2026-05-01) — wired to <SharedViewStateProvider>
// for axis-locked SplitRenderer comparison. When mounted under that provider
// the active camera publishes/subscribes to shared state so two VTP viewers
// (or one VTP + one Cad3D) rotate in sync.
// ---------------------------------------------------------------------------

export default function VtpViewer({
  artifact,
  downloadUrl,
  boardMode,
  viewState,
  onViewStateChange,
}: RendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderWindowRef = useRef<{ delete: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const shared = useSharedViewState();
  const instanceId = useId();
  const isReleaseLocked = boardMode === 'release';
  // Refs so the shared subscriber created during VTK mount can stay
  // current with React state without retriggering the heavy mount effect.
  const sharedRef = useRef(shared);
  const instanceIdRef = useRef(instanceId);
  const boardModeRef = useRef(boardMode);
  const initialViewStateRef = useRef(viewState);
  const onViewStateChangeRef = useRef(onViewStateChange);
  useEffect(() => {
    sharedRef.current = shared;
  }, [shared]);
  useEffect(() => {
    instanceIdRef.current = instanceId;
  }, [instanceId]);
  useEffect(() => {
    boardModeRef.current = boardMode;
  }, [boardMode]);
  useEffect(() => {
    initialViewStateRef.current = viewState;
  }, [viewState]);
  useEffect(() => {
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);

  useEffect(() => {
    let cancelled = false;
    let teardownFns: Array<() => void> = [];

    async function mount() {
      if (!containerRef.current) return;
      try {
        // Lazy-load the vtk.js modules inside the effect so the bytes stay
        // out of the ResultsSection import graph until first use.
        const [
          { default: vtkOpenGLRenderWindow },
          { default: vtkRenderer },
          { default: vtkRenderWindow },
          { default: vtkRenderWindowInteractor },
          { default: vtkInteractorStyleTrackballCamera },
          { default: vtkActor },
          { default: vtkMapper },
          { default: vtkXMLPolyDataReader },
        ] = await Promise.all([
          import('@kitware/vtk.js/Rendering/OpenGL/RenderWindow'),
          import('@kitware/vtk.js/Rendering/Core/Renderer'),
          import('@kitware/vtk.js/Rendering/Core/RenderWindow'),
          import('@kitware/vtk.js/Rendering/Core/RenderWindowInteractor'),
          import('@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera'),
          import('@kitware/vtk.js/Rendering/Core/Actor'),
          import('@kitware/vtk.js/Rendering/Core/Mapper'),
          import('@kitware/vtk.js/IO/XML/XMLPolyDataReader'),
        ]);

        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const reader = vtkXMLPolyDataReader.newInstance();
        reader.parseAsArrayBuffer(buf);
        const polyData = reader.getOutputData(0);
        if (!polyData) throw new Error('VTP parse returned no output');

        const renderer = vtkRenderer.newInstance({ background: [0.96, 0.96, 0.94] });
        const renderWindow = vtkRenderWindow.newInstance();
        renderWindow.addRenderer(renderer);

        const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
        openGLRenderWindow.setContainer(containerRef.current);
        renderWindow.addView(openGLRenderWindow);

        const { width, height } = containerRef.current.getBoundingClientRect();
        openGLRenderWindow.setSize(Math.max(320, width), Math.max(240, height));

        const interactor = vtkRenderWindowInteractor.newInstance();
        interactor.setView(openGLRenderWindow);
        interactor.initialize();
        interactor.bindEvents(containerRef.current);
        interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());

        // Auto-pick the first point-data scalar array for color-by, if any.
        const pd = polyData.getPointData();
        const arrayCount = pd.getNumberOfArrays();
        let colorArrayName: string | null = null;
        if (arrayCount > 0) {
          colorArrayName = pd.getArrayName(0);
          pd.setActiveScalars(colorArrayName);
        }

        const mapper = vtkMapper.newInstance();
        mapper.setInputData(polyData);
        if (colorArrayName) {
          mapper.setColorByArrayName(colorArrayName);
          mapper.setScalarModeToUsePointFieldData();
          mapper.setUseLookupTableScalarRange(false);
          const arr = pd.getArrayByName(colorArrayName);
          if (arr) {
            const range = arr.getRange();
            mapper.setScalarRange(range[0], range[1]);
          }
        }

        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        renderer.addActor(actor);
        renderer.resetCamera();
        renderWindow.render();

        // 2C.1 + 2F — bind active camera to SharedViewStateProvider (axis
        // lock for SplitRenderer) AND to optional view-state hydration +
        // debounced persistence (Release-mode reproducibility).
        const camera = renderer.getActiveCamera();
        const lastApplied = { value: null as CameraSnapshot | null };
        let persistTimer: ReturnType<typeof setTimeout> | null = null;

        const snapshotCamera = (): CameraSnapshot => ({
          position: camera.getPosition() as [number, number, number],
          target: camera.getFocalPoint() as [number, number, number],
          up: camera.getViewUp() as [number, number, number],
        });

        const applyIncoming = (incoming: CameraSnapshot) => {
          lastApplied.value = incoming;
          camera.setPosition(...incoming.position);
          camera.setFocalPoint(...incoming.target);
          camera.setViewUp(...incoming.up);
          renderer.resetCameraClippingRange();
          renderWindow.render();
        };

        // Hydration: shared sibling beats persisted view_state.
        if (sharedRef.current?.camera) {
          applyIncoming(sharedRef.current.camera);
        } else if (initialViewStateRef.current?.camera) {
          applyIncoming(initialViewStateRef.current.camera);
        }

        const onCamModified = () => {
          const cur = snapshotCamera();
          if (lastApplied.value && camerasEqual(cur, lastApplied.value)) return; // echo guard
          // Axis-lock broadcast (always, even in Release).
          sharedRef.current?.publish('camera', cur, instanceIdRef.current);
          // §2F.1 — debounced persistence via onViewStateChange. §2F.2 —
          // Release mode swallows persistence so the canonical view stays.
          if (boardModeRef.current !== 'release' && onViewStateChangeRef.current) {
            if (persistTimer != null) clearTimeout(persistTimer);
            persistTimer = setTimeout(() => {
              onViewStateChangeRef.current?.({
                camera: { position: cur.position, target: cur.target, up: cur.up },
              });
            }, 1000);
          }
        };

        const camSub = camera.onModified(onCamModified);
        let sharedUnsub: (() => void) | null = null;
        if (sharedRef.current) {
          sharedUnsub = sharedRef.current.subscribeCamera(instanceIdRef.current, applyIncoming);
        }

        renderWindowRef.current = renderWindow;
        teardownFns = [
          () => {
            if (persistTimer != null) clearTimeout(persistTimer);
          },
          () => camSub.unsubscribe?.(),
          () => sharedUnsub?.(),
          () => interactor.unbindEvents(),
          () => actor.delete(),
          () => mapper.delete(),
          () => reader.delete(),
          () => renderWindow.delete(),
          () => openGLRenderWindow.delete(),
          () => renderer.delete(),
        ];
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message ?? 'Failed to render VTP');
        setLoading(false);
      }
    }

    setLoading(true);
    setError(null);
    void mount();

    return () => {
      cancelled = true;
      for (const fn of teardownFns) {
        try {
          fn();
        } catch {
          // best-effort teardown — vtk.js objects can throw on
          // double-delete; we log nothing because the component is
          // unmounting anyway.
        }
      }
      teardownFns = [];
      renderWindowRef.current = null;
    };
  }, [downloadUrl]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[360px] w-full overflow-hidden rounded-[8px] bg-[#f5f5f0]"
        aria-label={`VTP viewer for ${artifact.name ?? artifact.id}`}
      />
      {isReleaseLocked ? (
        <div
          className="absolute right-2 top-2 z-10 inline-flex items-center gap-[4px] rounded-md bg-amber-100/95 px-[6px] py-[2px] text-[10px] font-medium text-amber-800 backdrop-blur-sm"
          title="Release-mode view: camera is canonical; local rotation isn't persisted"
        >
          <Lock size={10} />
          Release-locked
        </div>
      ) : null}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f0]/80">
          <span className="font-sans text-[12px] text-[#554433]/70">
            Loading VTK viewer (~2 MB)…
          </span>
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fff7e6]">
          <span className="font-sans text-[12px] text-[#cc3326]">
            VTP render failed: {error}
          </span>
        </div>
      ) : null}
    </div>
  );
}
