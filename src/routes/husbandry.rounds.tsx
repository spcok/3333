import React, { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle2, AlertCircle, Droplets, Lock, HeartPulse, 
  ChevronLeft, ChevronRight, Loader2, Edit3, X, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dailyRoundsService } from '../services/dailyRoundsService';
import { Animal, DailyRound } from '../types';

export const Route = createFileRoute('/husbandry/rounds')({
  component: DailyRoundsPage,
});

const SECTION_BAR = [
  { id: 'ALL', label: 'All' },
  { id: 'OWL', label: 'Owls' },
  { id: 'RAPTOR', label: 'Raptors' },
  { id: 'MAMMAL', label: 'Mammal' },
  { id: 'EXOTIC', label: 'Exotic' }
] as const;

const SHIFT_OPTIONS = ['AM', 'PM', 'MIDDAY', 'NIGHT'];

export function DailyRoundsPage() {
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [activeShift, setActiveShift] = useState<string>('AM');
  
  const [noteModalState, setNoteModalState] = useState<{
    isOpen: boolean;
    animal: Animal | null;
    round: DailyRound | null;
    currentNote: string;
  }>({
    isOpen: false,
    animal: null,
    round: null,
    currentNote: ''
  });

  const { data: animals = [], isLoading: loadingAnimals } = useQuery({
    queryKey: ['animals', 'dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Animal[];
    },
    staleTime: Infinity,
  });

  const { data: rounds = [], isLoading: loadingRounds, error: roundsError } = useQuery({
    queryKey: ['daily_rounds', selectedDate, activeShift],
    queryFn: () => dailyRoundsService.getRoundsByDateAndShift(selectedDate, activeShift)
  });

  const toggleMutation = useMutation({
    mutationFn: dailyRoundsService.upsertRoundToggle,
    onMutate: async (newRound) => {
      // Optimistic cache update for instant UI feedback
      await queryClient.cancelQueries({ queryKey: ['daily_rounds', selectedDate, activeShift] });
      const previousRounds = queryClient.getQueryData<DailyRound[]>(['daily_rounds', selectedDate, activeShift]);
      
      if (previousRounds) {
        queryClient.setQueryData<DailyRound[]>(['daily_rounds', selectedDate, activeShift], old => {
          if (!old) return old;
          const exists = old.find(r => r.animal_id === newRound.animal_id);
          if (exists) {
            return old.map(r => r.animal_id === newRound.animal_id ? { ...r, ...newRound } : r);
          } else {
            return [...old, { id: 'temp-id', ...newRound, is_deleted: false } as DailyRound];
          }
        });
      }
      return { previousRounds };
    },
    onError: (err, newRound, context) => {
      if (context?.previousRounds) {
        queryClient.setQueryData(['daily_rounds', selectedDate, activeShift], context.previousRounds);
      }
      console.error("Toggle sync failed", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_rounds', selectedDate, activeShift] });
    }
  });

  const notesMutation = useMutation({
    mutationFn: async ({ roundId, animalId, notes }: { roundId?: string, animalId: string, notes: string | null }) => {
      if (roundId) {
        return await dailyRoundsService.updateRoundNotes(roundId, notes);
      } else {
        return await dailyRoundsService.upsertRoundToggle({
          animal_id: animalId,
          date: selectedDate,
          shift: activeShift,
          section: activeSection !== 'ALL' ? activeSection : null,
          is_alive: true, // Default to true if creating via notes alone
          water_checked: false,
          locks_secured: false,
          animal_issue_note: notes
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_rounds', selectedDate, activeShift] });
      setNoteModalState({ isOpen: false, animal: null, round: null, currentNote: '' });
    }
  });

  const filteredWorksheetRecords = useMemo(() => {
    const cleanAnimals = animals.filter(a => {
      if (a.status === 'ARCHIVED') return false;
      if (activeSection === 'ALL') return true;
      return a.category === activeSection;
    });

    const roundMap = new Map<string, DailyRound>();
    rounds.forEach(r => {
      roundMap.set(r.animal_id, r);
    });

    return cleanAnimals.map(animal => ({
      animal,
      round: roundMap.get(animal.id) || null
    }));
  }, [animals, rounds, activeSection]);

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleToggle = (animal: Animal, round: DailyRound | null, field: 'is_alive' | 'water_checked' | 'locks_secured') => {
    const currentAlive = round ? round.is_alive : false;
    const currentWater = round ? round.water_checked : false;
    const currentLocks = round ? round.locks_secured : false;

    // Fast-path: When a record is brand new, tapping any button usually means the animal is alive.
    // We default is_alive to true if they are checking water or locks to save them a tap.
    const newAliveState = field === 'is_alive' ? !currentAlive : (round ? currentAlive : true);

    toggleMutation.mutate({
      animal_id: animal.id,
      date: selectedDate,
      shift: activeShift,
      section: animal.category,
      is_alive: newAliveState,
      water_checked: field === 'water_checked' ? !currentWater : currentWater,
      locks_secured: field === 'locks_secured' ? !currentLocks : currentLocks,
      animal_issue_note: round?.animal_issue_note || null
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily Welfare Rounds</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
            Visual Health, Hydration & Security Checklist
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center gap-4 self-center xl:self-auto w-full xl:w-auto">
          
          {/* Shift Selector */}
          <div className="flex gap-1 bg-slate-100 p-1 border rounded-xl shadow-inner w-full lg:w-auto overflow-x-auto custom-scrollbar shrink-0">
            {SHIFT_OPTIONS.map(shift => (
              <button
                key={shift}
                onClick={() => setActiveShift(shift)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-1 lg:flex-none ${
                  activeShift === shift 
                    ? 'bg-blue-600 text-white shadow-sm border border-blue-500' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {shift} SHIFT
              </button>
            ))}
          </div>

          {/* Section Toolbar */}
          <div className="flex gap-1 bg-slate-100 p-1 border rounded-xl shadow-inner overflow-x-auto w-full lg:w-auto custom-scrollbar shrink-0">
            {SECTION_BAR.map(btn => (
              <button
                key={btn.id}
                onClick={() => setActiveSection(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeSection === btn.id 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner w-full lg:w-auto justify-between lg:justify-start shrink-0">
            <button onClick={() => shiftDate(-1)} className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition-all shadow-sm">
              <ChevronLeft size={14} />
            </button>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-black uppercase tracking-widest text-slate-700 outline-none text-center px-2 w-32"
            />
            <button onClick={() => shiftDate(1)} className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 rounded-lg transition-all shadow-sm">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Checklist Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {roundsError ? (
          <div className="p-10 text-center text-rose-600 bg-rose-50 font-bold flex flex-col items-center gap-3">
            <AlertCircle size={24} />
            Database link exception. Verify network availability to sync rounds.
          </div>
        ) : loadingAnimals || loadingRounds ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <Loader2 size={24} className="text-blue-500 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Synchronizing Shift Matrix...</span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 min-w-[200px]">Entity Matrix</th>
                  <th className="px-4 py-4 w-32 text-center">Visual Health</th>
                  <th className="px-4 py-4 w-32 text-center">Water Quality</th>
                  <th className="px-4 py-4 w-32 text-center">Lock Security</th>
                  <th className="px-6 py-4">Welfare / Issue Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                {filteredWorksheetRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-black uppercase tracking-widest bg-slate-50/30">
                      No active records match the current section parameters.
                    </td>
                  </tr>
                ) : (
                  filteredWorksheetRecords.map(({ animal, round }) => {
                    const isAlive = round?.is_alive || false;
                    const isWater = round?.water_checked || false;
                    const isLocked = round?.locks_secured || false;
                    const isComplete = isAlive && isWater && isLocked;

                    return (
                      <tr key={animal.id} className={`transition-colors group ${isComplete ? 'bg-emerald-50/20' : 'hover:bg-slate-50/40'}`}>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm leading-tight flex items-center gap-2">
                              {animal.name}
                              {isComplete && <CheckCircle2 size={14} className="text-emerald-500" />}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                              {animal.species}
                            </span>
                          </div>
                        </td>

                        {/* Interactive Toggle: ALIVE */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggle(animal, round, 'is_alive')}
                            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition-all shadow-sm border ${
                              isAlive 
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20' 
                                : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <HeartPulse size={24} className={isAlive ? '' : 'opacity-50'} />
                          </button>
                        </td>

                        {/* Interactive Toggle: WATER */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggle(animal, round, 'water_checked')}
                            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition-all shadow-sm border ${
                              isWater 
                                ? 'bg-blue-500 border-blue-600 text-white shadow-blue-500/20' 
                                : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <Droplets size={24} className={isWater ? '' : 'opacity-50'} />
                          </button>
                        </td>

                        {/* Interactive Toggle: LOCKS */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggle(animal, round, 'locks_secured')}
                            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition-all shadow-sm border ${
                              isLocked 
                                ? 'bg-amber-500 border-amber-600 text-white shadow-amber-500/20' 
                                : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <Lock size={22} className={isLocked ? '' : 'opacity-50'} />
                          </button>
                        </td>

                        {/* Welfare Notes Box */}
                        <td className="px-6 py-4 max-w-xs text-slate-500 font-medium leading-relaxed">
                          <button
                            onClick={() => setNoteModalState({ isOpen: true, animal, round, currentNote: round?.animal_issue_note || '' })}
                            className={`w-full text-left p-3 rounded-xl transition-colors min-h-[56px] flex items-start border ${
                              round?.animal_issue_note 
                                ? 'bg-rose-50 border-rose-200 hover:bg-rose-100' 
                                : 'bg-slate-50/50 border-dashed border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {round?.animal_issue_note ? (
                              <span className="text-[11px] leading-normal block font-bold text-rose-700">
                                {round.animal_issue_note}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-400">
                                <Edit3 size={14} className="opacity-50" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Log Issue / Alert</span>
                              </div>
                            )}
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Embedded Notes Modal */}
      {noteModalState.isOpen && noteModalState.animal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-rose-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-rose-600" size={18} />
                <h2 className="text-sm font-black text-rose-900 uppercase tracking-widest">Welfare Alert Notes</h2>
              </div>
              <button onClick={() => setNoteModalState({ isOpen: false, animal: null, round: null, currentNote: '' })} className="text-rose-400 hover:text-rose-700">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Entity: {noteModalState.animal.name} ({activeShift} Shift)
              </p>
              <textarea 
                value={noteModalState.currentNote}
                onChange={(e) => setNoteModalState(s => ({ ...s, currentNote: e.target.value }))}
                placeholder="Log physical issues, damages, or behavioral abnormalities here..."
                className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-medium text-slate-900 h-32 outline-none shadow-inner"
                autoFocus
              />
            </div>
            
            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button 
                type="button" 
                onClick={() => setNoteModalState({ isOpen: false, animal: null, round: null, currentNote: '' })} 
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={notesMutation.isPending}
                onClick={() => notesMutation.mutate({ 
                  roundId: noteModalState.round?.id, 
                  animalId: noteModalState.animal!.id, 
                  notes: noteModalState.currentNote.trim() || null 
                })}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {notesMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                Commit Alert
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}