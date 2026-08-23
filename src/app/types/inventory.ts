export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  location: string;
  quantity: number;
  minQuantity: number;
  price: number;
  supplier: string;
  expiryDate?: string;
  lastUpdated: string;
}

export type InventoryFormData = Omit<InventoryItem, 'id' | 'lastUpdated'>;
