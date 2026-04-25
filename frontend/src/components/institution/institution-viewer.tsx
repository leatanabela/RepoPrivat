'use client';

import { useState, useEffect, useMemo } from 'react';
import { getInstitutionInfo } from '@/lib/actions/institution.actions';
import { Search, Building2, Clock, Wallet, CalendarDays, Palmtree, Info, ChevronDown } from 'lucide-react';
import type { InstitutionInfo, InstitutionInfoType } from '@/lib/types';
import { INSTITUTION_INFO_TYPE_LABELS } from '@/lib/types';

const TYPE_ICONS: Record<InstitutionInfoType, typeof Clock> = {
  program_lucru: Clock,
  salariu: Wallet,
  sarbatoare: CalendarDays,
  concediu: Palmtree,
  altele: Info,
};

const TYPE_COLORS: Record<InstitutionInfoType, { bg: string; text: string; iconBg: string; border: string }> = {
  program_lucru: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-200/60 dark:border-blue-700/30' },
  salariu: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-200/60 dark:border-emerald-700/30' },
  sarbatoare: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-200/60 dark:border-amber-700/30' },
  concediu: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-200/60 dark:border-violet-700/30' },
  altele: { bg: 'bg-slate-50 dark:bg-slate-900/20', text: 'text-slate-700 dark:text-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-900/40', border: 'border-slate-200/60 dark:border-slate-700/30' },
};

export function InstitutionViewer({ collapsedByDefault = false }: { collapsedByDefault?: boolean }) {
  const [items, setItems] = useState<InstitutionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<InstitutionInfoType | 'all'>('all');
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    getInstitutionInfo()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (filterType !== 'all') result = result.filter((i) => i.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search, filterType]);

  function toggleItemExpand(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 p-6 animate-pulse">
        <div className="h-5 w-48 bg-slate-200 dark:bg-dm-surface-high rounded mb-4" />
        <div className="h-12 bg-slate-100 dark:bg-dm-surface-high rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) return null; // Don't render if no info exists

  return (
    <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-dm-surface-bright/10 hover:bg-slate-50 dark:hover:bg-dm-surface-high/40 transition-colors duration-180"
      >
        <div className="size-10 rounded-xl bg-primary/10 dark:bg-dm-primary/10 flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-primary dark:text-dm-primary" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-base font-bold text-slate-900 dark:text-dm-on-surface">Informații Instituție</h3>
          <p className="text-xs text-slate-500 dark:text-dm-on-surface-variant">Program, sărbători, concedii și alte detalii utile</p>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută... (ex: programul de Paști, salariul, concediu medical)"
              className="w-full h-11 pl-11 pr-4 text-sm rounded-xl bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/20 focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-180 placeholder:text-slate-400 dark:text-dm-on-surface outline-none"
            />
          </div>

          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
                filterType === 'all'
                  ? 'bg-primary dark:bg-dm-primary-container text-white'
                  : 'bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 text-slate-600 dark:text-dm-on-surface-variant'
              }`}
            >
              Toate
            </button>
            {(Object.keys(INSTITUTION_INFO_TYPE_LABELS) as InstitutionInfoType[]).map((t) => {
              const count = items.filter((i) => i.type === t).length;
              if (count === 0) return null;
              const Icon = TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? 'all' : t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 flex items-center gap-1.5 ${
                    filterType === t
                      ? 'bg-primary dark:bg-dm-primary-container text-white'
                      : 'bg-slate-50 dark:bg-dm-surface-high border border-slate-200 dark:border-dm-surface-bright/15 text-slate-600 dark:text-dm-on-surface-variant'
                  }`}
                >
                  <Icon size={12} />
                  {INSTITUTION_INFO_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-dm-on-surface-variant text-center py-6">
                {search.trim() ? `Niciun rezultat pentru „${search}"` : 'Nicio informație în această categorie'}
              </p>
            ) : (
              filtered.map((item) => {
                const Icon = TYPE_ICONS[item.type];
                const colors = TYPE_COLORS[item.type];
                const isExpanded = expandedItems.has(item.id);
                const isLong = item.content.length > 150;
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border ${colors.border} ${colors.bg} p-4 transition-all duration-180`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`size-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={16} className={colors.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-bold text-slate-800 dark:text-dm-on-surface text-sm">{item.title}</p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.text} bg-white/60 dark:bg-black/20 shrink-0`}>
                            {INSTITUTION_INFO_TYPE_LABELS[item.type]}
                          </span>
                        </div>
                        <p className={`text-sm text-slate-700 dark:text-dm-on-surface-variant whitespace-pre-wrap leading-relaxed ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                          {item.content}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => toggleItemExpand(item.id)}
                            className={`text-xs font-semibold mt-1.5 ${colors.text} hover:underline`}
                          >
                            {isExpanded ? 'Mai puțin' : 'Citește mai mult'}
                          </button>
                        )}
                        {(item.date_from || item.date_to) && (
                          <p className="text-[11px] text-slate-500 dark:text-dm-on-surface-variant mt-2 font-medium">
                            {item.date_from && `📅 de la ${new Date(item.date_from).toLocaleDateString('ro-RO')}`}
                            {item.date_from && item.date_to && ' '}
                            {item.date_to && `până la ${new Date(item.date_to).toLocaleDateString('ro-RO')}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
