import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatNode {
  id: string;
  x: number;
  y: number;
}

type RelationType = 'parent' | 'kit' | 'mate' | 'ex-mate';

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

// SVG heart path centered at (0,0), ~18px tall
const HEART_PATH =
  'M 0,-6 C 0,-6 -2,-11 -7,-11 C -11,-11 -11,-6 -11,-6 C -11,-2 -6,3 0,9 C 6,3 11,-2 11,-6 C 11,-6 11,-11 7,-11 C 2,-11 0,-6 0,-6 Z';

// Broken heart — two halves with a jagged zigzag split
const BROKEN_LEFT =
  'M 0,-6 C 0,-6 -2,-11 -7,-11 C -11,-11 -11,-6 -11,-6 C -11,-2 -6,3 0,9 L 2,5 L -2,1 L 2,-2 L -1,-5 L 0,-6 Z';
const BROKEN_RIGHT =
  'M 0,-6 L 3,-3 L -1,0 L 3,4 L 0,9 C 6,3 11,-2 11,-6 C 11,-6 11,-11 7,-11 C 2,-11 0,-6 0,-6 Z';

// ─── SVG connection rendering ─────────────────────────────────────────────────

function ConnectionLine({
  conn,
  cats,
}: {
  conn: Connection;
  cats: CatNode[];
}) {
  const from = cats.find((c) => c.id === conn.fromId);
  const to = cats.find((c) => c.id === conn.toId);
  if (!from || !to) return null;

  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  if (conn.type === 'parent' || conn.type === 'kit') {
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#6b7280"
        strokeWidth={2}
        strokeLinecap="round"
      />
    );
  }

  // For mate / ex-mate: two short lines stopping at the heart
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 2) return null;
  const ux = (x2 - x1) / dist;
  const uy = (y2 - y1) / dist;
  const GAP = 16;
  const ax2 = mx - ux * GAP;
  const ay2 = my - uy * GAP;
  const bx1 = mx + ux * GAP;
  const by1 = my + uy * GAP;

  if (conn.type === 'mate') {
    return (
      <g>
        <line x1={x1} y1={y1} x2={ax2} y2={ay2} stroke="#f9a8d4" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={bx1} y1={by1} x2={x2} y2={y2} stroke="#f9a8d4" strokeWidth={2.5} strokeLinecap="round" />
        <path
          transform={`translate(${mx}, ${my})`}
          d={HEART_PATH}
          fill="#f472b6"
          stroke="#ec4899"
          strokeWidth={0.5}
        />
      </g>
    );
  }

  // ex-mate: dark red broken heart
  return (
    <g>
      <line x1={x1} y1={y1} x2={ax2} y2={ay2} stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={bx1} y1={by1} x2={x2} y2={y2} stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" />
      {/* Left half shifted slightly down-left */}
      <path
        transform={`translate(${mx - 2}, ${my + 2})`}
        d={BROKEN_LEFT}
        fill="#991b1b"
        stroke="#7f1d1d"
        strokeWidth={0.5}
      />
      {/* Right half shifted slightly up-right */}
      <path
        transform={`translate(${mx + 2}, ${my - 2})`}
        d={BROKEN_RIGHT}
        fill="#991b1b"
        stroke="#7f1d1d"
        strokeWidth={0.5}
      />
    </g>
  );
}

// ─── Pop-up button style helper ───────────────────────────────────────────────

