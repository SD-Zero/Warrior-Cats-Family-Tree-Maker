import React, { useState, useRef, useCallback, useEffect } from 'react';

interface CatNode {
  id: string;
  x: number;
  y: number;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export default function FamilyTreeCanvas() {
  const [cats, setCats] = useState<CatNode[]>([]);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const viewportRef = useRef<HTMLDivElement>(null);

  // --- Drag state for cat nodes ---
  const catDrag = useRef<{
    id: string | null;
    startClientX: number;
    startClientY: number;
    nodeStartX: number;
    nodeStartY: number;
    moved: boolean;
  }>({ id: null, startClientX: 0, startClientY: 0, nodeStartX: 0, nodeStartY: 0, moved: false });

  // --- Pan state for canvas ---
  const panState = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startTX: number;
    startTY: number;
  }>({ active: false, startClientX: 0, startClientY: 0, startTX: 0, startTY: 0 });

  // --- Pinch state ---
  const pinchState = useRef<{
    active: boolean;
    startDist: number;
    startScale: number;
    midX: number;
    midY: number;
    startTX: number;
    startTY: number;
  }>({ active: false, startDist: 0, startScale: 1, midX: 0, midY: 0, startTX: 0, startTY: 0 });

  // Refs for immediate node position updates (avoids re-renders during drag)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // ---- Wheel zoom ----
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform((prev) => {
      const newScale = clampScale(prev.scale * factor);
      const realFactor = newScale / prev.scale;
      return {
        scale: newScale,
        x: cursorX - (cursorX - prev.x) * realFactor,
        y: cursorY - (cursorY - prev.y) * realFactor,
      };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ---- Canvas pan (pointer on empty background) ----
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Only start pan if clicking the canvas itself (not a cat node)
    if ((e.target as HTMLElement).closest('.cat-node')) return;
    setActivePopupId(null);
    panState.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTX: transformRef.current.x,
      startTY: transformRef.current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (panState.current.active) {
      const dx = e.clientX - panState.current.startClientX;
      const dy = e.clientY - panState.current.startClientY;
      setTransform((prev) => ({
        ...prev,
        x: panState.current.startTX + dx,
        y: panState.current.startTY + dy,
      }));
    }
  }, []);

  const handleCanvasPointerUp = useCallback(() => {
    panState.current.active = false;
  }, []);

