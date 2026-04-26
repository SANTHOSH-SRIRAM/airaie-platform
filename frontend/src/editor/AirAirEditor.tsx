import { EditorContent, type Editor } from '@tiptap/react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// AirAirEditor — the React glue layer that mounts a Tiptap `<EditorContent>`
// inside a styled wrapper.
//
// Phase 10 / Plan 10-01 deliberately ships hand-rolled typography styles
// (the long arbitrary-value chain below) rather than pulling in
// `@tailwindcss/typography`. Reasons:
//   - The project already uses arbitrary-value Tailwind classes throughout
//     (see e.g. CardTopBar, CardActionBar — px-[16px], text-[12px], etc.);
//     adding a new plugin would mismatch that idiom.
//   - The typography plugin ships ~20KB of opinionated CSS we don't need.
//   - Wave 10-04 wants pixel-precise control over heading sizes / line
//     heights to match the Notion-style spec; arbitrary values get us
//     there without an escape hatch later.
// If a future wave wants the full plugin, the change is: install,
// add to tailwind.config.js plugins, swap the long class chain for
// `prose prose-sm max-w-none`. No structural change to this component.
// ---------------------------------------------------------------------------

interface AirAirEditorProps {
  editor: Editor | null;
  className?: string;
}

export function AirAirEditor({ editor, className }: AirAirEditorProps) {
  if (!editor) return null;

  return (
    <div className={cn('air-editor', className)}>
      <EditorContent
        editor={editor}
        className={cn(
          // Container — invariant Notion-feel: minimum 400px, generous
          // horizontal breathing room, no visible focus outline (the cursor
          // is the focus indicator).
          'min-h-[400px]',
          '[&_.ProseMirror]:p-[24px]',
          '[&_.ProseMirror]:min-h-[400px]',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror]:text-[14px]',
          '[&_.ProseMirror]:leading-[1.65]',
          '[&_.ProseMirror]:text-[#1a1a1a]',
          // Headings.
          '[&_.ProseMirror_h1]:text-[28px]',
          '[&_.ProseMirror_h1]:font-semibold',
          '[&_.ProseMirror_h1]:leading-[1.25]',
          '[&_.ProseMirror_h1]:mt-[24px]',
          '[&_.ProseMirror_h1]:mb-[12px]',
          '[&_.ProseMirror_h2]:text-[20px]',
          '[&_.ProseMirror_h2]:font-semibold',
          '[&_.ProseMirror_h2]:leading-[1.3]',
          '[&_.ProseMirror_h2]:mt-[20px]',
          '[&_.ProseMirror_h2]:mb-[10px]',
          '[&_.ProseMirror_h3]:text-[16px]',
          '[&_.ProseMirror_h3]:font-semibold',
          '[&_.ProseMirror_h3]:leading-[1.4]',
          '[&_.ProseMirror_h3]:mt-[16px]',
          '[&_.ProseMirror_h3]:mb-[8px]',
          // Paragraphs.
          '[&_.ProseMirror_p]:my-[8px]',
          // Lists.
          '[&_.ProseMirror_ul]:list-disc',
          '[&_.ProseMirror_ul]:pl-[24px]',
          '[&_.ProseMirror_ul]:my-[8px]',
          '[&_.ProseMirror_ol]:list-decimal',
          '[&_.ProseMirror_ol]:pl-[24px]',
          '[&_.ProseMirror_ol]:my-[8px]',
          '[&_.ProseMirror_li]:my-[2px]',
          // Blockquote.
          '[&_.ProseMirror_blockquote]:border-l-[3px]',
          '[&_.ProseMirror_blockquote]:border-[#e8e8e8]',
          '[&_.ProseMirror_blockquote]:pl-[12px]',
          '[&_.ProseMirror_blockquote]:my-[12px]',
          '[&_.ProseMirror_blockquote]:text-[#6b6b6b]',
          // Inline code.
          '[&_.ProseMirror_code]:bg-[#f0f0ec]',
          '[&_.ProseMirror_code]:px-[4px]',
          '[&_.ProseMirror_code]:py-[1px]',
          '[&_.ProseMirror_code]:rounded-[4px]',
          '[&_.ProseMirror_code]:text-[12.5px]',
          '[&_.ProseMirror_code]:font-mono',
          // Code block.
          '[&_.ProseMirror_pre]:bg-[#1a1a1a]',
          '[&_.ProseMirror_pre]:text-[#fafafa]',
          '[&_.ProseMirror_pre]:p-[12px]',
          '[&_.ProseMirror_pre]:rounded-[8px]',
          '[&_.ProseMirror_pre]:my-[12px]',
          '[&_.ProseMirror_pre]:overflow-x-auto',
          '[&_.ProseMirror_pre_code]:bg-transparent',
          '[&_.ProseMirror_pre_code]:p-0',
          '[&_.ProseMirror_pre_code]:text-[12.5px]',
          // Horizontal rule.
          '[&_.ProseMirror_hr]:border-0',
          '[&_.ProseMirror_hr]:border-t',
          '[&_.ProseMirror_hr]:border-[#e8e8e8]',
          '[&_.ProseMirror_hr]:my-[20px]',
          // Marks.
          '[&_.ProseMirror_strong]:font-semibold',
          '[&_.ProseMirror_em]:italic',
          '[&_.ProseMirror_a]:text-[#1976d2]',
          '[&_.ProseMirror_a]:underline',
          '[&_.ProseMirror_a]:underline-offset-2',
          // Selection — make sure it renders even on an atom NodeView.
          '[&_.ProseMirror_.ProseMirror-selectednode]:outline-2',
          '[&_.ProseMirror_.ProseMirror-selectednode]:outline-[#f57c00]',
          '[&_.ProseMirror_.ProseMirror-selectednode]:outline-offset-2',
          '[&_.ProseMirror_.ProseMirror-selectednode]:rounded-[8px]',
          // Placeholder — only on a single empty paragraph.
          '[&_.ProseMirror_p.is-editor-empty:first-child]:relative',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#bdbdbd]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
        )}
      />
    </div>
  );
}
