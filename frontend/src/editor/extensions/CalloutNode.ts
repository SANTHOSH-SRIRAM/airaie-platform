import { Node, mergeAttributes } from '@tiptap/core';

// ---------------------------------------------------------------------------
// CalloutNode — info / warning / success variants. Holds inline+block
// content (you can have paragraphs, lists, even other typed blocks inside
// a callout — useful for "Govern note" + a kpiBlock inside a single
// callout).
//
// This Node uses Tiptap's built-in HTML rendering rather than a React
// NodeView, so the bytes stay in the `editor` chunk without React glue.
// The `data-variant` attribute drives Tailwind classes that style the
// background tint per variant.
// ---------------------------------------------------------------------------

type CalloutVariant = 'info' | 'warning' | 'success';

const VARIANT_CLASS: Record<CalloutVariant, string> = {
  info: 'air-callout-info bg-[#e3f2fd] border-l-[3px] border-[#2196f3] px-[12px] py-[8px] my-[8px] rounded-[6px]',
  warning:
    'air-callout-warning bg-[#fff3e0] border-l-[3px] border-[#f57c00] px-[12px] py-[8px] my-[8px] rounded-[6px]',
  success:
    'air-callout-success bg-[#e8f5e9] border-l-[3px] border-[#4caf50] px-[12px] py-[8px] my-[8px] rounded-[6px]',
};

function classFor(variant: unknown): string {
  if (variant === 'warning' || variant === 'success' || variant === 'info') {
    return VARIANT_CLASS[variant];
  }
  return VARIANT_CLASS.info;
}

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+', // contains other blocks (paragraph, list, …)
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info' as CalloutVariant,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-variant') ?? 'info',
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant ?? 'info' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes['data-variant'];
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block-type': 'callout',
        class: classFor(variant),
      }),
      0, // children
    ];
  },
});
