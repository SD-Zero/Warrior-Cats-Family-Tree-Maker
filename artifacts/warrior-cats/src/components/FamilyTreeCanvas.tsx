import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CatNode, Connection, RelationType, Transform, KitModal } from '../types';
import EditModal from './EditModal';
import KitParentModal from './KitParentModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

// ─── Heart SVG paths (tip pointing DOWN, centered at 0,0) ─────────────────────
const HEART_PATH =
  'M 0,-4 C 0,-4 -1.3,-7 -4.5,-7 C -7,-7 -7,-4 -7,-4 C -7,-1.5 -4,2 0,6 C 4,2 7,-1.5 7,-4 C 7,-4 7,-7 4.5,-7 C 1.3,-7 0,-4 0,-4 Z';

// Broken heart — symmetric halves, crack: (0,-4)→(2,0)→(-2,2)→(0,6)
const BROKEN_LEFT  = 'M 0,-4 C -1.3,-7 -4.5,-7 -4.5,-7 C -7,-7 -7,-4 -7,-4 C -7,-1.5 -4,2 0,6 L -2,2 L 2,0 Z';
const BROKEN_RIGHT = 'M 0,-4 L 2,0 L -2,2 L 0,6 C 4,2 7,-1.5 7,-4 C 7,-4 7,-7 4.5,-7 C 4.5,-7 1.3,-7 0,-4 Z';

// ─── Snap helper ──────────────────────────────────────────────────────────────
function snapTo(val: number, grid: number) {
  return grid > 0 ? Math.round(val / grid) * grid : val;
}

// ─── SVG Connection ───────────────────────────────────────────────────────────

function ConnectionLine({ conn, cats }: { conn: Connection; cats: CatNode[] }) {
  const from = cats.find((c) => c.id === conn.fromId);
  const to   = cats.find((c) => c.id === conn.toId);
  if (!from || !to) return null;

  const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y;

  if (conn.type === 'parent' || conn.type === 'kit') {
    const my = (y1 + y2) / 2;
    const d = `M ${x1},${y1} L ${x1},${my} L ${x2},${my} L ${x2},${y2}`;
    return <path d={d} stroke="#6b7280" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }

  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 2) return null;
  const ux = (x2 - x1) / dist, uy = (y2 - y1) / dist;
  const GAP = 10;
  const ax2 = mx - ux * GAP, ay2 = my - uy * GAP;
  const bx1 = mx + ux * GAP, by1 = my + uy * GAP;

  if (conn.type === 'mate') {
    return (
      <g>
        <line x1={x1} y1={y1} x2={ax2} y2={ay2} stroke="#f9a8d4" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={bx1} y1={by1} x2={x2} y2={y2} stroke="#f9a8d4" strokeWidth={2.5} strokeLinecap="round" />
        <g transform={`translate(${mx},${my})`}>
          <path d={HEART_PATH} fill="#f472b6" stroke="#ec4899" strokeWidth={0.5} />
        </g>
      </g>
    );
  }

  return (
    <g>
      <line x1={x1} y1={y1} x2={ax2} y2={ay2} stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={bx1} y1={by1} x2={x2} y2={y2} stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" />
      <g transform={`translate(${mx},${my})`}>
        <g transform="translate(-2,0)">
          <path d={BROKEN_LEFT}  fill="#991b1b" stroke="#7f1d1d" strokeWidth={0.5} />
        </g>
        <g transform="translate(2,0)">
          <path d={BROKEN_RIGHT} fill="#991b1b" stroke="#7f1d1d" strokeWidth={0.5} />
        </g>
      </g>
    </g>
  );
}

// ─── Shared button helpers ────────────────────────────────────────────────────