  // ---- Touch pinch zoom ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const rect = viewportRef.current?.getBoundingClientRect();
      pinchState.current = {
        active: true,
        startDist: dist,
        startScale: transformRef.current.scale,
        midX: rect ? midX - rect.left : midX,
        midY: rect ? midY - rect.top : midY,
        startTX: transformRef.current.x,
        startTY: transformRef.current.y,
      };
      panState.current.active = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchState.current.active) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = dist / pinchState.current.startDist;
      const newScale = clampScale(pinchState.current.startScale * factor);
      const realFactor = newScale / pinchState.current.startScale;
      const { midX, midY, startTX, startTY } = pinchState.current;
      setTransform({
        scale: newScale,
        x: midX - (midX - startTX) * realFactor,
        y: midY - (midY - startTY) * realFactor,
      });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchState.current.active = false;
  }, []);

  // ---- Cat node drag ----
  const handleNodePointerDown = useCallback((e: React.PointerEvent, cat: CatNode) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    catDrag.current = {
      id: cat.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      nodeStartX: cat.x,
      nodeStartY: cat.y,
      moved: false,
    };
    const el = nodeRefs.current[cat.id];
    if (el) el.style.cursor = 'grabbing';
  }, []);

  const handleNodePointerMove = useCallback((e: React.PointerEvent) => {
    const { id, startClientX, startClientY, nodeStartX, nodeStartY } = catDrag.current;
    if (!id) return;
    const scale = transformRef.current.scale;
    const dx = (e.clientX - startClientX) / scale;
    const dy = (e.clientY - startClientY) / scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) catDrag.current.moved = true;
    const el = nodeRefs.current[id];
    if (el) {
      el.style.left = `${nodeStartX + dx}px`;
      el.style.top = `${nodeStartY + dy}px`;
    }
  }, []);

  const handleNodePointerUp = useCallback((e: React.PointerEvent, cat: CatNode) => {
    const { id, startClientX, startClientY, nodeStartX, nodeStartY, moved } = catDrag.current;
    if (!id) return;
    const el = nodeRefs.current[id];
    if (el) el.style.cursor = 'grab';
    if (moved) {
      const scale = transformRef.current.scale;
      const dx = (e.clientX - startClientX) / scale;
      const dy = (e.clientY - startClientY) / scale;
      setCats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, x: nodeStartX + dx, y: nodeStartY + dy } : c))
      );
      setActivePopupId(null);
    } else {
      setActivePopupId((prev) => (prev === id ? null : id));
    }
    catDrag.current.id = null;
  }, []);

  // ---- Add cat ----
  const addCat = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { x, y, scale } = transformRef.current;
    // Convert viewport center to canvas coordinates
    const canvasX = (vw / 2 - x) / scale + (Math.random() - 0.5) * 120;
    const canvasY = (vh / 2 - y) / scale + (Math.random() - 0.5) * 120;
    setCats((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), x: canvasX, y: canvasY },
    ]);
  }, []);

  const dotSpacing = 24;
  const dotRadius = 1;

  return (
    <div
      ref={viewportRef}
      data-testid="canvas-viewport"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: '#111111',
        cursor: panState.current.active ? 'grabbing' : 'default',
        touchAction: 'none',
      }}
    >
      {/* Dot grid — rendered as a large SVG that moves/scales with the transform */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <defs>
          <pattern
            id="dots"
            x={transform.x % (dotSpacing * transform.scale)}
            y={transform.y % (dotSpacing * transform.scale)}
            width={dotSpacing * transform.scale}
            height={dotSpacing * transform.scale}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={dotSpacing * transform.scale * 0.5}
              cy={dotSpacing * transform.scale * 0.5}
              r={dotRadius * Math.max(0.5, transform.scale)}
              fill="#252525"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Canvas world — transformed layer for cat nodes */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          willChange: 'transform',
        }}
      >
        {cats.map((cat) => (
          <div
            key={cat.id}
            ref={(el) => (nodeRefs.current[cat.id] = el)}
            className="cat-node"
            data-testid={`cat-node-${cat.id}`}
            onPointerDown={(e) => handleNodePointerDown(e, cat)}
            onPointerMove={handleNodePointerMove}
            onPointerUp={(e) => handleNodePointerUp(e, cat)}
            onPointerCancel={(e) => handleNodePointerUp(e, cat)}
            style={{
              position: 'absolute',
              left: cat.x,
              top: cat.y,
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '12px 28px',
              minWidth: '160px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              fontWeight: 600,
              fontSize: '14px',
              color: '#111',
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
              zIndex: activePopupId === cat.id ? 20 : 10,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            New Cat

            {activePopupId === cat.id && (
              <div
                className="cat-popup"
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 12px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px',
                  gap: '2px',
                  zIndex: 30,
                  userSelect: 'none',
                  cursor: 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Arrow */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-7px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '7px solid transparent',
                    borderRight: '7px solid transparent',
                    borderTop: '7px solid #ffffff',
                    pointerEvents: 'none',
                  }}
                />
                {['View', 'Edit', 'Add', 'Delete'].map((action) => (
                  <button
                    key={action}
                    data-testid={`popup-${action.toLowerCase()}`}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 14px',
                      color: action === 'Delete' ? '#c0392b' : '#111',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background 0.1s',
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)')
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    {action}
                  </button>
                ))}
                <button
                  data-testid="popup-close"
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    background: 'transparent',
                    padding: '6px 14px',
                    color: '#111',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)')
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                  onClick={() => setActivePopupId(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Cat button — fixed to viewport, not the canvas world */}
      <button
        data-testid="button-add-cat"
        onClick={addCat}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          backgroundColor: '#ffffff',
          color: '#111',
          fontWeight: 700,
          fontSize: '14px',
          borderRadius: '12px',
          padding: '13px 40px',
          minWidth: '160px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1000,
          letterSpacing: '0.01em',
        }}
      >
        Add Cat
      </button>
    </div>
  );
}
