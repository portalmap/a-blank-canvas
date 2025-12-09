import { Editor } from '@tiptap/react';
import { Plus, GripVertical } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

interface BlockHandleProps {
  editor: Editor;
}

interface HandlePosition {
  top: number;
  left: number;
  visible: boolean;
  nodePos: number;
}

export const BlockHandle = ({ editor }: BlockHandleProps) => {
  const [position, setPosition] = useState<HandlePosition>({
    top: 0,
    left: 0,
    visible: false,
    nodePos: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) return;
    
    const editorElement = editor.view.dom;
    const editorRect = editorElement.getBoundingClientRect();
    
    // Check if mouse is within editor bounds (with some padding for the handle area)
    if (
      e.clientX < editorRect.left - 60 ||
      e.clientX > editorRect.right ||
      e.clientY < editorRect.top ||
      e.clientY > editorRect.bottom
    ) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Get position in the document
    const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    
    if (!pos) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Find the block node at this position
    const $pos = editor.state.doc.resolve(pos.pos);
    const depth = $pos.depth;
    
    // Get the top-level block position
    let blockPos = pos.pos;
    if (depth > 0) {
      blockPos = $pos.before(1);
    }

    // Get coordinates of the block start
    const coords = editor.view.coordsAtPos(blockPos);
    
    if (coords) {
      setPosition({
        top: coords.top - editorRect.top,
        left: -44, // Position to the left of the editor
        visible: true,
        nodePos: blockPos,
      });
    }
  }, [editor]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current) {
      setPosition(prev => ({ ...prev, visible: false }));
    }
  }, []);

  useEffect(() => {
    const editorContainer = editor.view.dom.parentElement;
    if (!editorContainer) return;

    editorContainer.addEventListener('mousemove', handleMouseMove);
    editorContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      editorContainer.removeEventListener('mousemove', handleMouseMove);
      editorContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editor, handleMouseMove, handleMouseLeave]);

  const handleAddBlock = () => {
    // Insert a new paragraph after the current block and focus it
    const { nodePos } = position;
    const node = editor.state.doc.nodeAt(nodePos);
    
    if (node) {
      const endPos = nodePos + node.nodeSize;
      editor.chain()
        .focus()
        .insertContentAt(endPos, { type: 'paragraph' })
        .setTextSelection(endPos + 1)
        .run();
      
      // Trigger slash menu
      setTimeout(() => {
        editor.chain().focus().insertContent('/').run();
      }, 10);
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    
    const { nodePos } = position;
    
    // Select the node for dragging
    editor.chain()
      .focus()
      .setNodeSelection(nodePos)
      .run();
    
    // Add dragging class to editor
    editor.view.dom.classList.add('dragging');
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    editor.view.dom.classList.remove('dragging');
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleDragEnd);
    return () => document.removeEventListener('mouseup', handleDragEnd);
  }, []);

  if (!position.visible) return null;

  return (
    <div
      ref={containerRef}
      className="block-handle-container"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <button
        type="button"
        className="block-handle-btn block-add-btn"
        onClick={handleAddBlock}
        title="Adicionar bloco"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="block-handle-btn block-drag-btn"
        onMouseDown={handleDragStart}
        title="Arrastar para mover"
        draggable
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
};
