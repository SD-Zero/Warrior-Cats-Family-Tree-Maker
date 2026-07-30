import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CatNode, Connection, RelationType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

export function getRelatedIds(catId: string, conns: Connection[], type: RelationType): string[] {
  const ids = new Set<string>();
  for (const cn of conns) {
    if (cn.type !== type) continue;
    if (type === 'mate' || type === 'ex-mate') {
      if (cn.fromId === catId) ids.add(cn.toId);
      if (cn.toId   === catId) ids.add(cn.fromId);
    } else if (type === 'parent') {
      if (cn.fromId === catId) ids.add(cn.toId);
    } else if (type === 'kit') {
      if (cn.fromId === catId) ids.add(cn.toId);
    }
  }
  if (type === 'parent') {
    for (const cn of conns) {
      if (cn.type === 'kit' && cn.toId === catId) ids.add(cn.fromId);
    }
  }
  if (type === 'kit') {
    for (const cn of conns) {
      if (cn.type === 'parent' && cn.toId === catId) ids.add(cn.fromId);
    }
  }
  return Array.from(ids);
}

// ─── Tag ─────────────────────────────────────────────────────────────────────

function Tag({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      backgroundColor: '#000', color: '#fff',
      borderRadius: '6px', padding: '4px 8px 4px 10px',
      fontSize: '13px', fontWeight: 500,
      border: '1px solid #222',
    }}>
      {name}
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', color: '#fff',
          cursor: 'pointer', padding: '0 2px', fontSize: '13px',
          lineHeight: 1, opacity: 0.7, display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
      >
        ✕
      </button>
    </span>
  );
}

// ─── Custom Dropdown ──────────────────────────────────────────────────────────

function RelationDropdown({
  label, selected, onAdd, onRemove, allCats, selfId,
}: {
  label: string;
  selected: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  allCats: CatNode[];
  selfId: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  const available = allCats.filter(
    (c) => c.id !== selfId && !selected.includes(c.id) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current  && !dropdownRef.current.contains(e.target as Node)
      ) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const openDropdown = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  }, []);

  const selectedTags = selected.map((id) => {
    const cat = allCats.find((c) => c.id === id);
    return cat ? <Tag key={id} name={cat.name} onRemove={() => onRemove(id)} /> : null;
  });

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
        {label}
      </div>
      <div
        ref={containerRef}
        onClick={openDropdown}
        style={{
          minHeight: '40px',
          backgroundColor: '#000',
          border: `1px solid ${open ? '#555' : '#2a2a2a'}`,
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          transition: 'border-color 0.12s',
        }}
      >
        {selectedTags}
        <span style={{ fontSize: '13px', color: '#636363', userSelect: 'none' }}>
          {selected.length === 0 ? `Add ${label}…` : `+ Add more…`}
        </span>
      </div>
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropPos.top, left: dropPos.left, width: dropPos.width,
            backgroundColor: '#000', border: '1px solid #2a2a2a',
            borderRadius: '8px', zIndex: 9999,
            maxHeight: '200px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.9)',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid #1a1a1a' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', boxSizing: 'border-box',
                backgroundColor: '#111', border: '1px solid #2a2a2a',
                borderRadius: '6px', padding: '6px 10px',
                color: '#e5e7eb', fontSize: '13px', outline: 'none',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '152px' }}>
            {available.length === 0 ? (
              <div style={{ padding: '12px', color: '#636363', fontSize: '13px', textAlign: 'center' }}>
                {allCats.filter(c => c.id !== selfId).length === selected.length ? 'All cats added' : 'No matches'}
              </div>
            ) : (
              available.map((cat) => (
                <div
                  key={cat.id}
                  onMouseDown={(e) => { e.preventDefault(); onAdd(cat.id); setSearch(''); setOpen(false); }}
                  style={{
                    padding: '10px 14px', fontSize: '13px', color: '#e5e7eb',
                    cursor: 'pointer', borderBottom: '1px solid #0d0d0d', transition: 'background 0.08s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                >
                  {cat.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 700, color: '#848484',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: '16px', paddingBottom: '8px',
      borderBottom: '1px solid #1f1f1f',
    }}>
      {children}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  const shared: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#000', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '10px 12px',
    color: '#e5e7eb', fontSize: '13px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.12s',
  };
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} rows={3}
          style={{ ...shared, resize: 'vertical' }}
          onFocus={(e) => ((e.target as HTMLElement).style.borderColor = '#444')}
          onBlur={(e)  => ((e.target as HTMLElement).style.borderColor = '#2a2a2a')}
        />
      ) : (
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} style={shared}
          onFocus={(e) => ((e.target as HTMLElement).style.borderColor = '#444')}
          onBlur={(e)  => ((e.target as HTMLElement).style.borderColor = '#2a2a2a')}
        />
      )}
    </div>
  );
}

// ─── Gender Selector ──────────────────────────────────────────────────────────

function GenderSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const preset = value === 'Tom' || value === 'She-Cat';
  const isCustom = value !== '' && !preset;
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customText, setCustomText] = useState(isCustom ? value : '');

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#000', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '10px 12px',
    color: '#e5e7eb', fontSize: '13px', outline: 'none',
    fontFamily: 'inherit', marginTop: '8px',
  };

  const select = (g: string) => {
    if (g === 'Custom') {
      setShowCustom(true);
      onChange(customText);
    } else {
      setShowCustom(false);
      onChange(g);
    }
  };

  const active = (g: string) => {
    if (g === 'Custom') return showCustom;
    return value === g && !showCustom;
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
        Gender
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['Tom', 'She-Cat', 'Custom'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => select(g)}
            style={{
              flex: 1, padding: '9px 0',
              borderRadius: '8px',
              border: active(g) ? '1px solid #555' : '1px solid #2a2a2a',
              backgroundColor: active(g) ? '#1e1e1e' : '#000',
              color: active(g) ? '#e5e7eb' : '#848484',
              fontSize: '13px', cursor: 'pointer', fontWeight: 600,
              transition: 'all 0.12s', fontFamily: 'inherit',
            }}
          >
            {g}
          </button>
        ))}
      </div>
      {showCustom && (
        <input
          type="text"
          value={customText}
          placeholder="Enter gender…"
          onChange={(e) => { setCustomText(e.target.value); onChange(e.target.value); }}
          style={inputStyle}
          onFocus={(e) => ((e.target as HTMLElement).style.borderColor = '#444')}
          onBlur={(e)  => ((e.target as HTMLElement).style.borderColor = '#2a2a2a')}
        />
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  catId: string;
  cats: CatNode[];
  connections: Connection[];
  onSave: (updatedCat: CatNode, newConns: Connection[]) => void;
  onClose: () => void;
}

export default function EditModal({ catId, cats, connections, onSave, onClose }: Props) {
  const cat = cats.find((c) => c.id === catId);

  const [name,              setName]              = useState(cat?.name              ?? 'New Cat');
  const [image,             setImage]             = useState(cat?.image             ?? '');
  const [gender,            setGender]            = useState(cat?.gender            ?? '');
  const [allegiance,        setAllegiance]        = useState(cat?.allegiance        ?? '');
  const [rank,              setRank]              = useState(cat?.rank              ?? '');
  const [birthSeason,       setBirthSeason]       = useState(cat?.birthSeason       ?? '');
  const [deathSeason,       setDeathSeason]       = useState(cat?.deathSeason       ?? '');
  const [description,       setDescription]       = useState(cat?.description       ?? '');
  const [relationshipNotes, setRelationshipNotes] = useState(cat?.relationshipNotes ?? '');

  const [mates,       setMates]       = useState<string[]>([]);
  const [exMates,     setExMates]     = useState<string[]>([]);
  const [parents,     setParents]     = useState<string[]>([]);
  const [kits,        setKits]        = useState<string[]>([]);
  const [apprentices, setApprentices] = useState<string[]>(cat?.apprentices ?? []);
  const [mentors,     setMentors]     = useState<string[]>(cat?.mentors     ?? []);
  const [successors,  setSuccessors]  = useState<string[]>(cat?.successors  ?? []);

  useEffect(() => {
    setMates  (getRelatedIds(catId, connections, 'mate'));
    setExMates(getRelatedIds(catId, connections, 'ex-mate'));
    setParents(getRelatedIds(catId, connections, 'parent'));
    setKits   (getRelatedIds(catId, connections, 'kit'));
  }, [catId, connections]);

  const fileRef = useRef<HTMLInputElement>(null);
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const handleSave = () => {
    const updatedCat: CatNode = {
      ...(cat ?? { id: catId, x: 0, y: 0 }),
      name, image, gender, allegiance, rank,
      birthSeason, deathSeason, description, relationshipNotes,
      apprentices, mentors, successors,
    };

    const untouched = connections.filter((cn) => {
      const involves = cn.fromId === catId || cn.toId === catId;
      return !involves;
    });

    const fresh: Connection[] = [
      ...mates.map((id)   => ({ id: uid(), fromId: catId, toId: id, type: 'mate'     as RelationType })),
      ...exMates.map((id) => ({ id: uid(), fromId: catId, toId: id, type: 'ex-mate'  as RelationType })),
      ...parents.map((id) => ({ id: uid(), fromId: catId, toId: id, type: 'parent'   as RelationType })),
      ...kits.map((id)    => ({ id: uid(), fromId: catId, toId: id, type: 'kit'      as RelationType })),
    ];

    onSave(updatedCat, [...untouched, ...fresh]);
  };

  const BG = '#111111';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: BG, border: '1px solid #222', borderRadius: '12px',
        width: '90%', maxWidth: '640px', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 64px rgba(0,0,0,0.95)',
        color: '#e5e7eb', fontFamily: 'inherit', position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px 24px', borderBottom: '1px solid #1f1f1f', flexShrink: 0,
        }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6' }}>Edit Character</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#848484',
              fontSize: '18px', cursor: 'pointer', padding: '4px 8px',
              borderRadius: '6px', lineHeight: 1,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#848484')}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '24px 24px 0 24px', flex: 1 }}>

          {/* Image upload */}
          <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: '120px', height: '120px', borderRadius: '10px',
                border: `2px dashed ${image ? 'transparent' : '#333'}`,
                backgroundColor: '#000', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative', transition: 'border-color 0.12s',
              }}
              onMouseEnter={(e) => { if (!image) (e.currentTarget as HTMLElement).style.borderColor = '#555'; }}
              onMouseLeave={(e) => { if (!image) (e.currentTarget as HTMLElement).style.borderColor = '#333'; }}
            >
              {image ? (
                <>
                  <img src={image} alt="Character" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0')}
                  >
                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>Change</span>
                  </div>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#636363" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span style={{ fontSize: '11px', color: '#636363', marginTop: '6px', fontWeight: 500 }}>Add Image</span>
                </>
              )}
            </div>
            {image && (
              <button
                type="button"
                onClick={() => setImage('')}
                style={{
                  background: 'none', border: 'none', color: '#848484',
                  fontSize: '12px', cursor: 'pointer', padding: '4px 8px',
                  fontFamily: 'inherit', textDecoration: 'underline',
                  transition: 'color 0.1s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#848484')}
              >
                Remove photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
          </div>

          {/* Basic Information */}
          <SectionHeading>Basic Information</SectionHeading>
          <Field label="Name"        value={name}       onChange={setName}       placeholder="Character name" />
          <GenderSelector value={gender} onChange={setGender} />
          <Field label="Allegiance"  value={allegiance} onChange={setAllegiance} placeholder="e.g. ThunderClan" />
          <Field label="Rank"        value={rank}       onChange={setRank}       placeholder="e.g. Warrior, Medicine Cat…" />
          <Field label="Birth Season" value={birthSeason} onChange={setBirthSeason} placeholder="e.g. Greenleaf, Newleaf…" />
          <Field label="Death Season" value={deathSeason} onChange={setDeathSeason} placeholder="e.g. Leaf-bare (leave blank if alive)" />
          <Field label="Description" value={description} onChange={setDescription} placeholder="Appearance, personality…" multiline />

          {/* Tree Relationships */}
          <div style={{ marginTop: '28px', marginBottom: '4px' }}>
            <SectionHeading>Tree Relationships</SectionHeading>
          </div>
          <RelationDropdown label="Mate(s)"    selected={mates}   onAdd={(id) => setMates((p) => [...p, id])}   onRemove={(id) => setMates((p) => p.filter((x) => x !== id))}   allCats={cats} selfId={catId} />
          <RelationDropdown label="Ex-Mate(s)" selected={exMates} onAdd={(id) => setExMates((p) => [...p, id])} onRemove={(id) => setExMates((p) => p.filter((x) => x !== id))} allCats={cats} selfId={catId} />
          <RelationDropdown label="Parent(s)"  selected={parents} onAdd={(id) => setParents((p) => [...p, id])} onRemove={(id) => setParents((p) => p.filter((x) => x !== id))} allCats={cats} selfId={catId} />
          <RelationDropdown label="Kit(s)"     selected={kits}    onAdd={(id) => setKits((p) => [...p, id])}    onRemove={(id) => setKits((p) => p.filter((x) => x !== id))}    allCats={cats} selfId={catId} />

          {/* Other Relationships (not drawn on tree) */}
          <div style={{ marginTop: '28px', marginBottom: '4px' }}>
            <SectionHeading>Other Relationships</SectionHeading>
          </div>
          <RelationDropdown label="Mentor(s)"     selected={mentors}     onAdd={(id) => setMentors((p) => [...p, id])}     onRemove={(id) => setMentors((p) => p.filter((x) => x !== id))}     allCats={cats} selfId={catId} />
          <RelationDropdown label="Apprentice(s)" selected={apprentices} onAdd={(id) => setApprentices((p) => [...p, id])} onRemove={(id) => setApprentices((p) => p.filter((x) => x !== id))} allCats={cats} selfId={catId} />
          <RelationDropdown label="Successor(s)"  selected={successors}  onAdd={(id) => setSuccessors((p) => [...p, id])}  onRemove={(id) => setSuccessors((p) => p.filter((x) => x !== id))}  allCats={cats} selfId={catId} />

          <div style={{ marginTop: '28px', marginBottom: '4px' }}>
            <SectionHeading>Notes</SectionHeading>
          </div>
          <Field label="Relationship Notes" value={relationshipNotes} onChange={setRelationshipNotes} placeholder="Any notes about relationships…" multiline />

          <div style={{ height: '24px' }} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #1f1f1f',
          display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: BG, color: '#ababab', border: '1px solid #333',
              borderRadius: '8px', padding: '10px 22px', fontWeight: 600,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#555')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#333')}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              backgroundColor: '#ffffff', color: '#111', border: 'none',
              borderRadius: '8px', padding: '10px 28px', fontWeight: 700,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.1s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
