export interface CatNode {
  id: string;
  name: string;
  x: number;
  y: number;
  image?: string;
  allegiance?: string;
  rank?: string;
  birthSeason?: string;
  deathSeason?: string;
  description?: string;
  relationshipNotes?: string;
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
