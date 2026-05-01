import { Suspense, useEffect, useId, useMemo, useRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { Bounds, Center, Environment, Grid, OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Box, Lock } from 'lucide-react';
import { useSharedViewState, type CameraSnapshot, camerasEqual } from './sharedViewState';
import type { BoardMode, RendererProps } from './types';
import type { RunViewState } from '@/types/run';

// ---------------------------------------------------------------------------
// Cad3DViewer — STL / GLTF / GLB / OBJ inline 3D preview.
//
// Phase 11 Wave C Pass 2 — implements the `cad-3d` registry entry from
// concepts/04-RENDERER-REGISTRY.md. R3F + drei keep the JSX surface minimal;
// the STL/OBJ/GLTF loaders ship in three.js itself (`three/examples/jsm/`).
//
// Bundle accounting: three core (~580 KB) + @react-three/fiber (~50 KB) +
// @react-three/drei (selective, ~150 KB) live in the `render-3d` Vite chunk
// (vite.config.ts manualChunks). This component is lazy()-imported by the
// registry so cards without 3D artifacts never load these bytes.
//
// Camera/lighting baseline:
// - drei <Bounds> auto-fits any geometry into the viewport
// - drei <Environment preset='studio'> gives a neutral PBR fill
// - <Grid> floor anchors the model so users orient quickly
// - <OrbitControls> for pan/rotate/zoom (left/right drag + scroll)
//
// view_state persistence (Release-mode determinism, concepts/04 §"View
// state") is a separate pass — controls aren't pinned yet.
// ---------------------------------------------------------------------------

function inferKind(name: string | undefined, type: string): 'stl' | 'obj' | 'gltf' | 'glb' {
  const ext = (name?.split('.').pop() ?? type).toLowerCase();
  if (ext === 'glb') return 'glb';
  if (ext === 'gltf') return 'gltf';
  if (ext === 'obj') return 'obj';
  return 'stl';
}

// useLoader's TS surface expects a Three Loader subclass constructor; the
// jsm loaders satisfy that at runtime but their ambient declarations don't
// always line up. We cast at the boundary and keep the consumers typed.

function StlMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader as never, url) as unknown as THREE.BufferGeometry;
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#cfcfcc" metalness={0.15} roughness={0.55} />
    </mesh>
  );
}

function ObjMesh({ url }: { url: string }) {
  const obj = useLoader(OBJLoader as never, url) as unknown as THREE.Group;
  return <primitive object={obj} />;
}

function GltfMesh({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader as never, url) as unknown as { scene: THREE.Group };
  return <primitive object={gltf.scene} />;
}

function ModelByKind({ url, kind }: { url: string; kind: ReturnType<typeof inferKind> }) {
  if (kind === 'obj') return <ObjMesh url={url} />;
  if (kind === 'gltf' || kind === 'glb') return <GltfMesh url={url} />;
  return <StlMesh url={url} />;
}