function PopupBtn({
  label, color, active, onClick, testId,
}: {
  label: string; color?: string; active?: boolean; onClick?: () => void; testId?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: '12px', fontWeight: active ? 700 : 500, border: 'none',
        background: hov || active ? 'rgba(0,0,0,0.08)' : 'transparent',
        padding: '6px 18px', color: color ?? '#111', cursor: 'pointer',
        borderRadius: '6px', transition: 'background 0.1s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function VerticalBtn({ label, onClick, testId }: { label: string; onClick?: () => void; testId?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: '13px', fontWeight: 500, border: 'none',
        background: hov ? 'rgba(0,0,0,0.08)' : 'transparent',
        padding: '9px 22px', color: '#111', cursor: 'pointer',
        borderRadius: '6px', textAlign: 'left', transition: 'background 0.1s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function DownArrow() {
  return (
    <div style={{
      position: 'absolute', bottom: '-7px', left: '50%',
      transform: 'translateX(-50%)', pointerEvents: 'none',
      width: 0, height: 0,
      borderLeft: '7px solid transparent',
      borderRight: '7px solid transparent',
      borderTop: '7px solid #ffffff',
    }} />
  );
}

// ─── Snap Grid Toggle ─────────────────────────────────────────────────────────

const SNAP_OPTIONS: { label: string; value: number }[] = [
  { label: 'Off',   value: 0   },
  { label: '25px',  value: 25  },
  { label: '50px',  value: 50  },
  { label: '100px', value: 100 },
  { label: '200px', value: 200 },
];

function SnapToggle({ snap, onChange }: { snap: number; onChange: (v: number) => void }) {
  return (
    <div
      style={{
        position: 'fixed', top: '20px', left: '20px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: '5px',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{
        fontSize: '10px', fontWeight: 600, color: '#4b5563',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: '2px', paddingLeft: '2px',
      }}>
        Snap
      </div>
      {SNAP_OPTIONS.map((opt) => {
        const active = snap === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              fontSize: '12px', fontWeight: active ? 700 : 500,
              padding: '5px 12px',
              backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
              color: active ? '#111' : '#6b7280',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '7px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
              minWidth: '62px',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main canvas ──────────────────────────────────────────────────────────────

export default function FamilyTreeCanvas() {
  const [cats,        setCats]        = useState<CatNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [addMenuId,   setAddMenuId]   = useState<string | null>(null);
  const [transform,   setTransform]   = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [kitModal,    setKitModal]    = useState<KitModal | null>(null);
  const [editCatId,   setEditCatId]   = useState<string | null>(null);
  const [snapGrid,    setSnapGrid]    = useState<number>(0);

  const viewportRef    = useRef<HTMLDivElement>(null);
  const transformRef   = useRef(transform);
  transformRef.current = transform;
  const catsRef = useRef(cats);
  catsRef.current = cats;
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;
  const snapGridRef = useRef(snapGrid);
  snapGridRef.current = snapGrid;

  const catDrag = useRef<{
    id: string | null;
    startClientX: number; startClientY: number;
    nodeStartX: number;   nodeStartY: number;
    moved: boolean;
  }>({ id: null, startClientX: 0, startClientY: 0, nodeStartX: 0, nodeStartY: 0, moved: false });

  const panState   = useRef({ active: false, startClientX: 0, startClientY: 0, startTX: 0, startTY: 0 });
  const pinchState = useRef({ active: false, startDist: 0, startScale: 1, midX: 0, midY: 0, startTX: 0, startTY: 0 });

  // ── Wheel zoom ──────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform((prev) => {
      const ns = clampScale(prev.scale * factor), rf = ns / prev.scale;
      return { scale: ns, x: cx - (cx - prev.x) * rf, y: cy - (cy - prev.y) * rf };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Canvas pan ──────────────────────────────────────────────────────────────
  const onCanvasDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.cat-node')) return;
    setActivePopup(null); setAddMenuId(null);
    panState.current = { active: true, startClientX: e.clientX, startClientY: e.clientY, startTX: transformRef.current.x, startTY: transformRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onCanvasMove = useCallback((e: React.PointerEvent) => {
    if (!panState.current.active) return;
    setTransform((prev) => ({
      ...prev,
      x: panState.current.startTX + (e.clientX - panState.current.startClientX),
      y: panState.current.startTY + (e.clientY - panState.current.startClientY),
    }));
  }, []);

  const onCanvasUp = useCallback(() => { panState.current.active = false; }, []);

  // ── Pinch zoom ──────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0], t2 = e.touches[1];
    const rect = viewportRef.current?.getBoundingClientRect();
    pinchState.current = {
      active: true,
      startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
      startScale: transformRef.current.scale,
      midX: (t1.clientX + t2.clientX) / 2 - (rect?.left ?? 0),
      midY: (t1.clientY + t2.clientY) / 2 - (rect?.top ?? 0),
      startTX: transformRef.current.x,
      startTY: transformRef.current.y,
    };
    panState.current.active = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchState.current.active) return;
    e.preventDefault();
    const t1 = e.touches[0], t2 = e.touches[1];
    const factor = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) / pinchState.current.startDist;
    const ns = clampScale(pinchState.current.startScale * factor);
    const rf = ns / pinchState.current.startScale;
    const { midX, midY, startTX, startTY } = pinchState.current;
    setTransform({ scale: ns, x: midX - (midX - startTX) * rf, y: midY - (midY - startTY) * rf });
  }, []);

  const onTouchEnd = useCallback(() => { pinchState.current.active = false; }, []);

  // ── Node drag — live state + snap ───────────────────────────────────────────
  const onNodeDown = useCallback((e: React.PointerEvent, cat: CatNode) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    catDrag.current = { id: cat.id, startClientX: e.clientX, startClientY: e.clientY, nodeStartX: cat.x, nodeStartY: cat.y, moved: false };
  }, []);

  const onNodeMove = useCallback((e: React.PointerEvent) => {
    const { id, startClientX, startClientY, nodeStartX, nodeStartY } = catDrag.current;
    if (!id) return;
    const scale = transformRef.current.scale;
    const dx = (e.clientX - startClientX) / scale;
    const dy = (e.clientY - startClientY) / scale;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) catDrag.current.moved = true;
    const grid = snapGridRef.current;
    setCats((prev) =>
      prev.map((c) => c.id === id ? { ...c, x: snapTo(nodeStartX + dx, grid), y: snapTo(nodeStartY + dy, grid) } : c)
    );
  }, []);

  const onNodeUp = useCallback((_e: React.PointerEvent, cat: CatNode) => {
    const { id, moved } = catDrag.current;
    if (!id) return;
    if (!moved) {
      setActivePopup((prev) => prev === id ? null : id);
      setAddMenuId(null);
    } else {
      setActivePopup(null); setAddMenuId(null);
    }
    catDrag.current.id = null;
  }, []);

  // ── Delete cat ──────────────────────────────────────────────────────────────
  const deleteCat = useCallback((catId: string) => {
    setCats((prev) => prev.filter((c) => c.id !== catId));
    setConnections((prev) => prev.filter((cn) => cn.fromId !== catId && cn.toId !== catId));
    setActivePopup(null); setAddMenuId(null);
  }, []);

  // ── Add free cat ────────────────────────────────────────────────────────────
  const addCat = useCallback(() => {
    const { x, y, scale } = transformRef.current;
    const grid = snapGridRef.current;
    const cx = snapTo((window.innerWidth / 2 - x) / scale, grid || 1);
    const cy = snapTo((window.innerHeight / 2 - y) / scale, grid || 1);
    setCats((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), name: 'New Cat', x: cx, y: cy }]);
  }, []);

  // ── Add related cat ─────────────────────────────────────────────────────────
  const addRelation = useCallback((fromCatId: string, type: RelationType) => {
    const from = catsRef.current.find((c) => c.id === fromCatId);
    if (!from) return;
    const S = 230;
    const offsets: Record<RelationType, [number, number]> = {
      parent: [0, -S], kit: [0, S], mate: [S, 0], 'ex-mate': [-S, 0],
    };
    const [ox, oy] = offsets[type];
    const grid = snapGridRef.current;
    const newId = Math.random().toString(36).slice(2, 9);
    const newX = snapTo(from.x + ox, grid || 1);
    const newY = snapTo(from.y + oy, grid || 1);
    setCats((prev) => [...prev, { id: newId, name: 'New Cat', x: newX, y: newY }]);
    setConnections((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), fromId: fromCatId, toId: newId, type },
    ]);
    setActivePopup(null); setAddMenuId(null);

    if (type === 'kit') {
      const conns = connectionsRef.current;
      const partnerIds = conns
        .filter((cn) => (cn.fromId === fromCatId || cn.toId === fromCatId) && (cn.type === 'mate' || cn.type === 'ex-mate'))
        .map((cn) => ({ partnerId: cn.fromId === fromCatId ? cn.toId : cn.fromId, relType: cn.type }));
      const allCats = catsRef.current;
      const mates: CatNode[] = [], exMates: CatNode[] = [];
      for (const { partnerId, relType } of partnerIds) {
        const node = allCats.find((c) => c.id === partnerId);
        if (!node) continue;
        if (relType === 'mate')    mates.push(node);
        if (relType === 'ex-mate') exMates.push(node);
      }
      if (mates.length > 0 || exMates.length > 0) {
        setKitModal({ forCatId: fromCatId, newKitId: newId, mates, exMates });
      }
    }
  }, []);

  // ── Kit modal ───────────────────────────────────────────────────────────────
  const handleKitLink = useCallback((partnerId: string) => {
    if (!kitModal) return;
    setConnections((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), fromId: partnerId, toId: kitModal.newKitId, type: 'parent' },
    ]);
    setKitModal(null);
  }, [kitModal]);

  // ── Edit modal save ─────────────────────────────────────────────────────────
  const handleEditSave = useCallback((updatedCat: CatNode, newConns: Connection[]) => {
    setCats((prev) => prev.map((c) => c.id === updatedCat.id ? updatedCat : c));
    setConnections(newConns);
    setEditCatId(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  const DOT_SPACING = 24;

  return (
    <>
      <div
        ref={viewportRef}
        data-testid="canvas-viewport"
        onPointerDown={onCanvasDown}
        onPointerMove={onCanvasMove}
        onPointerUp={onCanvasUp}
        onPointerCancel={onCanvasUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: '#111111', touchAction: 'none' }}
      >
        {/* Dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
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

        {/* Canvas world */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          willChange: 'transform',
        }}>
          {/* Connection lines */}
          <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
            {connections.map((conn) => (
              <ConnectionLine key={conn.id} conn={conn} cats={cats} />
            ))}
          </svg>

          {/* Cat nodes */}
          {cats.map((cat) => (
            <div
              key={cat.id}
              className="cat-node"
              data-testid={`cat-node-${cat.id}`}
              onPointerDown={(e) => onNodeDown(e, cat)}
              onPointerMove={onNodeMove}
              onPointerUp={(e) => onNodeUp(e, cat)}
              onPointerCancel={(e) => onNodeUp(e, cat)}
              style={{
                position: 'absolute',
                left: cat.x, top: cat.y,
                transform: 'translate(-50%, -50%)',
                cursor: 'grab', userSelect: 'none', touchAction: 'none',
                zIndex: activePopup === cat.id ? 20 : 10,
              }}
            >
              {/* Large image square sitting on top of the card */}
              {cat.image && (
                <img
                  src={cat.image}
                  alt=""
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    right: 0,
                    width: '100%',
                    height: 130,
                    objectFit: 'cover',
                    borderRadius: '10px 10px 0 0',
                    display: 'block',
                    pointerEvents: 'none',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.4)',
                    zIndex: 1,
                  }}
                />
              )}

              {/* Name label card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: cat.image ? '0 0 12px 12px' : '12px',
                padding: '13px 36px',
                minWidth: '200px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                fontWeight: 600, fontSize: '14px', color: '#111',
                textAlign: 'center', whiteSpace: 'nowrap',
                position: 'relative',
              }}>
                {cat.name}

                {/* Horizontal popup */}
                {activePopup === cat.id && (
                  <div
                    className="cat-popup"
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 12px)', left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#ffffff', borderRadius: '10px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center',
                      padding: '5px', gap: '1px',
                      zIndex: 30, userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    <DownArrow />

                    {/* Vertical Add sub-menu */}
                    {addMenuId === cat.id && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 10px)', left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#ffffff', borderRadius: '10px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                          display: 'flex', flexDirection: 'column',
                          padding: '5px', gap: '1px', zIndex: 40, minWidth: '160px',
                        }}
                      >
                        <DownArrow />
                        <VerticalBtn label="Parent"  testId="add-parent"  onClick={() => addRelation(cat.id, 'parent')} />
                        <VerticalBtn label="Mate"    testId="add-mate"    onClick={() => addRelation(cat.id, 'mate')} />
                        <VerticalBtn label="Ex-Mate" testId="add-ex-mate" onClick={() => addRelation(cat.id, 'ex-mate')} />
                        <VerticalBtn label="Kit"     testId="add-kit"     onClick={() => addRelation(cat.id, 'kit')} />
                      </div>
                    )}

                    <PopupBtn label="View" testId="popup-view" />
                    <PopupBtn
                      label="Edit"
                      testId="popup-edit"
                      onClick={() => { setEditCatId(cat.id); setActivePopup(null); setAddMenuId(null); }}
                    />
                    <PopupBtn
                      label="Add"
                      testId="popup-add"
                      active={addMenuId === cat.id}
                      onClick={() => setAddMenuId((prev) => prev === cat.id ? null : cat.id)}
                    />
                    <PopupBtn label="Delete" color="#c0392b" testId="popup-delete" onClick={() => deleteCat(cat.id)} />
                    <PopupBtn
                      label="Close"
                      testId="popup-close"
                      onClick={() => { setActivePopup(null); setAddMenuId(null); }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Snap grid toggle */}
        <SnapToggle snap={snapGrid} onChange={setSnapGrid} />

        {/* Add Cat button */}
        <button
          data-testid="button-add-cat"
          onClick={addCat}
          style={{
            position: 'fixed', bottom: '28px', right: '28px',
            backgroundColor: '#ffffff', color: '#111',
            fontWeight: 700, fontSize: '14px',
            borderRadius: '12px', padding: '13px 40px', minWidth: '160px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            border: 'none', cursor: 'pointer', zIndex: 1000,
          }}
        >
          Add Cat
        </button>
      </div>

      {/* Kit parent modal */}
      {kitModal && (
        <KitParentModal
          modal={kitModal}
          cats={cats}
          onLink={handleKitLink}
          onSkip={() => setKitModal(null)}
        />
      )}

      {/* Edit modal */}
      {editCatId && (
        <EditModal
          catId={editCatId}
          cats={cats}
          connections={connections}
          onSave={handleEditSave}
          onClose={() => setEditCatId(null)}
        />
      )}
    </>
  );
}
