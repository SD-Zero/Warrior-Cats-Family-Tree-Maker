import { supabase } from './supabase';
import { CatNode, Connection } from '../types';

export interface SharedTree {
  id: string;
  data: { cats: CatNode[]; connections: Connection[] };
  edit_code_hash: string | null;
  title: string | null;
  created_at: string;
}

export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.toLowerCase().trim());
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function genId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

export async function saveTree(
  cats: CatNode[],
  connections: Connection[],
  title: string,
  editCode: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const id             = genId();
  const edit_code_hash = editCode ? await hashCode(editCode) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  try {
    result = await supabase.from('trees').insert({
      id,
      data: { cats, connections },
      edit_code_hash,
      title: title.trim() || null,
    });
  } catch (fetchErr) {
    console.error('Supabase fetch failed:', fetchErr);
    throw new Error(`Network error reaching Supabase: ${(fetchErr as Error).message}`);
  }
  if (result.error) {
    console.error('Supabase insert error:', result.error);
    throw new Error(result.error.message || JSON.stringify(result.error));
  }
  return id;
}

export async function loadTree(id: string): Promise<SharedTree> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('trees')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  if (!data)  throw new Error('Tree not found');
  return data as SharedTree;
}
