export interface BillItem {
  id: string;
  name: string;
  amount: number;
}

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface Assignment {
  itemId: string;
  personIds: string[];
}

export type SplitMode = 'equal' | 'item' | 'percentage';

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface Group {
  id: string;
  name: string;
  people: Person[];
}

export interface HistoryItem {
  id: string;
  groupId?: string;
  date: string;
  total: number;
  peopleCount: number;
  mode: SplitMode;
  settlements: (Settlement & { isPaid?: boolean })[];
  people: Person[]; // To map names
}