// Inside-Canvas sync component (must live as a child of <Canvas> to access
// the R3F context via useThree). Handles three concerns:
//   1. SharedViewStateProvider (axis-locked SplitRenderer)  —  Plan 09-02 §2C.1
//   2. Initial hydration from `props.viewState` (Release-mode reproducibility) — §2F.1
//   3. Debounced persistence via onViewStateChange — §2F.1
//
// In Release mode (boardMode === 'release'), persistence is SKIPPED — the user
// can rotate locally for inspection but their rotation doesn't change the
// canonical view; on re-mount the locked camera returns. §2F.2.
function SharedCameraSync({
  instanceId,
  boardMode,
  initialViewState,
  onViewStateChange,
}: {
  instanceId: string;
  boardMode?: BoardMode;
  initialViewState?: RunViewState;
  onViewStateChange?: (viewState: RunViewState) => void;
}) {
  const shared = useSharedViewState();
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  // Track the last camera we *applied from* shared/initial state, so the
  // change event we fire afterwards doesn't re-publish it (echo loop).
  const lastAppliedRef = useRef<CameraSnapshot | null>(null);
  // Debounce timer for persistence callback.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!controls) return;

    const snapshot = (): CameraSnapshot => ({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      up: [camera.up.x, camera.up.y, camera.up.z],
    });

    const apply = (incoming: CameraSnapshot) => {
      lastAppliedRef.current = incoming;
      camera.position.set(incoming.position[0], incoming.position[1], incoming.position[2]);
      camera.up.set(incoming.up[0], incoming.up[1], incoming.up[2]);
      controls.target.set(incoming.target[0], incoming.target[1], incoming.target[2]);
      controls.update();
    };

    // Hydration order on mount (highest precedence first):
    //   1. shared (a sibling pane already rotated — axis-lock follows them)
    //   2. initialViewState (persisted from a prior session)
    if (shared?.camera) {
      apply(shared.camera);
    } else if (initialViewState?.camera) {
      apply(initialViewState.camera);
    }

    const onChange = () => {
      const cur = snapshot();
      if (lastAppliedRef.current && camerasEqual(cur, lastAppliedRef.current)) {
        return; // we just applied this — don't echo back
      }
      // §2C.1 — broadcast to axis-lock siblings (always, even in Release).
      shared?.publish('camera', cur, instanceId);

      // §2F.1 — persist via onViewStateChange, but ONLY in Explore/Study.
      // §2F.2 — Release mode swallows persistence; the original view stays
      // canonical even though the user can pan/rotate locally.
      if (boardMode !== 'release' && onViewStateChange) {
        if (persistTimerRef.current != null) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
          onViewStateChange({
            camera: { position: cur.position, target: cur.target, up: cur.up },
          });
        }, 1000);
      }
    };

    controls.addEventListener('change', onChange);
    const unsub = shared?.subscribeCamera(instanceId, apply);

    return () => {
      controls.removeEventListener('change', onChange);
      unsub?.();
      if (persistTimerRef.current != null) clearTimeout(persistTimerRef.current);
    };
  }, [shared, controls, camera, instanceId, boardMode, initialViewState, onViewStateChange]);

  return null;
}

export default function Cad3DViewer({
  artifact,
  downloadUrl,
  boardMode,
  viewState,
  onViewStateChange,
}: RendererProps) {
  const kind = useMemo(() => inferKind(artifact.name, artifact.type), [artifact.name, artifact.type]);
  const instanceId = useId(); // unique per Cad3DViewer instance for shared-view publisher tagging
  const isReleaseLocked = boardMode === 'release';

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-[#1a1c19]">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        className="block h-[480px] w-full"
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <Bounds fit clip observe margin={1.4}>
            <Center>
              <ModelByKind url={downloadUrl} kind={kind} />
            </Center>
          </Bounds>
        </Suspense>
        <Grid
          args={[20, 20]}
          sectionColor="#444"
          cellColor="#2a2a2a"
          fadeDistance={20}
          fadeStrength={1}
          infiniteGrid
        />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        <SharedCameraSync
          instanceId={instanceId}
          boardMode={boardMode}
          initialViewState={viewState}
          onViewStateChange={onViewStateChange}
        />
      </Canvas>
      {isReleaseLocked ? (
        <div
          className="absolute right-2 top-2 z-10 inline-flex items-center gap-[4px] rounded-md bg-amber-100/95 px-[6px] py-[2px] text-[10px] font-medium text-amber-800 backdrop-blur-sm"
          title="Release-mode view: camera is canonical for this run; local rotation isn't persisted"
        >
          <Lock size={10} />
          Release-locked
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-[#e8e8e8] bg-white px-[12px] py-[6px] text-[11px] text-[#6b6b6b]">
        <span className="flex items-center gap-[6px]">
          <Box size={12} aria-hidden="true" />
          <span className="truncate">{artifact.name ?? artifact.id}</span>
          <span className="font-mono uppercase text-[#acacac]">{kind}</span>
        </span>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[#c14110] hover:underline"
        >
          download ↗
        </a>
      </div>
    </div>
  );
}
