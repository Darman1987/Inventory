import { useState, useMemo } from 'react';
import {
  BarChart3,
  Eye,
  EyeOff,
  Menu,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useInventory } from '../hooks/useInventory';
import { useCategories } from '../hooks/useCategories';
import { InventoryStats } from '../components/InventoryStats';
import { InventoryTable } from '../components/InventoryTable';
import { InventoryForm } from '../components/InventoryForm';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { CategoryManagement } from '../components/CategoryManagement';
import { UserMenu } from '../components/UserMenu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { InventoryItem, InventoryFormData } from '../types/inventory';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

type StockFilter = 'all' | 'low-stock' | 'in-stock' | 'expiring-soon' | 'needs-order';
type SortField = 'name' | 'quantity' | 'price' | 'category' | 'supplier' | 'lastUpdated' | 'expiryDate';
type SortDirection = 'asc' | 'desc';

export default function Dashboard() {
  const { items, isLoading, addItem, updateItem, deleteItem, getLowStockItems, getTotalValue } = useInventory();
  const { categories: managedCategories } = useCategories();
  const { logout, currentOrg, canManageOrganization, canViewOrganization, isRootAdmin } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showScanner, setShowScanner] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  const lowStockItems = getLowStockItems();
  const totalValue = getTotalValue();

  const canManageCurrentOrganization = currentOrg ? canManageOrganization(currentOrg.id) : false;
  const canEditInventory = currentOrg ? canViewOrganization(currentOrg.id) : false;

  const categories = useMemo(() => {
    const cats = new Set([...managedCategories, ...items.map(item => item.category)]);
    return ['all', ...Array.from(cats)];
  }, [items, managedCategories]);

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = items.filter(item => {
      const searchableText = [
        item.name,
        item.sku,
        item.barcode,
        item.category,
        item.location,
        item.quantity,
        item.minQuantity,
        item.price,
        item.supplier,
        item.expiryDate,
        item.lastUpdated,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedQuery === '' || searchableText.includes(normalizedQuery);

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const isLowStock = item.quantity <= item.minQuantity;
      const matchesStockFilter =
        stockFilter === 'all' ||
        (stockFilter === 'low-stock' && isLowStock) ||
        (stockFilter === 'needs-order' && isLowStock) ||
        (stockFilter === 'in-stock' && item.quantity > item.minQuantity) ||
        (stockFilter === 'expiring-soon' && isExpiringSoon(item.expiryDate));

      return matchesSearch && matchesCategory && matchesStockFilter;
    });

    return [...filtered].sort((a, b) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'quantity':
          return (a.quantity - b.quantity) * directionMultiplier;
        case 'price':
          return (a.price - b.price) * directionMultiplier;
        case 'category':
          return a.category.localeCompare(b.category) * directionMultiplier;
        case 'supplier':
          return a.supplier.localeCompare(b.supplier) * directionMultiplier;
        case 'lastUpdated':
          return (new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()) * directionMultiplier;
        case 'expiryDate': {
          const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
          return (aTime - bTime) * directionMultiplier;
        }
        case 'name':
        default:
          return a.name.localeCompare(b.name) * directionMultiplier;
      }
    });
  }, [items, searchQuery, categoryFilter, stockFilter, sortField, sortDirection]);

  const handleSubmit = async (formData: InventoryFormData) => {
    if (!canEditInventory) return;

    const action = editingItem ? 'updated' : 'created';
    const success = editingItem
      ? await updateItem(editingItem.id, formData)
      : await addItem(formData);

    if (!success) return;

    toast.success(`Product ${action} successfully.`);
    setShowForm(false);
    setEditingItem(undefined);
  };

  const handleEdit = (item: InventoryItem) => {
    if (!canEditInventory) return;
    setEditingItem(item);
    setShowForm(true);
  };

  const handleAdd = () => {
    if (!canEditInventory) return;
    setEditingItem(undefined);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(undefined);
  };

  const handleQuickScan = (code: string) => {
    setSearchQuery(code);
    setShowScanner(false);

    const foundItem = items.find(item => item.sku === code);
    if (foundItem && canEditInventory) {
      setTimeout(() => {
        handleEdit(foundItem);
      }, 300);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const resetTableControls = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStockFilter('all');
    setSortField('name');
    setSortDirection('asc');
  };

  const exportToCSV = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Location', 'Quantity', 'Min Quantity', 'Order Status', 'Price', 'Supplier', 'Expiry Date', 'Last Updated'];
    const csvData = filteredItems.map(item => [
      item.name,
      item.sku,
      item.barcode,
      item.category,
      item.location,
      item.quantity,
      item.minQuantity,
      item.quantity <= item.minQuantity ? 'Order More' : 'Stock OK',
      item.price,
      item.supplier,
      item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
      new Date(item.lastUpdated).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
    toast.success('CSV export completed successfully.');
  };

  const exportToExcel = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Location', 'Quantity', 'Min Quantity', 'Order Status', 'Price', 'Supplier', 'Expiry Date', 'Last Updated'];
    const data = filteredItems.map(item => [
      item.name,
      item.sku,
      item.barcode,
      item.category,
      item.location,
      item.quantity,
      item.minQuantity,
      item.quantity <= item.minQuantity ? 'Order More' : 'Stock OK',
      item.price,
      item.supplier,
      item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
      new Date(item.lastUpdated).toLocaleDateString(),
    ]);

    const wb = XLSX.utils.book_new();
    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory-${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
    toast.success('Excel export completed successfully.');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_45%,#020617_100%)]">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/85 px-6 py-4 text-slate-200 shadow-lg backdrop-blur">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a5f_0%,#0f172a_35%,#020617_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {showStatistics && (
          <div id="inventory-statistics-panel" className="mb-6 hidden sm:block">
            <InventoryStats
              items={items}
              lowStockCount={lowStockItems.length}
              totalValue={totalValue}
            />
          </div>
        )}

        <InventoryTable
          items={filteredItems}
          totalItems={items.length}
          headerActions={
            <div className="flex w-auto flex-col items-end gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <UserMenu onLogout={handleLogout} />
                <button
                  type="button"
                  onClick={() => setShowStatistics((current) => !current)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
                  aria-expanded={showStatistics}
                  aria-controls="inventory-statistics-panel inventory-summary-panel"
                  title={showStatistics ? 'Hide statistics' : 'Show statistics'}
                >
                  <BarChart3 className="h-4 w-4" />
                  {showStatistics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>Statistics</span>
                </button>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 self-end rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50 sm:hidden"
                    aria-label="Open mobile menu"
                  >
                    <Menu className="h-5 w-5" />
                    <span>Menu</span>
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[88%] overflow-y-auto border-l border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_45%,#f8fafc_100%)] p-0 sm:hidden"
                >
                  <SheetHeader className="border-b border-slate-200/80 px-5 py-5 text-left">
                    <SheetTitle className="text-lg text-slate-900">Workspace Menu</SheetTitle>
                    <SheetDescription className="text-slate-500">
                      Quick access to statistics and account options while you work on mobile.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-5 p-5">
                    <Accordion type="single" collapsible className="rounded-2xl border border-slate-200 bg-white/75 px-4">
                      <AccordionItem value="statistics" className="border-b-0">
                        <AccordionTrigger className="py-4 text-slate-900 hover:no-underline">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <BarChart3 className="h-4 w-4 text-slate-500" />
                            Statistics
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="grid gap-3">
                            <div id="inventory-summary-panel" className="grid gap-3">
                              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Products</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{items.length}</p>
                              </div>
                              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Need Attention</p>
                                <p className="mt-2 text-2xl font-semibold text-orange-600">{lowStockItems.length}</p>
                              </div>
                              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visible Items</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredItems.length}</p>
                              </div>
                            </div>
                            <InventoryStats
                              items={items}
                              lowStockCount={lowStockItems.length}
                              totalValue={totalValue}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <section className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        User Options
                      </div>
                      <UserMenu onLogout={handleLogout} compact />
                    </section>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          }
          categories={categories}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          stockFilter={stockFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          onSearchQueryChange={setSearchQuery}
          onCategoryFilterChange={setCategoryFilter}
          onStockFilterChange={setStockFilter}
          onSortFieldChange={setSortField}
          onSortDirectionChange={setSortDirection}
          onResetControls={resetTableControls}
          onAddItem={handleAdd}
          onScan={() => setShowScanner(true)}
          onManageCategories={() => setShowCategoryManagement(true)}
          onExportCsv={exportToCSV}
          onExportExcel={exportToExcel}
          canManageInventory={canEditInventory}
          canDeleteInventory={canManageCurrentOrganization}
          canManageCategories={canManageCurrentOrganization}
          isRootAdmin={isRootAdmin}
          showExportMenu={showExportMenu}
          onToggleExportMenu={() => setShowExportMenu((current) => !current)}
          onCloseExportMenu={() => setShowExportMenu(false)}
          onEdit={handleEdit}
          onDelete={(id) => {
            if (!canManageCurrentOrganization) return;
            void deleteItem(id).then((success) => {
              if (success) {
                toast.success('Product deleted successfully.');
              }
            });
          }}
        />

        {showForm && (
          <InventoryForm
            item={editingItem}
            onSubmit={handleSubmit}
            onClose={handleCloseForm}
          />
        )}

        {showScanner && (
          <BarcodeScanner
            onScan={handleQuickScan}
            onClose={() => setShowScanner(false)}
            title="Scan to Search Item"
          />
        )}

        {showCategoryManagement && (
          <CategoryManagement
            onClose={() => setShowCategoryManagement(false)}
          />
        )}
      </div>
    </div>
  );
}
