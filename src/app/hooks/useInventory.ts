import { useState, useEffect } from 'react';
import { InventoryItem, InventoryFormData } from '../types/inventory';
import { useAuth } from '../contexts/AuthContext';
import { demoInventoryItems } from '../lib/demo-data';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function mapInventoryRow(row: {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  location: string | null;
  quantity: number;
  min_quantity: number;
  price: number;
  supplier: string;
  expiry_date: string | null;
  last_updated: string;
}) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    location: row.location ?? '',
    quantity: row.quantity,
    minQuantity: row.min_quantity,
    price: Number(row.price),
    supplier: row.supplier,
    expiryDate: row.expiry_date ?? undefined,
    lastUpdated: row.last_updated,
  } satisfies InventoryItem;
}

function normalizeInventoryItem(item: InventoryItem | (Omit<InventoryItem, 'location'> & { location?: string })) {
  return {
    ...item,
    location: item.location ?? '',
  } satisfies InventoryItem;
}

export function useInventory() {
  const { currentOrg, canManageOrganization } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const useDemoMode = !isSupabaseConfigured || !supabase;

  const getStorageKey = () => {
    return currentOrg ? `inventory_items_${currentOrg.id}` : 'inventory_items';
  };

  const loadSupabaseItems = async () => {
    if (!supabase || !currentOrg) return;

    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, sku, barcode, category, location, quantity, min_quantity, price, supplier, expiry_date, last_updated')
      .eq('organization_id', currentOrg.id)
      .order('name', { ascending: true });

    if (error) {
      setItems([]);
      return;
    }

    if (data && data.length > 0) {
      setItems(data.map(mapInventoryRow));
      return;
    }

    const seedRows = demoInventoryItems.map((item) => ({
      organization_id: currentOrg.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      category: item.category,
      location: item.location,
      quantity: item.quantity,
      min_quantity: item.minQuantity,
      price: item.price,
      supplier: item.supplier,
      expiry_date: item.expiryDate ?? null,
      last_updated: item.lastUpdated,
    }));

    const seedResult = await supabase
      .from('inventory_items')
      .insert(seedRows)
      .select('id, name, sku, barcode, category, location, quantity, min_quantity, price, supplier, expiry_date, last_updated');

    if (seedResult.data) {
      setItems(seedResult.data.map(mapInventoryRow));
    }
  };

  useEffect(() => {
    if (!currentOrg) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const loadItems = async () => {
      setIsLoading(true);

      if (useDemoMode) {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
          const parsedItems = JSON.parse(stored) as Array<InventoryItem | (Omit<InventoryItem, 'location'> & { location?: string })>;
          setItems(parsedItems.map(normalizeInventoryItem));
        } else {
          const normalizedDemoItems = demoInventoryItems.map(normalizeInventoryItem);
          setItems(normalizedDemoItems);
          localStorage.setItem(getStorageKey(), JSON.stringify(normalizedDemoItems));
        }

        setIsLoading(false);
        return;
      }

      await loadSupabaseItems();
      setIsLoading(false);
    };

    void loadItems();
  }, [currentOrg?.id, useDemoMode]);

  const persistItems = (newItems: InventoryItem[]) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(newItems));
    setItems(newItems);
  };

  const addItem = async (formData: InventoryFormData) => {
    if (!currentOrg || !canManageOrganization(currentOrg.id)) return false;

    if (useDemoMode || !supabase) {
      const newItem: InventoryItem = {
        ...formData,
        id: crypto.randomUUID(),
        lastUpdated: new Date().toISOString(),
      };
      persistItems([...items, newItem]);
      return true;
    }

    const { data } = await supabase
      .from('inventory_items')
      .insert({
        organization_id: currentOrg.id,
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        category: formData.category,
        location: formData.location,
        quantity: formData.quantity,
        min_quantity: formData.minQuantity,
        price: formData.price,
        supplier: formData.supplier,
        expiry_date: formData.expiryDate ?? null,
        last_updated: new Date().toISOString(),
      })
      .select('id, name, sku, barcode, category, location, quantity, min_quantity, price, supplier, expiry_date, last_updated')
      .single();

    if (data) {
      setItems((currentItems) => [...currentItems, mapInventoryRow(data)]);
      return true;
    }

    return false;
  };

  const updateItem = async (id: string, formData: InventoryFormData) => {
    if (!currentOrg || !canManageOrganization(currentOrg.id)) return false;

    if (useDemoMode || !supabase) {
      const updatedItems = items.map((item) =>
        item.id === id
          ? { ...formData, id, lastUpdated: new Date().toISOString() }
          : item,
      );
      persistItems(updatedItems);
      return true;
    }

    const { data } = await supabase
      .from('inventory_items')
      .update({
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        category: formData.category,
        location: formData.location,
        quantity: formData.quantity,
        min_quantity: formData.minQuantity,
        price: formData.price,
        supplier: formData.supplier,
        expiry_date: formData.expiryDate ?? null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, sku, barcode, category, location, quantity, min_quantity, price, supplier, expiry_date, last_updated')
      .single();

    if (data) {
      const updatedItem = mapInventoryRow(data);
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? updatedItem : item)),
      );
      return true;
    }

    return false;
  };

  const deleteItem = async (id: string) => {
    if (!currentOrg || !canManageOrganization(currentOrg.id)) return false;

    if (useDemoMode || !supabase) {
      persistItems(items.filter((item) => item.id !== id));
      return true;
    }

    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (!error) {
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
      return true;
    }

    return false;
  };

  const getLowStockItems = () => items.filter((item) => item.quantity <= item.minQuantity);
  const getTotalValue = () => items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    getLowStockItems,
    getTotalValue,
  };
}
