import React, { useState, useRef } from 'react';
import { CatNode, Connection, RelationType } from '../types';
import { getRelatedIds } from './EditModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
}

function resolveNames(ids: string[], cats: CatNode[]): string[] {
  return ids.map((id) => cats.find((c) => c.id === id)?.name ?? 'Unknown');
}

function generateSummary(cat: CatNode, cats: CatNode[], connections: Connection[]): string[] {
  const name = cat.name;
  const lines: string[] = [];

  const mateIds   = getRelatedIds(cat.id, connections, 'mate');
  const exMateIds = getRelatedIds(cat.id, connections, 'ex-mate');
  const parentIds = getRelatedIds(cat.id, connections, 'parent');
  const kitIds    = getRelatedIds(cat.id, connections, 'kit');
  const mentorIds = cat.mentors     ?? [];
  const appIds    = cat.apprentices ?? [];
  const succIds   = cat.successors  ?? [];

  if (mateIds.length)   lines.push(`${name} is mate of ${joinNames(resolveNames(mateIds, cats))}.`);
  if (exMateIds.length) lines.push(`${name} is ex-mate of ${joinNames(resolveNames(exMateIds, cats))}.`);
  if (parentIds.length) lines.push(`${name} is kit of ${joinNames(resolveNames(parentIds, cats))}.`);
  if (kitIds.length)    lines.push(`${name} is parent of ${joinNames(resolveNames(kitIds, cats))}.`);
  if (mentorIds.length) lines.push(`${name} trained under ${joinNames(resolveNames(mentorIds, cats))}.`);
  if (appIds.length)    lines.push(`${name} is mentor of ${joinNames(resolveNames(appIds, cats))}.`);
  if (succIds.length)   lines.push(`${name} is succeeded by ${joinNames(resolveNames(succIds, cats))}.`);

  if (lines.length === 0) lines.push(`${name} has no recorded relationships.`);
  return lines;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: '1px', backgroundColor: '#1f1f1f', flexShrink: 0 }} />;
}

const LABEL: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: '#848484',
  textTransform: 'uppercase', letterSpacing: '0.12em',
  marginBottom: '8px',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={LABEL}>{children}</div>;
}

