import { Suspense, useEffect, useId, useMemo, useRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { Bounds, Center, Environment, Grid, OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Box } from 'lucide-react';
import { useSharedViewState, type CameraSnapshot, camerasEqual } from './sharedViewState';
import type { RendererProps } from './types';

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
// the R3F context via useThree). Reads the OrbitControls instance via R3F's
// state.controls and binds it to the SharedViewStateProvider above the
// SplitRenderer. No-op when no provider is mounted (the common case — single
// viewer outside a SplitRenderer axisLocked).
//
// Phase 9 Plan 09-02 §2C.1.
function SharedCameraSync({ instanceId }: { instanceId: string }) {
  const shared = useSharedViewState();
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  // Track the last camera we *applied from* shared state, so the change
  // event we fire afterwards doesn't re-publish it (echo loop).
  const lastAppliedRef = useRef<CameraSnapshot | null>(null);

  useEffect(() => {
    if (!shared || !controls) return;

    const snapshot = (): CameraSnapshot => ({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      up: [camera.up.x, camera.up.y, camera.up.z],
    });

    const onChange = () => {
      const cur = snapshot();
      if (lastAppliedRef.current && camerasEqual(cur, lastAppliedRef.current)) {
        return; // we just applied this from shared state — don't echo back
      }
      shared.publish('camera', cur, instanceId);
    };

    const apply = (incoming: CameraSnapshot) => {
      lastAppliedRef.current = incoming;
      camera.position.set(incoming.position[0], incoming.position[1], incoming.position[2]);
      camera.up.set(incoming.up[0], incoming.up[1], incoming.up[2]);
      controls.target.set(incoming.target[0], incoming.target[1], incoming.target[2]);
      controls.update();
    };

    // On mount: if a previous viewer already published a camera, hydrate to it.
    if (shared.camera) apply(shared.camera);

    controls.addEventListener('change', onChange);
    const unsub = shared.subscribeCamera(instanceId, apply);

    return () => {
      controls.removeEventListener('change', onChange);
      unsub();
    };
  }, [shared, controls, camera, instanceId]);

  return null;
}

export default function Cad3DViewer({ artifact, downloadUrl }: RendererProps) {
  const kind = useMemo(() => inferKind(artifact.name, artifact.type), [artifact.name, artifact.type]);
  const instanceId = useId(); // unique per Cad3DViewer instance for shared-view publisher tagging

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-[#1a1c19]">
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
        <SharedCameraSync instanceId={instanceId} />
      </Canvas>
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
