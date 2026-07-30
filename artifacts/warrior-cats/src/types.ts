export interface CatNode {
  id: string;
  name: string;
  x: number;
  y: number;
  image?: string;
  gender?: string;           // "Tom", "She-Cat", or custom text
  allegiance?: string;
  rank?: string;
  birthSeason?: string;
  deathSeason?: string;
  description?: string;
  relationshipNotes?: string;
  apprentices?: string[];    // IDs — not drawn as tree connections
  mentors?: string[];        // IDs — not drawn as tree connections
  successors?: string[];     // IDs — not drawn as tree connections
}

export type RelationType = 'parent' | 'kit' | 'mate' | 'ex-mate';

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
}

export interface Transform { x: number; y: number; scale: number; }

export interface KitModal {
  forCatId: string;
  newKitId: string;
  mates: CatNode[];
  exMates: CatNode[];
}
