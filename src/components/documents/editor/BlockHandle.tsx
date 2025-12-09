import { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const isHoveringHandle = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
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
    
    if (depth === 0) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Get the top-level block position
    const blockPos = $pos.before(1);
    const node = editor.state.doc.nodeAt(blockPos);
    
    if (!node) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Get coordinates for this block
    const coords = editor.view.coordsAtPos(blockPos);
    
    if (coords) {
      setPosition({
        top: coords.top - editorRect.top,
        left: -28,
        visible: true,
        nodePos: blockPos,
      });
    }
  }, [editor]);

  const handleMouseLeave = useCallback(() => {
    if (!isHoveringHandle.current) {
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
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringHandle.current) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
    }, 100);
  }, []);

  useEffect(() => {
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

  const handleAddBlock = useCallback(() => {
    if (position.nodePos === undefined) return;

    try {
      const node = editor.state.doc.nodeAt(position.nodePos);
      if (!node) return;

      const endOfBlock = position.nodePos + node.nodeSize;
      
      editor
        .chain()
        .focus()
        .insertContentAt(endOfBlock, { type: 'paragraph' })
        .setTextSelection(endOfBlock + 1)
        .run();

      // Trigger slash command
      setTimeout(() => {
        editor.commands.insertContent('/');
      }, 10);
    } catch (error) {
      console.error('Error adding block:', error);
    }
  }, [editor, position.nodePos]);

  if (!position.visible) {
    return null;
  }

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
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="block-handle-btn block-add-btn"
            onClick={handleAddBlock}
          >
            <Plus size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Adicionar bloco</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
