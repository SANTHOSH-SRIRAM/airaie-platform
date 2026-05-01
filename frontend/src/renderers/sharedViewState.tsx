import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Shared view-state — coordinates camera + scalar range across two renderers
// inside a <SplitRenderer axisLocked>.
//
// Phase 9 Plan 09-02 §2C.1 (2026-05-01) — closes the no-op `axisLocked` prop
// on SplitRenderer that's been a TODO since Phase 11 Plan B.
//
// Contract for renderer consumers:
//   - Call `useSharedViewState()` at the top of the renderer.
//   - If it returns null → no provider above, render normally (no-op).
//   - If it returns a non-null state → bind the renderer's camera/scalar range
//     to it via the publish/subscribe API:
//       state.subscribe('camera', applyIncomingCamera)
//       state.publish('camera', newCamera) on local interaction-end
//
// Why a publish/subscribe pattern rather than props: 3D viewers
// (Cad3DViewer / VtpViewer) own their camera imperatively via OrbitControls /
// vtk.js — they can't take a `camera` prop without fighting their internal
// controllers. Publish/subscribe lets the viewer keep ownership while still
// participating in the shared state.
//
// Why ref-based dispatcher rather than React state: camera moves at 60fps
// during a drag. Funneling those updates through React state would re-render
// the entire SplitRenderer subtree every frame. The dispatcher is plain JS;
// React state holds only the latest snapshot for components that legitimately
// re-render on view changes (e.g. a "rotate to match" indicator).
// ---------------------------------------------------------------------------

export type CameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
};

export type ScalarRangeSnapshot = {
  min: number;
  max: number;
};

type Listener<T> = (value: T) => void;

export interface SharedViewStateApi {
  /** Latest camera (snapshot, may be null if no viewer has published yet). */
  camera: CameraSnapshot | null;
  /** Latest scalar range (vtk-only; null when no viewer publishes). */
  scalarRange: ScalarRangeSnapshot | null;
  /** Publish a new value on a channel. Notifies all subscribers EXCEPT publisherId. */
  publish: (channel: 'camera', value: CameraSnapshot, publisherId: string) => void;
  publishScalarRange: (value: ScalarRangeSnapshot, publisherId: string) => void;
  /** Subscribe to a channel. Returns an unsubscribe fn. */
  subscribeCamera: (id: string, listener: Listener<CameraSnapshot>) => () => void;
  subscribeScalarRange: (id: string, listener: Listener<ScalarRangeSnapshot>) => () => void;
}

const SharedViewStateCtx = createContext<SharedViewStateApi | null>(null);

export function useSharedViewState(): SharedViewStateApi | null {
  return useContext(SharedViewStateCtx);
}

interface ProviderProps {
  children: ReactNode;
}

/**
 * Provider for shared view-state coordination. Mount above two renderers
 * (e.g. inside SplitRenderer when axisLocked) so they can publish/subscribe
 * to each other's camera + scalar range without prop drilling.
 *
 * Throttles fan-out via requestAnimationFrame: even if a viewer publishes
 * camera updates 60×/sec during a drag, subscribers see at most one
 * notification per frame. Avoids feedback loops where viewer A's apply()
 * triggers viewer B's onEnd, which publishes back to A, …
 */
export function SharedViewStateProvider({ children }: ProviderProps) {
  // React state for snapshot reads (subscribers like indicators that legitimately re-render).
  const [camera, setCamera] = useState<CameraSnapshot | null>(null);
  const [scalarRange, setScalarRange] = useState<ScalarRangeSnapshot | null>(null);

  // Imperative listener registry — subscribers don't trigger React renders.
  const cameraListenersRef = useRef<Map<string, Listener<CameraSnapshot>>>(new Map());
  const scalarRangeListenersRef = useRef<Map<string, Listener<ScalarRangeSnapshot>>>(new Map());

  // RAF coalescing — collapse multiple publishes-per-frame into one fan-out.
  const pendingCameraRef = useRef<{ value: CameraSnapshot; publisher: string } | null>(null);
  const pendingScalarRef = useRef<{ value: ScalarRangeSnapshot; publisher: string } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    rafIdRef.current = null;
    const cam = pendingCameraRef.current;
    if (cam) {
      pendingCameraRef.current = null;
      setCamera(cam.value);
      cameraListenersRef.current.forEach((listener, id) => {
        if (id !== cam.publisher) listener(cam.value);
      });
    }
    const sr = pendingScalarRef.current;
    if (sr) {
      pendingScalarRef.current = null;
      setScalarRange(sr.value);
      scalarRangeListenersRef.current.forEach((listener, id) => {
        if (id !== sr.publisher) listener(sr.value);
      });
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(flush);
  }, [flush]);

  const publish = useCallback(
    (channel: 'camera', value: CameraSnapshot, publisherId: string) => {
      if (channel !== 'camera') return;
      pendingCameraRef.current = { value, publisher: publisherId };
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const publishScalarRange = useCallback(
    (value: ScalarRangeSnapshot, publisherId: string) => {
      pendingScalarRef.current = { value, publisher: publisherId };
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const subscribeCamera = useCallback((id: string, listener: Listener<CameraSnapshot>) => {
    cameraListenersRef.current.set(id, listener);
    return () => {
      cameraListenersRef.current.delete(id);
    };
  }, []);

  const subscribeScalarRange = useCallback(
    (id: string, listener: Listener<ScalarRangeSnapshot>) => {
      scalarRangeListenersRef.current.set(id, listener);
      return () => {
        scalarRangeListenersRef.current.delete(id);
      };
    },
    [],
  );

  const api = useMemo<SharedViewStateApi>(
    () => ({
      camera,
      scalarRange,
      publish,
      publishScalarRange,
      subscribeCamera,
      subscribeScalarRange,
    }),
    [camera, scalarRange, publish, publishScalarRange, subscribeCamera, subscribeScalarRange],
  );

  return <SharedViewStateCtx.Provider value={api}>{children}</SharedViewStateCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Pure helpers for tests and renderer call sites.
// ---------------------------------------------------------------------------

/** True when both cameras are within `epsilon` of each other on every axis. */
export function camerasEqual(a: CameraSnapshot, b: CameraSnapshot, epsilon = 1e-4): boolean {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a.position[i] - b.position[i]) > epsilon) return false;
    if (Math.abs(a.target[i] - b.target[i]) > epsilon) return false;
    if (Math.abs(a.up[i] - b.up[i]) > epsilon) return false;
  }
  return true;
}

/** True when scalar ranges are within `epsilon`. */
export function scalarRangesEqual(
  a: ScalarRangeSnapshot,
  b: ScalarRangeSnapshot,
  epsilon = 1e-6,
): boolean {
  return Math.abs(a.min - b.min) < epsilon && Math.abs(a.max - b.max) < epsilon;
}
