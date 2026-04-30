import { memo, useEffect, useRef, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// LazyMount — wraps a heavy block in an IntersectionObserver-guarded sentinel.
// Renders a placeholder with the same layout footprint until the sentinel
// scrolls into the viewport, then mounts the real children. Once mounted,
// stays mounted (no flicker on scroll-out / scroll-in).
//
// Phase 10 polish (#19). The CardsGraphBlockView pays a substantial cost on
// mount because it pulls in `@xyflow/react` and renders a DAG; deferring
// that until the user actually scrolls to it is meaningfully cheaper on
// long board canvases.
//
// Tiptap quirk: prosemirror's NodeView lifecycle calls render() before the
// element is in the DOM, so `entries[0].isIntersecting` is `false` for one
// frame; we explicitly check `boundingClientRect.top` against viewport
// height as a belt-and-braces fallback.
// ---------------------------------------------------------------------------

interface LazyMountProps {
  /** Approximate height the placeholder should reserve so layout doesn't
   *  shift when the real block mounts. */
  placeholderHeight?: number;
  /** Visible label inside the placeholder. */
  label?: string;
  children: ReactNode;
}

function LazyMountImpl({
  placeholderHeight = 240,
  label = 'Loading…',
  children,
}: LazyMountProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const el = sentinelRef.current;
    if (!el) return;

    // Belt-and-braces synchronous check: if the sentinel is already in the
    // viewport at mount time, skip the observer entirely.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setMounted(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin: '200px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mounted]);

  if (mounted) return <>{children}</>;

  return (
    <div
      ref={sentinelRef}
      className="flex items-center justify-center rounded-[8px] bg-[#fafaf7] text-[12px] text-[#9b978f]"
      style={{ minHeight: placeholderHeight }}
    >
      {label}
    </div>
  );
}

export const LazyMount = memo(LazyMountImpl);
export default LazyMount;
