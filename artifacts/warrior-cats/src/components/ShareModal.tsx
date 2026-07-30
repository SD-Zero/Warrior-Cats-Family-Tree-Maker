import React, { useState } from 'react';
import { CatNode, Connection } from '../types';
import { saveTree } from '../lib/shareTree';
import { supabaseEnabled } from '../lib/supabase';

interface Props {
  cats: CatNode[];
  connections: Connection[];
  onClose: () => void;
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  const style: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#000', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '10px 12px',
    color: '#e5e7eb', fontSize: '13px', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.12s',
  };
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#848484', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>
        {label}
      </label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={style}
        onFocus={(e) => ((e.target as HTMLElement).style.borderColor = '#444')}
        onBlur={(e) => ((e.target as HTMLElement).style.borderColor = '#2a2a2a')}
      />
    </div>
  );
}

export default function ShareModal({ cats, connections, onClose }: Props) {
  const [title,    setTitle]    = useState('');
  const [editCode, setEditCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleGenerate = async () => {
    if (cats.length === 0) { setError('Add at least one cat before sharing.'); return; }
    setLoading(true); setError(null);
    try {
      const id  = await saveTree(cats, connections, title, editCode);
      const url = window.location.origin + window.location.pathname + '#/tree/' + id;
      setShareUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tree. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const BG = '#111111';

  if (!supabaseEnabled) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{ backgroundColor: BG, border: '1px solid #222', borderRadius: '12px', width: '90%', maxWidth: '480px', padding: '32px', color: '#e5e7eb', fontFamily: 'inherit', boxShadow: '0 16px 64px rgba(0,0,0,0.95)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#f3f4f6' }}>Sharing not configured</h2>
          <p style={{ fontSize: '13px', color: '#848484', lineHeight: 1.6, margin: 0 }}>
            Supabase credentials are missing. Set <code style={{ color: '#ababab' }}>VITE_SUPABASE_URL</code> and <code style={{ color: '#ababab' }}>VITE_SUPABASE_ANON_KEY</code> in your environment to enable sharing.
          </p>
          <button onClick={onClose} style={{ marginTop: '24px', backgroundColor: '#fff', color: '#111', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor: BG, border: '1px solid #222', borderRadius: '12px', width: '90%', maxWidth: '480px', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 64px rgba(0,0,0,0.95)', color: '#e5e7eb', fontFamily: 'inherit' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6' }}>Share Tree</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#848484', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', lineHeight: 1 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#848484')}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {!shareUrl ? (
            <>
              <p style={{ fontSize: '13px', color: '#848484', lineHeight: 1.6, marginBottom: '20px', marginTop: 0 }}>
                Generate a view-only link to share your tree. Anyone with the link can browse it but not edit it — unless they have the edit code.
              </p>

              <Field label="Title (optional)" value={title} onChange={setTitle} placeholder="" />
              <Field label="Edit code (optional)" value={editCode} onChange={setEditCode} placeholder="Set a password to allow editing" type="password" />

              {editCode && (
                <p style={{ fontSize: '12px', color: '#636363', marginTop: '-8px', marginBottom: '14px', lineHeight: 1.5 }}>
                  Anyone with this code can unlock editing on the shared link. Write it down — it can't be recovered.
                </p>
              )}

              {error && (
                <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{ width: '100%', backgroundColor: '#ffffff', color: '#111', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.1s' }}
              >
                {loading ? 'Saving…' : 'Generate Link'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#848484', lineHeight: 1.6, marginBottom: '16px', marginTop: 0 }}>
                Your tree has been saved! Share this link:
              </p>

              <div style={{ backgroundColor: '#000', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#ababab', flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>{shareUrl}</span>
                <button
                  onClick={handleCopy}
                  style={{ flexShrink: 0, backgroundColor: copied ? '#16a34a' : '#1f1f1f', color: copied ? '#fff' : '#e5e7eb', border: '1px solid #333', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {editCode && (
                <p style={{ fontSize: '12px', color: '#636363', lineHeight: 1.6 }}>
                  Edit code is set. Make sure to save it — it won't be shown again.
                </p>
              )}

              <button
                onClick={() => { setShareUrl(null); setTitle(''); setEditCode(''); }}
                style={{ marginTop: '8px', background: 'none', border: 'none', color: '#636363', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
              >
                Generate a new link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