function PopupBtn({
  label,
  color,
  active,
  onClick,
  testId,
}: {
  label: string;
  color?: string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: '12px',
        fontWeight: active ? 600 : 500,
        border: 'none',
        background: hovered || active ? 'rgba(0,0,0,0.07)' : 'transparent',
        padding: '6px 16px',
        color: color ?? '#111',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'background 0.1s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function VerticalBtn({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick?: () => void;
  testId?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: '13px',
        fontWeight: 500,
        border: 'none',
        background: hovered ? 'rgba(0,0,0,0.07)' : 'transparent',
        padding: '9px 20px',
        color: '#111',
        cursor: 'pointer',
        borderRadius: '6px',
        textAlign: 'left',
        transition: 'background 0.1s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main canvas component ────────────────────────────────────────────────────

export default function FamilyTreeCanvas() {
  const [cats, setCats] = useState<CatNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [showAddMenuId, setShowAddMenuId] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  const viewportRef = useRef<HTMLDivElement>(null);

  const catDrag = useRef<{
    id: string | null;
    startClientX: number;
    startClientY: number;
    nodeStartX: number;
    nodeStartY: number;
    moved: boolean;
  }>({ id: null, startClientX: 0, startClientY: 0, nodeStartX: 0, nodeStartY: 0, moved: false });

  const panState = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startTX: number;
    startTY: number;
  }>({ active: false, startClientX: 0, startClientY: 0, startTX: 0, startTY: 0 });

  const pinchState = useRef<{
    active: boolean;
    startDist: number;
    startScale: number;
    midX: number;
    midY: number;
    startTX: number;
    startTY: number;
  }>({ active: false, startDist: 0, startScale: 1, midX: 0, midY: 0, startTX: 0, startTY: 0 });

  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const catsRef = useRef(cats);
  catsRef.current = cats;

  // ── Wheel zoom ──────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform((prev) => {
      const newScale = clampScale(prev.scale * factor);
      const rf = newScale / prev.scale;
      return { scale: newScale, x: cx - (cx - prev.x) * rf, y: cy - (cy - prev.y) * rf };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Canvas pan ──────────────────────────────────────────────────────────────
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.cat-node')) return;
    setActivePopupId(null);
    setShowAddMenuId(null);
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
    if (!panState.current.active) return;
    const dx = e.clientX - panState.current.startClientX;
    const dy = e.clientY - panState.current.startClientY;
    setTransform((prev) => ({
      ...prev,
      x: panState.current.startTX + dx,
      y: panState.current.startTY + dy,
    }));
  }, []);

  const handleCanvasPointerUp = useCallback(() => {
    panState.current.active = false;
  }, []);

  // ── Pinch zoom ──────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const rect = viewportRef.current?.getBoundingClientRect();
    const midX = (t1.clientX + t2.clientX) / 2 - (rect?.left ?? 0);
    const midY = (t1.clientY + t2.clientY) / 2 - (rect?.top ?? 0);
    pinchState.current = {
      active: true,
      startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
      startScale: transformRef.current.scale,
      midX,
      midY,
      startTX: transformRef.current.x,
      startTY: transformRef.current.y,
    };
    panState.current.active = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchState.current.active) return;
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const factor = dist / pinchState.current.startDist;
    const newScale = clampScale(pinchState.current.startScale * factor);
    const rf = newScale / pinchState.current.startScale;
    const { midX, midY, startTX, startTY } = pinchState.current;
    setTransform({ scale: newScale, x: midX - (midX - startTX) * rf, y: midY - (midY - startTY) * rf });
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchState.current.active = false;
  }, []);

  // ── Node drag ───────────────────────────────────────────────────────────────
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
      setShowAddMenuId(null);
    } else {
      setActivePopupId((prev) => (prev === id ? null : id));
      setShowAddMenuId(null);
    }
    catDrag.current.id = null;
  }, []);

  // ── Add cat (Add Cat button) ────────────────────────────────────────────────
  const addCat = useCallback(() => {
    const { x, y, scale } = transformRef.current;
    const canvasX = (window.innerWidth / 2 - x) / scale + (Math.random() - 0.5) * 120;
    const canvasY = (window.innerHeight / 2 - y) / scale + (Math.random() - 0.5) * 120;
    setCats((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), x: canvasX, y: canvasY },
    ]);
  }, []);

  // ── Add relation from sub-menu ──────────────────────────────────────────────
  const handleAddRelation = useCallback((fromCatId: string, type: RelationType) => {
    const fromCat = catsRef.current.find((c) => c.id === fromCatId);
    if (!fromCat) return;
    const SPACING = 220;
    const jitter = () => (Math.random() - 0.5) * 60;
    let nx = fromCat.x;
    let ny = fromCat.y;
    if (type === 'parent')   { ny = fromCat.y - SPACING; nx = fromCat.x + jitter(); }
    if (type === 'kit')      { ny = fromCat.y + SPACING; nx = fromCat.x + jitter(); }
    if (type === 'mate')     { nx = fromCat.x + SPACING; ny = fromCat.y + jitter(); }
    if (type === 'ex-mate')  { nx = fromCat.x - SPACING; ny = fromCat.y + jitter(); }
    const newId = Math.random().toString(36).slice(2, 9);
    setCats((prev) => [...prev, { id: newId, x: nx, y: ny }]);
    setConnections((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), fromId: fromCatId, toId: newId, type },
    ]);
    setActivePopupId(null);
    setShowAddMenuId(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  const DOT_SPACING = 24;

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
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: '#111111', touchAction: 'none' }}
    >
      {/* ── Dot grid ── */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="dots"
            x={transform.x % (DOT_SPACING * transform.scale)}
            y={transform.y % (DOT_SPACING * transform.scale)}
            width={DOT_SPACING * transform.scale}
            height={DOT_SPACING * transform.scale}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={DOT_SPACING * transform.scale * 0.5}
              cy={DOT_SPACING * transform.scale * 0.5}
              r={Math.max(0.5, transform.scale)}
              fill="#252525"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* ── Canvas world ── */}
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
        {/* Connection lines SVG */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}
        >
          {connections.map((conn) => (
            <ConnectionLine key={conn.id} conn={conn} cats={cats} />
          ))}
        </svg>

        {/* Cat nodes */}
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

            {/* ── Main horizontal popup ── */}
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
                  gap: '1px',
                  zIndex: 30,
                  userSelect: 'none',
                  cursor: 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Down-arrow */}
                <div style={{
                  position: 'absolute', bottom: '-7px', left: '50%',
                  transform: 'translateX(-50%)', pointerEvents: 'none',
                  width: 0, height: 0,
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '7px solid #ffffff',
                }} />

                {/* ── Vertical "Add" sub-menu (stacked above main popup) ── */}
                {showAddMenuId === cat.id && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 10px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '5px',
                      gap: '1px',
                      zIndex: 40,
                      minWidth: '150px',
                    }}
                  >
                    {/* Arrow pointing down */}
                    <div style={{
                      position: 'absolute', bottom: '-7px', left: '50%',
                      transform: 'translateX(-50%)', pointerEvents: 'none',
                      width: 0, height: 0,
                      borderLeft: '7px solid transparent',
                      borderRight: '7px solid transparent',
                      borderTop: '7px solid #ffffff',
                    }} />
                    <VerticalBtn
                      label="Parent"
                      testId="add-parent"
                      onClick={() => handleAddRelation(cat.id, 'parent')}
                    />
                    <VerticalBtn
                      label="Mate"
                      testId="add-mate"
                      onClick={() => handleAddRelation(cat.id, 'mate')}
                    />
                    <VerticalBtn
                      label="Ex-Mate"
                      testId="add-ex-mate"
                      onClick={() => handleAddRelation(cat.id, 'ex-mate')}
                    />
                    <VerticalBtn
                      label="Kit"
                      testId="add-kit"
                      onClick={() => handleAddRelation(cat.id, 'kit')}
                    />
                  </div>
                )}

                {/* Main buttons */}
                <PopupBtn label="View" testId="popup-view" />
                <PopupBtn label="Edit" testId="popup-edit" />
                <PopupBtn
                  label="Add"
                  testId="popup-add"
                  active={showAddMenuId === cat.id}
                  onClick={() =>
                    setShowAddMenuId((prev) => (prev === cat.id ? null : cat.id))
                  }
                />
                <PopupBtn label="Delete" color="#c0392b" testId="popup-delete" />
                <PopupBtn
                  label="Close"
                  testId="popup-close"
                  onClick={() => {
                    setActivePopupId(null);
                    setShowAddMenuId(null);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Add Cat button ── */}
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
