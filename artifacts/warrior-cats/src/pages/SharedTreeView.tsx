import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { CatNode, Connection, Transform } from '../types';
import { loadTree, hashCode, SharedTree } from '../lib/shareTree';
import ViewPanel from '../components/ViewPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

const HEART_PATH =
  'M 0,-4 C 0,-4 -1.3,-7 -4.5,-7 C -7,-7 -7,-4 -7,-4 C -7,-1.5 -4,2 0,6 C 4,2 7,-1.5 7,-4 C 7,-4 7,-7 4.5,-7 C 1.3,-7 0,-4 0,-4 Z';
const BROKEN_LEFT  = 'M 0,-4 C -1.3,-7 -4.5,-7 -4.5,-7 C -7,-7 -7,-4 -7,-4 C -7,-1.5 -4,2 0,6 L -2,2 L 2,0 Z';
const BROKEN_RIGHT = 'M 0,-4 L 2,0 L -2,2 L 0,6 C 4,2 7,-1.5 7,-4 C 7,-4 7,-7 4.5,-7 C 4.5,-7 1.3,-7 0,-4 Z';

function ConnectionLine({ conn, cats }: { conn: Connection; cats: CatNode[] }) {
  const from = cats.find(c => c.id === conn.fromId);
  const to   = cats.find(c => c.id === conn.toId);
  if (!from || !to) return null;
  const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y;

  if (conn.type === 'parent' || conn.type === 'kit') {
    const my = (y1 + y2) / 2;
    return <path d={`M ${x1},${y1} L ${x1},${my} L ${x2},${my} L ${x2},${y2}`} stroke="#848484" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }

  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 2) return null;
  const ux = (x2 - x1) / dist, uy = (y2 - y1) / dist;
  const GAP = 10, BGAP = 13;

  if (conn.type === 'mate') {
    return (
      <g>
        <line x1={x1} y1={y1} x2={mx - ux * GAP} y2={my - uy * GAP} stroke="#f9a8d4" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={mx + ux * GAP} y1={my + uy * GAP} x2={x2} y2={y2} stroke="#f9a8d4" strokeWidth={2.5} strokeLinecap="round" />
        <g transform={`translate(${mx},${my})`}><path d={HEART_PATH} fill="#f472b6" stroke="#ec4899" strokeWidth={0.5} /></g>
      </g>
    );
  }
  return (
    <g>
      <line x1={x1} y1={y1} x2={mx - ux * BGAP} y2={my - uy * BGAP} stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={mx + ux * BGAP} y1={my + uy * BGAP} x2={x2} y2={y2} stroke="#b91c1c" strokeWidth={2.5} strokeLinecap="round" />
      <g transform={`translate(${mx},${my})`}>
        <g transform="translate(-2,0)"><path d={BROKEN_LEFT} fill="#991b1b" stroke="#7f1d1d" strokeWidth={0.5} /></g>
        <g transform="translate(2,0)"><path d={BROKEN_RIGHT} fill="#991b1b" stroke="#7f1d1d" strokeWidth={0.5} /></g>
      </g>
    </g>
  );
}

// ─── Unlock Modal ─────────────────────────────────────────────────────────────

