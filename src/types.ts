export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export type InventoryItemInput = Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>;