function RelationGroup({ label, ids, cats }: { label: string; ids: string[]; cats: CatNode[] }) {
  if (ids.length === 0) return null;
  const names = resolveNames(ids, cats);
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {names.map((name, i) => (
          <span key={i} style={{
            backgroundColor: '#1a1a1a', color: '#e8e8e8',
            borderRadius: '6px', padding: '4px 10px',
            fontSize: '13px', fontWeight: 500,
            border: '1px solid #2a2a2a',
          }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%', background: 'none', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0', cursor: 'pointer', marginBottom: open ? '10px' : '0',
        }}
      >
        <div style={{ ...LABEL, marginBottom: 0 }}>{title}</div>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M2 4.5L7 9.5L12 4.5" stroke="#848484" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ fontSize: '13px', color: '#ababab', lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Cat placeholder icon ─────────────────────────────────────────────────────

function CatPlaceholderIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="50" r="26" stroke="#333" strokeWidth="2" />
      <polygon points="22,29 15,13 31,27" fill="none" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
      <polygon points="58,29 65,13 49,27" fill="none" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="31" cy="48" r="3.5" fill="#333"/>
      <circle cx="49" cy="48" r="3.5" fill="#333"/>
      <path d="M40 55 L36 60 L40 58.5 L44 60 Z" fill="#333"/>
    </svg>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  cat: CatNode;
  cats: CatNode[];
  connections: Connection[];
  onClose: () => void;
  onEdit: () => void;
  onImageChange: (dataUrl: string) => void;
}

export default function ViewPanel({ cat, cats, connections, onClose, onEdit, onImageChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const mateIds   = getRelatedIds(cat.id, connections, 'mate');
  const exMateIds = getRelatedIds(cat.id, connections, 'ex-mate');
  const parentIds = getRelatedIds(cat.id, connections, 'parent');
  const kitIds    = getRelatedIds(cat.id, connections, 'kit');

  const hasTreeRels = mateIds.length > 0 || exMateIds.length > 0 || parentIds.length > 0 || kitIds.length > 0;
  const hasOtherRels =
    (cat.mentors?.length ?? 0) > 0 || (cat.apprentices?.length ?? 0) > 0 || (cat.successors?.length ?? 0) > 0;

  const summaryLines = generateSummary(cat, cats, connections);

  // Role line: rank only (gender + allegiance shown as separate pills)
  const roleLabel = cat.rank ?? '';

  return (
    <div
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px',
        backgroundColor: '#111111',
        borderLeft: '1px solid #1f1f1f',
        display: 'flex', flexDirection: 'column',
        zIndex: 2500,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
        fontFamily: 'inherit',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: '44px',
        backgroundColor: '#000',
        borderBottom: '1px solid #1f1f1f', flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Character
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onEdit}
            style={{
              background: 'none', border: '1px solid #2a2a2a', color: '#ababab',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              padding: '5px 12px', borderRadius: '6px', fontFamily: 'inherit',
              transition: 'border-color 0.1s, color 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#555'; (e.currentTarget as HTMLElement).style.color = '#e8e8e8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLElement).style.color = '#ababab'; }}
          >
            Edit
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#848484',
              fontSize: '18px', cursor: 'pointer', padding: '4px 6px',
              borderRadius: '6px', lineHeight: 1,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#e8e8e8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#848484')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', flex: 1 }}>

        {/* Photo area */}
        <div style={{ position: 'relative', height: '240px', backgroundColor: '#1c1c1c', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cat.image ? (
            <div style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <img
                src={cat.image}
                alt={cat.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : (
            /* Big centered placeholder circle */
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '160px', height: '160px', borderRadius: '50%',
                border: '2px solid #282828',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#111',
              }}>
                <CatPlaceholderIcon />
              </div>
            </div>
          )}

          {/* Add / Change photo button — bottom right */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: '12px', right: '12px',
              backgroundColor: '#000', color: '#ffffff',
              border: '1px solid #383838', borderRadius: '8px',
              padding: '8px 16px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color 0.1s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#666')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#383838')}
          >
            {cat.image ? 'Change photo' : 'Add photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
        </div>

        <Divider />

        {/* Name + gender + role */}
        <div style={{ padding: '20px', backgroundColor: '#000' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f5f5f5', margin: 0, lineHeight: 1.2 }}>
            {cat.name}
          </h1>
          {(cat.gender || cat.allegiance) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {cat.gender && (
                <span style={{
                  backgroundColor: '#1a1a1a', color: '#ababab',
                  border: '1px solid #2a2a2a', borderRadius: '6px',
                  padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                }}>
                  {cat.gender}
                </span>
              )}
              {cat.allegiance && (
                <span style={{
                  backgroundColor: '#1a1a1a', color: '#ababab',
                  border: '1px solid #2a2a2a', borderRadius: '6px',
                  padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                }}>
                  {cat.allegiance}
                </span>
              )}
            </div>
          )}
          {roleLabel && (
            <p style={{ fontSize: '13px', color: '#ababab', marginTop: '6px', marginBottom: 0 }}>
              {roleLabel}
            </p>
          )}
        </div>

        <Divider />

        {/* Birth & Death Season */}
        <div style={{ padding: '20px', backgroundColor: '#000', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ ...LABEL }}>Birth Season</div>
            <div style={{ fontSize: '14px', color: cat.birthSeason ? '#e8e8e8' : '#3a3a3a', fontWeight: 500 }}>
              {cat.birthSeason || '—'}
            </div>
          </div>
          <div>
            <div style={{ ...LABEL }}>Death Season</div>
            <div style={{ fontSize: '14px', color: cat.deathSeason ? '#e8e8e8' : '#3a3a3a', fontWeight: 500 }}>
              {cat.deathSeason || '—'}
            </div>
          </div>
        </div>

        <Divider />

        {/* Biography */}
        <div style={{ padding: '20px', backgroundColor: '#000' }}>
          <Accordion title="Biography">
            {cat.description
              ? <p style={{ margin: 0 }}>{cat.description}</p>
              : <p style={{ margin: 0, color: '#636363', fontStyle: 'italic' }}>No biography recorded.</p>
            }
          </Accordion>
        </div>

        <Divider />

        {/* Relationships (tree) */}
        <div style={{ padding: '20px', backgroundColor: '#000' }}>
          <SectionLabel>Relationships</SectionLabel>
          {hasTreeRels ? (
            <>
              <RelationGroup label="Mate(s)"    ids={mateIds}   cats={cats} />
              <RelationGroup label="Ex-Mate(s)" ids={exMateIds} cats={cats} />
              <RelationGroup label="Parent(s)"  ids={parentIds} cats={cats} />
              <RelationGroup label="Kit(s)"     ids={kitIds}    cats={cats} />
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#636363', fontStyle: 'italic', margin: 0 }}>
              No tree relationships recorded.
            </p>
          )}
        </div>

        <Divider />

        {/* Other Relationships (mentor / apprentice / successor) */}
        <div style={{ padding: '20px', backgroundColor: '#000' }}>
          <SectionLabel>Other Relationships</SectionLabel>
          {hasOtherRels ? (
            <>
              <RelationGroup label="Mentor(s)"     ids={cat.mentors     ?? []} cats={cats} />
              <RelationGroup label="Apprentice(s)" ids={cat.apprentices ?? []} cats={cats} />
              <RelationGroup label="Successor(s)"  ids={cat.successors  ?? []} cats={cats} />
            </>
          ) : (
            <p style={{ fontSize: '13px', color: '#636363', fontStyle: 'italic', margin: 0 }}>
              No other relationships recorded.
            </p>
          )}
        </div>

        <Divider />

        {/* Relationship Notes */}
        <div style={{ padding: '20px', backgroundColor: '#000' }}>
          <Accordion title="Relationship Notes">
            {cat.relationshipNotes
              ? <p style={{ margin: 0 }}>{cat.relationshipNotes}</p>
              : <p style={{ margin: 0, color: '#636363', fontStyle: 'italic' }}>No notes recorded.</p>
            }
          </Accordion>
        </div>

        <Divider />

        {/* Summary */}
        <div style={{ padding: '20px', backgroundColor: '#000' }}>
          <SectionLabel>Summary</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {summaryLines.map((line, i) => (
              <p key={i} style={{ fontSize: '13px', color: '#ababab', margin: 0, lineHeight: 1.65 }}>
                {line}
              </p>
            ))}
          </div>
        </div>

        <div style={{ height: '32px', backgroundColor: '#000' }} />
      </div>
    </div>
  );
}
