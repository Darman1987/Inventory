import { Package, TrendingDown, DollarSign, Layers } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface InventoryStatsProps {
  items: InventoryItem[];
  lowStockCount: number;
  totalValue: number;
}

export function InventoryStats({ items, lowStockCount, totalValue }: InventoryStatsProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const categories = new Set(items.map(item => item.category)).size;

  const stats = [
    {
      label: 'Total Items',
      value: totalItems.toLocaleString(),
      icon: Package,
      color: 'text-sky-600',
      bgColor: 'bg-sky-100',
    },
    {
      label: 'Low Stock',
      value: lowStockCount.toString(),
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Total Value',
      value: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: 'Categories',
      value: categories.toString(),
      icon: Layers,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 opacity-80" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{stat.value}</p>
              </div>
              <div className={`rounded-2xl p-3 shadow-inner ${stat.bgColor}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
