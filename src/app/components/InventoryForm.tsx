import { useState, useEffect } from 'react';
import { X, ScanBarcode } from 'lucide-react';
import { InventoryItem, InventoryFormData } from '../types/inventory';
import { BarcodeScanner } from './BarcodeScanner';
import { useCategories } from '../hooks/useCategories';

interface InventoryFormProps {
  item?: InventoryItem;
  onSubmit: (data: InventoryFormData) => void;
  onClose: () => void;
}

type InventoryFormState = Omit<InventoryFormData, 'quantity' | 'minQuantity' | 'price'> & {
  quantity: number | '';
  minQuantity: number | '';
  price: number | '';
};

export function InventoryForm({ item, onSubmit, onClose }: InventoryFormProps) {
  const { categories } = useCategories();
  const [formData, setFormData] = useState<InventoryFormState>({
    name: '',
    sku: '',
    barcode: '',
    category: categories[0] || 'Electronics',
    location: '',
    quantity: '',
    minQuantity: '',
    price: '',
    supplier: '',
    expiryDate: undefined,
  });
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState<'sku' | 'barcode'>('sku');

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        category: item.category,
        location: item.location,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        price: item.price,
        supplier: item.supplier,
        expiryDate: item.expiryDate,
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantity === '' || formData.minQuantity === '' || formData.price === '') return;

    onSubmit({
      ...formData,
      quantity: Number(formData.quantity),
      minQuantity: Number(formData.minQuantity),
      price: Number(formData.price),
    });
  };

  const handleScanComplete = (code: string) => {
    if (scanTarget === 'sku') {
      setFormData({ ...formData, sku: code });
    } else {
      setFormData({ ...formData, barcode: code });
    }
    setShowScanner(false);
  };

  const handleScanClick = (target: 'sku' | 'barcode') => {
    setScanTarget(target);
    setShowScanner(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.55)] sm:max-w-3xl sm:rounded-3xl">
        <div className="sticky top-0 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-600">
                Inventory Item
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {item ? 'Edit Item' : 'Add New Item'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture product details, stock thresholds, and shelf location.
              </p>
            </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Product Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                SKU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g., WM-001"
                />
                <button
                  type="button"
                  onClick={() => handleScanClick('sku')}
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2.5 text-white transition-colors hover:bg-sky-700"
                  title="Scan Barcode"
                >
                  <ScanBarcode className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Barcode
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g., 1234567890123"
                />
                <button
                  type="button"
                  onClick={() => handleScanClick('barcode')}
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2.5 text-white transition-colors hover:bg-sky-700"
                  title="Scan Barcode"
                >
                  <ScanBarcode className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Supplier
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                placeholder="Supplier name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
                placeholder="e.g., Aisle A - Shelf 2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Min. Quantity
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value || undefined })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-sky-600 px-4 py-3 font-medium text-white transition-colors hover:bg-sky-700"
            >
              {item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScanComplete}
          onClose={() => setShowScanner(false)}
          title={scanTarget === 'sku' ? 'Scan Product SKU' : 'Scan Product Barcode'}
        />
      )}
    </div>
  );
}
