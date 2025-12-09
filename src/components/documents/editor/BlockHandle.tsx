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
  const isHoveringHandle = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) return;
    
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    const editorElement = editor.view.dom;
    const editorRect = editorElement.getBoundingClientRect();
    
    // Check if mouse is within editor bounds (with generous padding for the handle area)
    if (
      e.clientX < editorRect.left - 80 ||
      e.clientX > editorRect.right + 20 ||
      e.clientY < editorRect.top - 10 ||
      e.clientY > editorRect.bottom + 10
    ) {
      // Don't hide immediately if hovering over the handle
      if (!isHoveringHandle.current) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    // Get position in the document using the editor area
    const pos = editor.view.posAtCoords({ 
      left: Math.max(e.clientX, editorRect.left + 10), 
      top: e.clientY 
    });
    
    if (!pos) {
      if (!isHoveringHandle.current) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
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
        left: -44,
        visible: true,
        nodePos: blockPos,
      });
    }
  }, [editor]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current && !isHoveringHandle.current) {
      // Small delay to allow mouse to reach the handle
      hideTimeoutRef.current = setTimeout(() => {
        if (!isHoveringHandle.current) {
          setPosition(prev => ({ ...prev, visible: false }));
        }
      }, 150);
    }
  }, []);

  const handleHandleMouseEnter = useCallback(() => {
    isHoveringHandle.current = true;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleHandleMouseLeave = useCallback(() => {
    isHoveringHandle.current = false;
    // Hide after a short delay
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringHandle.current) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
    }, 100);
  }, []);

  useEffect(() => {
    // Use the editor-content-wrapper which contains both the handle and editor
    const editorWrapper = editor.view.dom.closest('.editor-content-wrapper');
    if (!editorWrapper) return;

    editorWrapper.addEventListener('mousemove', handleMouseMove);
    editorWrapper.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      editorWrapper.removeEventListener('mousemove', handleMouseMove);
      editorWrapper.removeEventListener('mouseleave', handleMouseLeave);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
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
      onMouseEnter={handleHandleMouseEnter}
      onMouseLeave={handleHandleMouseLeave}
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
