import React from 'react';
import { CatNode, KitModal } from '../types';

interface Props {
  modal: KitModal;
  cats: CatNode[];
  onLink: (partnerId: string) => void;
  onSkip: () => void;
}

export default function KitParentModal({ modal, cats, onLink, onSkip }: Props) {
  const self   = cats.find((c) => c.id === modal.forCatId);
  const newKit = cats.find((c) => c.id === modal.newKitId);
  const hasMate   = modal.mates.length > 0;
  const hasExMate = modal.exMates.length > 0;

  const selfName = self?.name   ?? 'Unknown';
  const kitName  = newKit?.name ?? 'Unknown';

  let title = '';
  if (hasMate && hasExMate) title = 'Add kit to mate or ex-mate?';
  else if (hasMate)         title = 'Add kit to mate?';
  else                      title = 'Add kit to ex-mate?';

  const partnerNames = [
    ...modal.mates.map((m) => m.name),
    ...modal.exMates.map((m) => m.name),
  ];
  const partnerDisplay =
    partnerNames.length === 2
      ? `${partnerNames[0]} or ${partnerNames[1]}`
      : partnerNames[0] ?? '';

  const BG = '#111111';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{
        backgroundColor: BG,
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        padding: '36px 44px 40px 44px',
        maxWidth: '560px', width: '90%',
        boxShadow: '0 12px 60px rgba(0,0,0,0.9)',
        color: '#e5e7eb', fontFamily: 'inherit',
        position: 'relative',
      }}>
        {/* X close */}
        <button
          onClick={onSkip}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none',
            color: '#6b7280', fontSize: '20px', lineHeight: 1,
            cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
            transition: 'color 0.1s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#e5e7eb')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#6b7280')}
        >
          ✕
        </button>

        <p style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 700, color: '#f3f4f6', paddingRight: '32px' }}>
          {title}
        </p>

        <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: 1.7, color: '#9ca3af' }}>
          <b style={{ color: '#f9fafb' }}>{kitName}</b>
          {' was added as a child to '}
          <b style={{ color: '#f9fafb' }}>{selfName}</b>.
        </p>

        <p style={{ margin: '0 0 28px 0', fontSize: '14px', lineHeight: 1.7, color: '#9ca3af' }}>
          {'Should '}
          <b style={{ color: '#f9fafb' }}>{kitName}</b>
          {' also be linked to '}
          <b style={{ color: '#f9fafb' }}>{partnerDisplay}</b>?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {modal.mates.map((m) => (
            <button key={m.id} onClick={() => onLink(m.id)}
              style={{ backgroundColor: '#fff', color: '#111', fontWeight: 600, fontSize: '14px', border: 'none', borderRadius: '8px', padding: '13px 20px', cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              Yes, link to <b>{m.name}</b>
            </button>
          ))}
          {modal.exMates.map((m) => (
            <button key={m.id} onClick={() => onLink(m.id)}
              style={{ backgroundColor: '#fff', color: '#111', fontWeight: 600, fontSize: '14px', border: 'none', borderRadius: '8px', padding: '13px 20px', cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              Yes, link to <b>{m.name}</b>
            </button>
          ))}
          <button onClick={onSkip}
            style={{ backgroundColor: BG, color: '#e5e7eb', fontWeight: 600, fontSize: '14px', border: '1px solid #333', borderRadius: '8px', padding: '13px 20px', cursor: 'pointer', textAlign: 'center', marginTop: '6px' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#555')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#333')}
          >
            No, keep only one parent
          </button>
        </div>
      </div>
    </div>
  );
}
