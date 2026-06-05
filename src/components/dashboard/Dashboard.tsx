import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState
} from '@tanstack/react-table';
import { 
  Search, Plus, Drumstick, ArrowUpDown, Loader2, 
  Scale, Calendar, CheckCircle2, ThermometerSun, AlertCircle, ClipboardList, Activity
} from 'lucide-react';
import { Animal } from '../../types';
import { supabase } from '../../lib/supabase';
import AnimalFormModal from '../animals/AnimalFormModal';

const columnHelper = createColumnHelper<Animal>();

const EXOTIC_CATEGORIES = ['EXOTIC'];

export function Dashboard() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [isCreateAnimalModalOpen, setIsCreateAnimalModalOpen] = useState(false);
  const [viewDate, setViewDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: allAnimals = [], isLoading, error } = useQuery({
    queryKey: ['animals', 'dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Animal[];
    },
    meta: { persist: true },
  });

  const filteredData = useMemo(() => {
    if (activeTab === 'ALL') return allAnimals;
    return allAnimals.filter(animal => animal.category === activeTab);
  }, [allAnimals, activeTab]);

  const totalInView = filteredData.length;
  const weighedToday = 0; 
  const fedToday = 0; 

  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('name', {
        header: 'Animal Details',
        cell: info => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-sm">{info.getValue() || 'Unnamed'}</span>
            <span className="text-xs text-slate-500">{info.row.original.species}</span>
          </div>
        ),
      }),
    ];

    if (EXOTIC_CATEGORIES.includes(activeTab)) {
      return [
        ...baseColumns,
        columnHelper.accessor('species', {
          header: 'Species',
          cell: info => <span className="text-xs text-slate-600 font-medium">{info.getValue()}</span>,
        }),
        columnHelper.accessor('flying_weight_g', {
          header: 'Weight',
          cell: info => (
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Scale size={12} className="text-slate-400" />
              {info.getValue() ? `${info.getValue()}g` : '--'}
            </span>
          ),
        }),
        columnHelper.display({
          id: 'last_feed',
          header: 'Last Feed',
          cell: () => <span className="text-xs text-slate-400 italic">Pending Logs</span>,
        }),
        columnHelper.accessor('next_feed_date', {
          header: 'Next Feed',
          cell: info => {
            const date = info.getValue();
            if (!date) return <span className="text-slate-400">-</span>;
            return (
              <span className="font-bold text-slate-800 text-xs uppercase tracking-tight flex items-center gap-1">
                <Drumstick size={12} className="text-amber-500" />
                {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            );
          },
        }),
        columnHelper.accessor('target_day_temp_c', {
          header: 'Temperature',
          cell: info => {
            const day = info.getValue();
            const night = info.row.original.target_night_temp_c;
            const ambient = info.row.original.ambient_temp_only;
            if (!day && !night) return <span className="text-slate-400">--</span>;
            return (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                  <ThermometerSun size={12} />
                  {ambient ? 'Ambient:' : 'Basking:'} {day}°C
                </span>
                {!ambient && night && (
                  <span className="text-[10px] text-blue-600 font-medium tracking-wide">
                    Night: {night}°C
                  </span>
                )}
              </div>
            );
          },
        }),
      ];
    }

    return [
      ...baseColumns,
      columnHelper.accessor('flying_weight_g', {
        header: 'Weight',
        cell: info => {
          const weight = info.getValue();
          const target = info.row.original.average_target_weight;
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Scale size={12} className="text-slate-400" />
                {weight ? `${weight}g` : '--'}
              </span>
              {target && <span className="text-[10px] text-slate-400">Target: {target}g</span>}
            </div>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status & ID',
        cell: info => {
          const status = info.getValue();
          
          let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
          let displayLabel = status || 'UNKNOWN';

          if (status === 'ON_DISPLAY') { colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; displayLabel = 'ON DISPLAY'; }
          else if (status === 'MEDICAL') { colorClass = 'bg-rose-50 text-rose-700 border-rose-200'; displayLabel = 'MEDICAL'; }
          else if (status === 'QUARANTINE') { colorClass = 'bg-amber-50 text-amber-700 border-amber-200'; displayLabel = 'QUARANTINE'; }
          else if (status === 'OFF_DISPLAY') { colorClass = 'bg-slate-100 text-slate-600 border-slate-300'; displayLabel = 'OFF DISPLAY'; }
          else if (status === 'OFFSITE') { colorClass = 'bg-blue-50 text-blue-700 border-blue-200'; displayLabel = 'OFFSITE'; }
          
          return (
            <div className="flex flex-col items-start gap-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${colorClass}`}>
                {displayLabel}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                {info.row.original.ring_number || info.row.original.microchip_id || 'NO ID'}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('next_feed_date', {
        header: 'Next Feed',
        cell: info => {
          const date = info.getValue();
          if (!date) return <span className="text-slate-400">-</span>;
          
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-tight flex items-center gap-1">
                <Drumstick size={12} className="text-amber-500" />
                {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                {info.row.original.next_feed_note ?? 'Scheduled'}
              </span>
            </div>
          );
        },
      }),
    ];
  }, [activeTab]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const categories = ['ALL', 'OWL', 'RAPTOR', 'MAMMAL', 'EXOTIC', 'ARCHIVED'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
            Real-time husbandry overview
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              value={viewDate}
              onChange={e => setViewDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search by name, ID, species..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => setIsCreateAnimalModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] shrink-0"
          >
            <Plus size={16} />
            Add Animal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-48">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ClipboardList size={18} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Tasks</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
             <CheckCircle2 size={32} className="mb-2 opacity-20" />
             <p className="text-xs font-bold uppercase tracking-widest">No pending tasks</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-48">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Activity size={18} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Health & Medical</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
             <AlertCircle size={32} className="mb-2 opacity-20" />
             <p className="text-xs font-bold uppercase tracking-widest">No active medical alerts</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Scale size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weighed Today</p>
                <p className="text-lg font-black text-slate-900 leading-none mt-1">
                  {weighedToday} <span className="text-sm text-slate-400 font-medium">/ {totalInView}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Drumstick size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fed Today</p>
                <p className="text-lg font-black text-slate-900 leading-none mt-1">
                  {fedToday} <span className="text-sm text-slate-400 font-medium">/ {totalInView}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === category 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {category.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {error ? (
          <div className="p-8 text-center text-rose-600 bg-rose-50 font-medium">
            Connection error: Ensure your database environment variables are set correctly and RLS policies allow read access.
          </div>
        ) : isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="text-emerald-500 animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Synchronizing with Server...</span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id} 
                        className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors select-none group"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown 
                            size={12} 
                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${header.column.getIsSorted() ? 'opacity-100 text-emerald-500' : ''}`} 
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 mb-4 shadow-inner">
                        <Scale size={24} className="text-slate-400" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Records Found</h3>
                      <p className="text-xs font-bold text-slate-500 mt-2">No animals match this category filter.</p>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateAnimalModalOpen && (
        <AnimalFormModal 
          isOpen={isCreateAnimalModalOpen} 
          onClose={() => setIsCreateAnimalModalOpen(false)} 
        />
      )}
      
    </div>
  );
}