import { ReactNode, useState } from 'react';
import {
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  ScanBarcode,
  FolderOpen,
  Download,
  ChevronDown,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';

type StockFilter = 'all' | 'low-stock' | 'in-stock' | 'expiring-soon' | 'needs-order';
type SortField = 'name' | 'quantity' | 'price' | 'category' | 'supplier' | 'lastUpdated' | 'expiryDate';
type SortDirection = 'asc' | 'desc';

interface InventoryTableProps {
  items: InventoryItem[];
  totalItems: number;
  headerActions?: ReactNode;
  categories: string[];
  searchQuery: string;
  categoryFilter: string;
  stockFilter: StockFilter;
  sortField: SortField;
  sortDirection: SortDirection;
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onSortFieldChange: (value: SortField) => void;
  onSortDirectionChange: (value: SortDirection) => void;
  onResetControls: () => void;
  onAddItem: () => void;
  onScan: () => void;
  onManageCategories: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  canManageInventory: boolean;
  canManageCategories: boolean;
  isRootAdmin: boolean;
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onCloseExportMenu: () => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export function InventoryTable({
  items,
  totalItems,
  headerActions,
  categories,
  searchQuery,
  categoryFilter,
  stockFilter,
  sortField,
  sortDirection,
  onSearchQueryChange,
  onCategoryFilterChange,
  onStockFilterChange,
  onSortFieldChange,
  onSortDirectionChange,
  onResetControls,
  onAddItem,
  onScan,
  onManageCategories,
  onExportCsv,
  onExportExcel,
  canManageInventory,
  canManageCategories,
  isRootAdmin,
  showExportMenu,
  onToggleExportMenu,
  onCloseExportMenu,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  const [showMobileControls, setShowMobileControls] = useState(false);

  const handleDelete = (item: InventoryItem) => {
    const shouldDelete = window.confirm(
      `Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`,
    );

    if (shouldDelete) {
      onDelete(item.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)] backdrop-blur">
      <div className="border-b border-slate-200/80 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Inventory Overview</h3>
            <p className="text-sm text-slate-500">Review stock health, filter results, and sort inventory where you work.</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            {headerActions}
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Showing {items.length} of {totalItems}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowMobileControls((current) => !current)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 sm:hidden"
            type="button"
            aria-expanded={showMobileControls}
            aria-controls="inventory-mobile-controls"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showMobileControls ? 'Hide Filters & Sorting' : 'Show Filters & Sorting'}
          </button>

          <div
            id="inventory-mobile-controls"
            className={`mt-3 flex flex-wrap items-start gap-3 ${showMobileControls ? 'flex' : 'hidden'} sm:mt-0 sm:flex`}
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => onCategoryFilterChange(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-sky-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
                <select
                  value={stockFilter}
                  onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">All Stock Status</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="needs-order">Needs Order</option>
                  <option value="expiring-soon">Expiring Soon</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <ArrowUpDown className="h-4 w-4" />
                Sorting
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={sortField}
                  onChange={(e) => onSortFieldChange(e.target.value as SortField)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-sky-500"
                >
                  <option value="name">Sort: Name</option>
                  <option value="quantity">Sort: Quantity</option>
                  <option value="price">Sort: Price</option>
                  <option value="category">Sort: Category</option>
                  <option value="supplier">Sort: Supplier</option>
                  <option value="lastUpdated">Sort: Last Updated</option>
                  <option value="expiryDate">Sort: Expiry Date</option>
                </select>
                <select
                  value={sortDirection}
                  onChange={(e) => onSortDirectionChange(e.target.value as SortDirection)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-sky-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <button
              onClick={onResetControls}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-sky-600 transition-colors hover:bg-slate-200 hover:text-sky-700"
              type="button"
            >
              Reset filters and sorting
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, location, or supplier..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {canManageInventory && (
            <button
              onClick={onAddItem}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-700"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          )}
          <button
            onClick={onScan}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            title="Scan to search"
            type="button"
          >
            <ScanBarcode className="h-4 w-4" />
            Scan
          </button>
          {canManageCategories && (
            <button
              onClick={onManageCategories}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-700"
              title="Manage Categories"
              type="button"
            >
              <FolderOpen className="h-4 w-4" />
              {isRootAdmin ? 'Global Categories' : 'Categories'}
            </button>
          )}
          <div className="relative">
            <button
              onClick={onToggleExportMenu}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              type="button"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={onCloseExportMenu}></div>
                <div className="absolute left-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <button
                    onClick={onExportCsv}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
                    type="button"
                  >
                    <FileText className="h-4 w-4" />
                    Export as CSV
                  </button>
                  <div className="border-t border-slate-200"></div>
                  <button
                    onClick={onExportExcel}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
                    type="button"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:hidden">
        {items.map((item) => {
          const isLowStock = item.quantity <= item.minQuantity;
          const expiringSoon = isExpiringSoon(item.expiryDate);
          const expired = isExpired(item.expiryDate);

          return (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-base font-semibold text-slate-900">{item.name}</h4>
                    {isLowStock && <AlertCircle className="h-4 w-4 shrink-0 text-orange-500" title="Low stock" />}
                    {expired && <AlertCircle className="h-4 w-4 shrink-0 text-red-500" title="Expired" />}
                    {expiringSoon && !expired && (
                      <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" title="Expiring soon" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.sku}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    isLowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isLowStock ? 'Order More' : 'Stock OK'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Category</p>
                  <p className="mt-1 text-slate-700">{item.category}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Location</p>
                  <p className="mt-1 text-slate-700">{item.location}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Quantity</p>
                  <p className={`mt-1 font-semibold ${isLowStock ? 'text-orange-600' : 'text-slate-900'}`}>
                    {item.quantity} <span className="font-normal text-slate-500">/ {item.minQuantity}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Price</p>
                  <p className="mt-1 font-semibold text-slate-900">${item.price.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Supplier</p>
                  <p className="mt-1 text-slate-700">{item.supplier}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Expiry</p>
                  <p className={`mt-1 ${expired ? 'font-medium text-red-600' : expiringSoon ? 'font-medium text-yellow-600' : 'text-slate-700'}`}>
                    {item.expiryDate ? formatDate(item.expiryDate) : 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Updated</p>
                  <p className="mt-1 text-slate-700">{formatDate(item.lastUpdated)}</p>
                </div>
              </div>

              {canManageInventory && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex-1 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b bg-slate-50/90">
            <tr>
              {['Product', 'SKU', 'Barcode', 'Category', 'Location', 'Quantity', 'Order', 'Price', 'Supplier', 'Expiry Date', 'Last Updated', 'Actions'].map((heading) => (
                <th
                  key={heading}
                  className={`px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                    heading === 'Actions' ? 'text-right' : 'text-left'
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const isLowStock = item.quantity <= item.minQuantity;
              const expiringSoon = isExpiringSoon(item.expiryDate);
              const expired = isExpired(item.expiryDate);

              return (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/90">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{item.name}</span>
                      {isLowStock && <AlertCircle className="h-4 w-4 text-orange-500" title="Low stock" />}
                      {expired && <AlertCircle className="h-4 w-4 text-red-500" title="Expired" />}
                      {expiringSoon && !expired && <AlertCircle className="h-4 w-4 text-yellow-500" title="Expiring soon" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.sku}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{item.barcode}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.location}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${isLowStock ? 'text-orange-600' : 'text-slate-900'}`}>
                      {item.quantity}
                    </span>
                    <span className="ml-1 text-xs text-slate-500">/ {item.minQuantity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isLowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isLowStock ? 'Order More' : 'Stock OK'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-900">${item.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.supplier}</td>
                  <td className="px-6 py-4 text-sm">
                    {item.expiryDate ? (
                      <span className={`${expired ? 'font-medium text-red-600' : expiringSoon ? 'font-medium text-yellow-600' : 'text-slate-600'}`}>
                        {formatDate(item.expiryDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.lastUpdated)}</td>
                  <td className="px-6 py-4">
                    {canManageInventory ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="rounded-xl p-2 text-sky-600 transition-colors hover:bg-sky-50"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">View only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="py-14 text-center text-slate-500">
          <Package className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p>No items found</p>
        </div>
      )}
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}
