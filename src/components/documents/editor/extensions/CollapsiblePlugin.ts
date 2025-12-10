import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const collapsiblePluginKey = new PluginKey('collapsiblePlugin');

export const CollapsiblePlugin = new Plugin({
  key: collapsiblePluginKey,
  
  state: {
    init(_, { doc }) {
      return buildDecorations(doc);
    },
    apply(tr, oldDecorations, oldState, newState) {
      // Rebuild decorations if document changed or if a heading's collapsed state changed
      if (tr.docChanged || tr.getMeta(collapsiblePluginKey)) {
        return buildDecorations(newState.doc);
      }
      return oldDecorations.map(tr.mapping, tr.doc);
    },
  },
  
  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});

function buildDecorations(doc: any): DecorationSet {
  const decorations: Decoration[] = [];
  const collapsedRanges: { from: number; to: number }[] = [];
  
  // First pass: find all collapsed headings and their ranges
  doc.forEach((node: any, offset: number) => {
    if (node.type.name === 'heading' && node.attrs.collapsed) {
      const headingLevel = node.attrs.level;
      const headingEnd = offset + node.nodeSize;
      
      // Find the end of the collapse range
      let collapseEnd = doc.content.size;
      let pos = headingEnd;
      
      doc.nodesBetween(headingEnd, doc.content.size, (childNode: any, childPos: number) => {
        // Stop at the next heading of same or higher level (lower number = higher level)
        if (childNode.type.name === 'heading' && childNode.attrs.level <= headingLevel) {
          if (childPos < collapseEnd && childPos >= headingEnd) {
            collapseEnd = childPos;
          }
          return false; // Stop traversing
        }
        return true;
      });
      
      if (collapseEnd > headingEnd) {
        collapsedRanges.push({ from: headingEnd, to: collapseEnd });
      }
    }
  });
  
  // Second pass: apply decorations to nodes in collapsed ranges
  collapsedRanges.forEach(({ from, to }) => {
    doc.nodesBetween(from, to, (node: any, pos: number) => {
      // Only apply to top-level nodes (not nested content)
      if (pos >= from && pos < to) {
        // Check if this position is at the start of a top-level node
        const $pos = doc.resolve(pos);
        if ($pos.depth === 0) {
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: 'collapsed-content',
            })
          );
          return false; // Don't recurse into this node's children
        }
      }
      return true;
    });
  });
  
  return DecorationSet.create(doc, decorations);
}
