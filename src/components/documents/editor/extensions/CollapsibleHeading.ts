import { Heading } from '@tiptap/extension-heading';
import { CollapsiblePlugin, collapsiblePluginKey } from './CollapsiblePlugin';

export const CollapsibleHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      collapsed: {
        default: false,
        parseHTML: element => element.getAttribute('data-collapsed') === 'true',
        renderHTML: attributes => ({
          'data-collapsed': attributes.collapsed ? 'true' : 'false',
        }),
      },
    };
  },

  addProseMirrorPlugins() {
    return [CollapsiblePlugin];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const level = node.attrs.level;
      const collapsed = node.attrs.collapsed;

      // Create the heading element
      const heading = document.createElement(`h${level}`);
      heading.classList.add('collapsible-heading');
      heading.dataset.level = String(level);
      heading.dataset.collapsed = String(collapsed);

      // Create toggle button
      const toggle = document.createElement('button');
      toggle.classList.add('collapse-toggle');
      toggle.contentEditable = 'false';
      toggle.type = 'button';
      toggle.innerHTML = collapsed 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';

      // Create content span
      const content = document.createElement('span');
      content.classList.add('heading-content');

      // Toggle click handler
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (typeof getPos === 'function') {
          const pos = getPos();
          // Get the current node from the document at click time
          const currentNode = editor.state.doc.nodeAt(pos);
          if (!currentNode) return;
          
          const newCollapsed = !currentNode.attrs.collapsed;
          
          editor.chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...currentNode.attrs,
                collapsed: newCollapsed,
              });
              // Signal the plugin to rebuild decorations
              tr.setMeta(collapsiblePluginKey, true);
              return true;
            })
            .run();
        }
      });

      heading.append(toggle, content);

      return {
        dom: heading,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'heading') {
            return false;
          }
          
          const newCollapsed = updatedNode.attrs.collapsed;
          heading.dataset.collapsed = String(newCollapsed);
          heading.dataset.level = String(updatedNode.attrs.level);
          toggle.innerHTML = newCollapsed 
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
          
          return true;
        },
      };
    };
  },
});