function UnlockModal({
  hasCode, onUnlock, onClose,
}: { hasCode: boolean; onUnlock: (code: string) => Promise<boolean>; onClose: () => void }) {
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    const ok = await onUnlock(code);
    if (!ok) { setError('Incorrect code.'); setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor: '#111111', border: '1px solid #222', borderRadius: '12px', width: '90%', maxWidth: '380px', padding: '28px', color: '#e5e7eb', fontFamily: 'inherit', boxShadow: '0 16px 64px rgba(0,0,0,0.95)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6', marginBottom: '8px', marginTop: 0 }}>Unlock Editing</h2>
        {hasCode ? (
          <>
            <p style={{ fontSize: '13px', color: '#848484', lineHeight: 1.6, marginBottom: '18px', marginTop: 0 }}>
              This tree is protected. Enter the edit code to unlock editing.
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>Edit Code</label>
              <input
                type="password" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="Enter edit code…"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#000', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 12px', color: '#e5e7eb', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = '#444')}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = '#2a2a2a')}
                autoFocus
              />
            </div>
            {error && <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px', marginTop: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, backgroundColor: 'transparent', color: '#ababab', border: '1px solid #333', borderRadius: '8px', padding: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading || !code}
                style={{ flex: 2, backgroundColor: '#ffffff', color: '#111', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: loading || !code ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading || !code ? 0.6 : 1 }}>
                {loading ? 'Checking…' : 'Unlock'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: '#848484', lineHeight: 1.6, marginBottom: '20px', marginTop: 0 }}>
              This tree has no edit code. You can load it into your editor to make changes.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, backgroundColor: 'transparent', color: '#ababab', border: '1px solid #333', borderRadius: '8px', padding: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => onUnlock('')}
                style={{ flex: 2, backgroundColor: '#ffffff', color: '#111', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Load for Editing
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Read-only canvas ─────────────────────────────────────────────────────────

function ReadOnlyCanvas({ cats, connections }: { cats: CatNode[]; connections: Connection[] }) {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [viewCatId, setViewCatId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const panState   = useRef({ active: false, startClientX: 0, startClientY: 0, startTX: 0, startTY: 0 });
  const pinchState = useRef({ active: false, startDist: 0, startScale: 1, midX: 0, midY: 0, startTX: 0, startTY: 0 });
  const clickRef   = useRef({ startX: 0, startY: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform(prev => {
      const ns = clamp(prev.scale * factor), rf = ns / prev.scale;
      return { scale: ns, x: cx - (cx - prev.x) * rf, y: cy - (cy - prev.y) * rf };
    });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onCanvasDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.ro-cat-node')) return;
    panState.current = { active: true, startClientX: e.clientX, startClientY: e.clientY, startTX: transformRef.current.x, startTY: transformRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onCanvasMove = useCallback((e: React.PointerEvent) => {
    if (!panState.current.active) return;
    setTransform(prev => ({ ...prev, x: panState.current.startTX + (e.clientX - panState.current.startClientX), y: panState.current.startTY + (e.clientY - panState.current.startClientY) }));
  }, []);

  const onCanvasUp = useCallback(() => { panState.current.active = false; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0], t2 = e.touches[1];
    const rect = viewportRef.current?.getBoundingClientRect();
    pinchState.current = { active: true, startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY), startScale: transformRef.current.scale, midX: (t1.clientX + t2.clientX) / 2 - (rect?.left ?? 0), midY: (t1.clientY + t2.clientY) / 2 - (rect?.top ?? 0), startTX: transformRef.current.x, startTY: transformRef.current.y };
    panState.current.active = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchState.current.active) return;
    e.preventDefault();
    const t1 = e.touches[0], t2 = e.touches[1];
    const factor = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) / pinchState.current.startDist;
    const ns = clamp(pinchState.current.startScale * factor), rf = ns / pinchState.current.startScale;
    const { midX, midY, startTX, startTY } = pinchState.current;
    setTransform({ scale: ns, x: midX - (midX - startTX) * rf, y: midY - (midY - startTY) * rf });
  }, []);

  const DOT_SPACING = 24;
  const viewCat = viewCatId ? cats.find(c => c.id === viewCatId) : null;

  return (
    <>
      <div
        ref={viewportRef}
        onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { pinchState.current.active = false; }}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#111111', touchAction: 'none' }}
      >
        {/* Dot grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          <defs>
            <pattern id="ro-dots" x={transform.x % (DOT_SPACING * transform.scale)} y={transform.y % (DOT_SPACING * transform.scale)} width={DOT_SPACING * transform.scale} height={DOT_SPACING * transform.scale} patternUnits="userSpaceOnUse">
              <circle cx={DOT_SPACING * transform.scale * 0.5} cy={DOT_SPACING * transform.scale * 0.5} r={Math.max(0.5, transform.scale)} fill="#252525" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ro-dots)" />
        </svg>

        {/* World */}
        <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`, willChange: 'transform' }}>
          <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
            {connections.map(conn => <ConnectionLine key={conn.id} conn={conn} cats={cats} />)}
          </svg>

          {cats.map(cat => (
            <div
              key={cat.id}
              className="ro-cat-node"
              onPointerDown={(e) => { clickRef.current = { startX: e.clientX, startY: e.clientY }; }}
              onPointerUp={(e) => {
                const dx = Math.abs(e.clientX - clickRef.current.startX);
                const dy = Math.abs(e.clientY - clickRef.current.startY);
                if (dx < 4 && dy < 4) setViewCatId(id => id === cat.id ? null : cat.id);
              }}
              style={{ position: 'absolute', left: cat.x, top: cat.y, transform: 'translate(-50%,-50%)', cursor: 'pointer', userSelect: 'none', touchAction: 'none', zIndex: 10 }}
            >
              {cat.image && (
                <img src={cat.image} alt="" style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, width: '100%', height: 130, objectFit: 'cover', borderRadius: '10px 10px 0 0', display: 'block', pointerEvents: 'none', boxShadow: '0 -2px 10px rgba(0,0,0,0.4)', zIndex: 1 }} />
              )}
              <div style={{ backgroundColor: '#ffffff', borderRadius: cat.image ? '0 0 12px 12px' : '12px', padding: '13px 36px', minWidth: '200px', boxShadow: '0 2px 12px rgba(0,0,0,0.5)', fontWeight: 600, fontSize: '14px', color: '#111', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {cat.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {viewCat && (
        <ViewPanel
          cat={viewCat}
          cats={cats}
          connections={connections}
          onClose={() => setViewCatId(null)}
          onEdit={() => {}}
          onImageChange={() => {}}
          readOnly
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SharedTreeView() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [tree,          setTree]          = useState<SharedTree | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [unlockOpen,    setUnlockOpen]    = useState(false);

  useEffect(() => {
    if (!id) { setError('No tree ID provided.'); setLoading(false); return; }
    loadTree(id)
      .then(t => { setTree(t); setLoading(false); })
      .catch(e => { setError(e instanceof Error ? e.message : 'Tree not found.'); setLoading(false); });
  }, [id]);

  const handleUnlock = async (code: string): Promise<boolean> => {
    if (!tree) return false;
    if (tree.edit_code_hash) {
      const hash = await hashCode(code);
      if (hash !== tree.edit_code_hash) return false;
    }
    localStorage.setItem('warrior-cats-import', JSON.stringify(tree.data));
    navigate('/');
    return true;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#636363', fontFamily: 'sans-serif' }}>Loading tree…</div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !tree) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#111111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ fontSize: '14px', color: '#ef4444', fontFamily: 'sans-serif' }}>{error ?? 'Tree not found.'}</div>
        <button onClick={() => navigate('/')} style={{ backgroundColor: '#fff', color: '#111', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
          Go Home
        </button>
      </div>
    );
  }

  const { cats, connections } = tree.data;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Header bar */}
      <div style={{ flexShrink: 0, height: '44px', backgroundColor: '#000000', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#636363', textTransform: 'uppercase', letterSpacing: '0.12em' }}>View only</span>
          {tree.title && (
            <>
              <span style={{ color: '#2a2a2a', fontSize: '14px' }}>·</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ababab' }}>{tree.title}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: '#636363' }}>{cats.length} cat{cats.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setUnlockOpen(true)}
            style={{ backgroundColor: '#1f1f1f', color: '#e5e7eb', border: '1px solid #333', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'border-color 0.1s' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#555')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#333')}
          >
            Unlock Editing
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReadOnlyCanvas cats={cats} connections={connections} />
      </div>

      {unlockOpen && (
        <UnlockModal
          hasCode={Boolean(tree.edit_code_hash)}
          onUnlock={handleUnlock}
          onClose={() => setUnlockOpen(false)}
        />
      )}
    </div>
  );
}
