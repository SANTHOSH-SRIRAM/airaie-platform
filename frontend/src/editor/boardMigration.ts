import type { BoardBodyDoc } from '@/types/boardBlocks';
import type { BlockNode } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// boardMigration — Phase 10 / Plan 10-05b auto-migration for Boards.
//
// Mirror of `migration.ts` (Card-canvas auto-migration). When a Board has
// `body_blocks IS NULL` and the user opens the canvas for the first time,
// we synthesize a minimum default doc so the editor isn't empty. The first
// edit + idle save will populate the row.
//
// Wave 10-05b ships a thin default — a heading, a Cards Grid, then the 4
// remaining Board-specific blocks as placeholders + paragraphs to give the
// user editable cursor space. Wave 10-05c will pull in real cards / gates /
// evidence summaries to seed each rollup with sensible attrs.
// ---------------------------------------------------------------------------

export interface GenerateDefaultBoardBodyArgs {
  /** Used to populate display chrome (heading text). */
  boardName?: string;
}

export function generateDefaultBoardBody(
  args: GenerateDefaultBoardBodyArgs = {},
): BoardBodyDoc {
  const blocks: BlockNode[] = [];

  if (args.boardName) {
    blocks.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: args.boardName }],
    });
  }

  blocks.push({
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Cards in this board:',
      },
    ],
  });

  blocks.push({ type: 'cardsGridBlock', attrs: { filter: null } });

  blocks.push({ type: 'paragraph' });

  blocks.push({ type: 'cardsGraphBlock' });
  blocks.push({ type: 'gatesRollupBlock' });
  blocks.push({ type: 'evidenceRollupBlock' });
  blocks.push({ type: 'artifactPoolBlock' });

  blocks.push({ type: 'paragraph' });

  return { type: 'doc', content: blocks };
}
