import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Stethoscope, ClipboardList, AlertTriangle, ShieldAlert, Scale, Thermometer, GitMerge, Edit } from 'lucide-react';
import AnimalFormModal from './AnimalFormModal';
import { Animal } from '../../types';

interface AnimalProfileProps {
  animalId: string;
  onClose: () => void;
}

export function AnimalProfile({ animalId, onClose }: AnimalProfileProps) {
  // 1. Instantly pull from the Dashboard's existing cache (0ms load)
  const { data: rawAnimals = [] } = useQuery({ 
    queryKey: ['animals', 'dashboard'],
    queryFn: () => [] as Animal[],
    staleTime: Infinity
  });
  
  const animal = rawAnimals.find((a: Animal) => a.id === animalId);

  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'husbandry'>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 2. Fetch historical logs (STUBBED FOR FUTURE MODULE)
  const { data: husbandryLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['animal_logs', animalId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return [
        {
          id: 'placeholder-log-1',
          log_type: 'SYSTEM NOTE',
          log_date: new Date().toISOString(),
          weight_grams: null,
          temperature_c: null,
          basking_temp_c: null,
          cool_temp_c: null,
          notes: 'Husbandry & Medical logging module is currently pending deployment. This is a structural placeholder.'
        }
      ];
    },
    enabled: !!animalId && activeTab === 'husbandry'
  });

  if (!animal) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center text-slate-500 font-black uppercase tracking-widest flex flex-col items-center gap-4">
          <AlertTriangle size={32} className="text-rose-500" />
          <span>Animal not found in local vault.</span>
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[40] bg-slate-900/40 backdrop-blur-sm overflow-y-auto custom-scrollbar p-4 md:p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl space-y-4">
        
        <button onClick={onClose} className="flex items-center gap-2 text-white/80 hover:text-white font-bold text-xs uppercase tracking-widest mb-2 transition-colors drop-shadow-md">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Header Hero Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden">
          
          <div className="w-full md:w-1/3 flex flex-col gap-4 relative z-10">
            <div className="relative w-full h-[300px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center">
              {animal.profile_image_url ? (
                <img src={animal.profile_image_url as string} alt={animal.name || 'Animal'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 font-black text-xs uppercase tracking-widest">No Media</span>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-between relative z-10">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{animal.name || 'Unnamed'}</h1>
                <div className="flex gap-2">
                  {animal.is_boarding && <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">Boarding</span>}
                  {animal.is_quarantine && <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">Quarantine</span>}
                  {animal.red_list_status && animal.red_list_status !== 'LC' && animal.red_list_status !== 'NE' && (
                    <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">{animal.red_list_status}</span>
                  )}
                  <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shadow-sm ml-2">
                    <Edit size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 mb-6">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">ID: {animal.id}</p>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  Ring: <span className="text-slate-600">{animal.ring_number || 'Un-ringed'}</span> | Chip: <span className="text-slate-600">{animal.microchip_id || 'None'}</span>
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                <div>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Species</span>
                  <span className="text-sm font-bold text-slate-900">{animal.species || '--'}</span>
                  {animal.latin_name && <span className="block text-slate-500 italic text-[10px]">{animal.latin_name}</span>}
                </div>
                <div>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Sex</span>
                  <span className="text-sm font-bold text-slate-900">{animal.gender || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Origin</span>
                  <span className="text-sm font-bold text-slate-900">{animal.origin || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Date of Birth</span>
                  <span className="text-sm font-bold text-slate-900">{animal.is_dob_unknown ? 'Unknown' : (animal.date_of_birth || 'Unknown')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Acquisition</span>
                  <span className="text-sm font-bold text-slate-900">{animal.acquisition_date || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden min-h-[400px] flex flex-col">
          <div className="border-b border-slate-100 bg-slate-50 px-4 pt-2 flex gap-4 overflow-x-auto custom-scrollbar">
            {[{ id: 'profile', label: 'Profile Matrix', icon: FileText }, { id: 'medical', label: 'Medical', icon: Stethoscope }, { id: 'husbandry', label: 'Husbandry Logs', icon: ClipboardList }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 px-2 border-b-2 transition-all font-black text-xs uppercase tracking-widest whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 bg-white">
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                
                {animal.critical_husbandry_notes && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 lg:col-span-1 xl:col-span-2 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="text-rose-600" size={18} />
                      <h3 className="font-black text-rose-900 uppercase tracking-widest text-xs">Critical Husbandry Notes</h3>
                    </div>
                    <p className="text-sm font-bold text-rose-700 leading-relaxed whitespace-pre-wrap">
                      {animal.critical_husbandry_notes}
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="text-amber-500" size={18} />
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Safety</h3>
                  </div>
                  <div className="space-y-3 text-sm font-bold">
                    <div className="flex justify-between"><span className="text-slate-500">Hazard Rating:</span> <span className={`uppercase tracking-widest ${animal.hazard_rating === 'HIGH' ? 'text-rose-600' : 'text-slate-700'}`}>{animal.hazard_rating || 'None'}</span></div>
                    {animal.is_venomous && <div className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg uppercase tracking-widest inline-block mt-2">VENOMOUS</div>}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Scale className="text-emerald-500" size={18} />
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Weight Management</h3>
                  </div>
                  <div className="space-y-3 text-sm font-bold">
                    <div className="flex justify-between"><span className="text-slate-500">Unit:</span> <span className="text-slate-700 uppercase">{animal.weight_unit || 'g'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Flying Weight:</span> <span className="text-slate-700">{animal.flying_weight ? `${animal.flying_weight}g` : '--'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Winter Weight:</span> <span className="text-slate-700">{animal.winter_weight ? `${animal.winter_weight}g` : '--'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Target Avg:</span> <span className="text-slate-700">{animal.average_target_weight ? `${animal.average_target_weight}g` : '--'}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Thermometer className="text-blue-500" size={18} />
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Environment</h3>
                  </div>
                  <div className="space-y-3 text-sm font-bold">
                    <div className="flex justify-between"><span className="text-slate-500">Ambient Only:</span> <span className="text-slate-700">{animal.ambient_temp_only ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Day Target:</span> <span className="text-slate-700">{animal.target_day_temp_c ? `${animal.target_day_temp_c}°C` : '--'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Night Target:</span> <span className="text-slate-700">{animal.target_night_temp_c ? `${animal.target_night_temp_c}°C` : '--'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Humidity:</span> <span className="text-slate-700">{animal.target_humidity_min_percent || '--'}% - {animal.target_humidity_max_percent || '--'}%</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <GitMerge className="text-purple-500" size={18} />
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Genetics & Lineage</h3>
                  </div>
                  <div className="space-y-3 text-sm font-bold">
                    <div className="flex justify-between"><span className="text-slate-500">Lineage:</span> <span className="text-slate-700">{animal.lineage_unknown ? 'Unknown' : 'Known'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Sire ID:</span> <span className="text-slate-700 text-[10px] font-mono truncate max-w-[120px]">{animal.sire_id || '--'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Dam ID:</span> <span className="text-slate-700 text-[10px] font-mono truncate max-w-[120px]">{animal.dam_id || '--'}</span></div>
                  </div>
                </div>

                {animal.distribution_map_url && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-white"><h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Distribution</h3></div>
                    <img src={animal.distribution_map_url as string} alt="Distribution Map" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'medical' && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                <Stethoscope size={32} className="opacity-20" />
                <span className="font-black text-xs uppercase tracking-widest">Medical Module Pending Downlink</span>
              </div>
            )}
            
            {activeTab === 'husbandry' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Observation History</h3>
                </div>
                
                {loadingLogs ? (
                  <div className="flex items-center justify-center h-48 text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Retrieving Logs...</div>
                ) : husbandryLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                    <ClipboardList size={32} className="opacity-20" />
                    <span className="font-black text-xs uppercase tracking-widest">No historical logs found.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {husbandryLogs.map((log: any) => (
                      <div key={log.id} className="p-5 hover:bg-white transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                            {log.log_type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(log.log_date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 mb-2">
                          {log.weight_grams && (
                            <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                              <span className="text-slate-400 mr-2">WT:</span>{log.weight_grams}{log.weight_unit || 'g'}
                            </div>
                          )}
                          {log.temperature_c && (
                            <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                              <span className="text-slate-400 mr-2">TEMP:</span>{log.temperature_c}°C
                            </div>
                          )}
                          {(log.basking_temp_c || log.cool_temp_c) && (
                            <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                              <span className="text-slate-400 mr-2">GRADIENT:</span>{log.basking_temp_c || '--'}°C / {log.cool_temp_c || '--'}°C
                            </div>
                          )}
                        </div>

                        {log.notes && (
                          <div className="mt-3 text-sm font-medium text-slate-700 bg-white p-4 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap shadow-sm">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditModalOpen && (
          <AnimalFormModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            initialData={animal} 
          />
        )}
      </div>
    </div>
  );
}