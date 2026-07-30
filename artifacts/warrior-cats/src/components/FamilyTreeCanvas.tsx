import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CatNode {
  id: string;
  x: number;
  y: number;
}

export default function FamilyTreeCanvas() {
  const [cats, setCats] = useState<CatNode[]>([]);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<{
    draggingId: string | null;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    moved: boolean;
  }>({
    draggingId: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
    moved: false,
  });

  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handlePointerDown = (e: React.PointerEvent, cat: CatNode) => {
    // Only left click or touch
    if (e.button !== 0 && e.type !== 'pointerdown') return;
    
    // Release capture if needed
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragState.current = {
      draggingId: cat.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: cat.x,
      nodeStartY: cat.y,
      moved: false,
    };
    
    const nodeEl = nodeRefs.current[cat.id];
    if (nodeEl) {
      nodeEl.style.cursor = 'grabbing';
      nodeEl.style.zIndex = '100'; 
    }
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const { draggingId, startX, startY, nodeStartX, nodeStartY } = dragState.current;
    if (!draggingId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragState.current.moved = true;
    }

    const newX = nodeStartX + dx;
    const newY = nodeStartY + dy;

    const nodeEl = nodeRefs.current[draggingId];
    if (nodeEl) {
      nodeEl.style.left = `${newX}px`;
      nodeEl.style.top = `${newY}px`;
    }
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const { draggingId, moved, startX, startY, nodeStartX, nodeStartY } = dragState.current;
    
    if (draggingId) {
      const nodeEl = nodeRefs.current[draggingId];
      if (nodeEl) {
        nodeEl.style.cursor = 'grab';
        nodeEl.style.zIndex = activePopupId === draggingId ? '20' : '10';
      }

      if (moved) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newX = nodeStartX + dx;
        const newY = nodeStartY + dy;
        
        setCats((prev) => 
          prev.map((c) => (c.id === draggingId ? { ...c, x: newX, y: newY } : c))
        );
        
        if (activePopupId === draggingId) {
          setActivePopupId(null);
        }
      } else {
        setActivePopupId(draggingId);
        if (nodeEl) {
          nodeEl.style.zIndex = '20';
        }
      }

      dragState.current = {
        draggingId: null,
        startX: 0,
        startY: 0,
        nodeStartX: 0,
        nodeStartY: 0,
        moved: false,
      };
    } else {
      const target = e.target as HTMLElement;
      if (!target.closest('.cat-node') && !target.closest('.cat-popup')) {
        setActivePopupId(null);
      }
    }
  }, [activePopupId]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const addCat = () => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    const randomOffset = () => (Math.random() - 0.5) * 100;
    
    const newCat: CatNode = {
      id: Math.random().toString(36).substring(2, 9),
      x: cx + randomOffset(),
      y: cy + randomOffset(),
    };
    
    setCats((prev) => [...prev, newCat]);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        backgroundColor: '#2a2a2a'
      }}
    >
      <svg 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none' 
        }}
      >
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="3" fill="#3a3a3a" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {cats.map((cat) => (
        <div
          key={cat.id}
          ref={(el) => (nodeRefs.current[cat.id] = el)}
          className="cat-node"
          onPointerDown={(e) => handlePointerDown(e, cat)}
          style={{
            position: 'absolute',
            left: cat.x,
            top: cat.y,
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            fontWeight: 600,
            color: '#000',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none', 
            zIndex: activePopupId === cat.id ? 20 : 10,
          }}
        >
          New Cat

          {activePopupId === cat.id && (
            <div
              className="cat-popup"
              onPointerDown={(e) => e.stopPropagation()} 
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '12px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                gap: '2px',
                zIndex: 30,
                userSelect: 'none',
                cursor: 'default',
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid #fff',
                }}
              />

              {['View', 'Edit', 'Add', 'Delete'].map((action) => (
                <button
                  key={action}
                  style={{
                    fontSize: '12px',
                    border: 'none',
                    background: 'transparent',
                    padding: '4px 8px',
                    color: '#000',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {action}
                </button>
              ))}
              <button
                style={{
                  fontSize: '12px',
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 8px',
                  color: '#000',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => setActivePopupId(null)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addCat}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#fff',
          color: '#000',
          fontWeight: 600,
          borderRadius: '12px',
          padding: '10px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        Add Cat
      </button>
    </div>
  );
}
