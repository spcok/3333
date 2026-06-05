import React, { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AnimalCategory, AnimalStatus } from '../../types';
import { ImageUploader } from '../ui/ImageUploader';

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'core', label: 'Core Details' },
  { id: 'id', label: 'ID & Weight' },
  { id: 'husbandry', label: 'Husbandry & Env' },
  { id: 'safety', label: 'Safety & Origin' },
  { id: 'notes', label: 'Notes & Meta' }
] as const;

type TabId = typeof TABS[number]['id'];

export default function AnimalFormModal({ isOpen, onClose }: AnimalFormModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  const uploadToSupabase = async (file: Blob, folder: string): Promise<string> => {
    const fileExt = file.type === 'image/png' ? 'png' : 'jpg';
    const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('media')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

    if (error) throw error;

    const { data } = supabase.storage.from('media').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const createAnimalMutation = useMutation({
    mutationFn: async (newAnimal: any) => {
      const { data, error } = await supabase
        .from('animals')
        .insert([newAnimal])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newAnimal) => {
      await queryClient.cancelQueries({ queryKey: ['animals', 'dashboard'] });
      const previousAnimals = queryClient.getQueryData(['animals', 'dashboard']);
      queryClient.setQueryData(['animals', 'dashboard'], (old: any) => {
        const optimisticRecord = { ...newAnimal, id: crypto.randomUUID(), status: newAnimal.status || 'ON_DISPLAY' };
        return [...(old || []), optimisticRecord];
      });
      return { previousAnimals };
    },
    onError: (err, newAnimal, context) => {
      console.error('Failed to sync animal record:', err);
      if (context?.previousAnimals) {
        queryClient.setQueryData(['animals', 'dashboard'], context.previousAnimals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['animals', 'dashboard'] });
    },
  });

  const form = useForm({
    defaultValues: {
      name: '', species: '', category: 'OWL' as AnimalCategory, status: 'ON_DISPLAY' as AnimalStatus, gender: '', date_of_birth: '', is_dob_unknown: false, 
      profile_image_url: null as string | Blob | null,
      microchip_id: '', ring_number: '', has_no_id: false, flying_weight_g: '' as number | '', winter_weight_g: '' as number | '', average_target_weight: '' as number | '', weight_unit: 'g',
      ambient_temp_only: false, target_day_temp_c: '' as number | '', target_night_temp_c: '' as number | '', water_tipping_temp: '' as number | '', target_humidity_min_percent: '' as number | '', target_humidity_max_percent: '' as number | '', misting_frequency: '', special_requirements: '', critical_husbandry_notes: '',
      hazard_rating: 'LOW', is_venomous: false, red_list_status: 'LC', acquisition_date: '', acquisition_type: 'BRED', origin: '', origin_location: '', is_boarding: false, is_quarantine: false, 
      distribution_map_url: null as string | Blob | null,
      lineage_unknown: false, sire_id: '', dam_id: '', description: '', display_order: '' as number | ''
    },
    onSubmit: async ({ value }) => {
      setUploadErrorMsg(null);
      const payload: any = { ...value };

      try {
        if (payload.profile_image_url instanceof Blob) {
          payload.profile_image_url = await uploadToSupabase(payload.profile_image_url, 'profiles');
        }
        if (payload.distribution_map_url instanceof Blob) {
          payload.distribution_map_url = await uploadToSupabase(payload.distribution_map_url, 'maps');
        }

        const numericFields = ['flying_weight_g', 'winter_weight_g', 'average_target_weight', 'target_day_temp_c', 'target_night_temp_c', 'water_tipping_temp', 'target_humidity_min_percent', 'target_humidity_max_percent', 'display_order'];
        numericFields.forEach(field => { payload[field] = payload[field] === '' ? null : Number(payload[field]); });

        const stringOrNullFields = ['date_of_birth', 'acquisition_date', 'sire_id', 'dam_id', 'profile_image_url', 'distribution_map_url'];
        stringOrNullFields.forEach(field => { payload[field] = payload[field] === '' ? null : payload[field]; });
        
        await createAnimalMutation.mutateAsync(payload);
        onClose();

      } catch (err: any) {
        console.error("Submission Sequence Failed:", err);
        setUploadErrorMsg(err.message || "Failed to process form uploads.");
      }
    },
  });

  if (!isOpen) return null;

  const renderField = (name: any, label: string, type: 'text' | 'number' | 'date' | 'textarea' = 'text', placeholder?: string) => (
    <form.Field
      name={name}
      children={(field) => (
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
          {type === 'textarea' ? (
            <textarea
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value as any)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm h-24 custom-scrollbar"
              placeholder={placeholder}
            />
          ) : (
            <input
              type={type}
              value={field.state.value as any}
              onChange={(e) => field.handleChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) as any : e.target.value as any)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm"
              placeholder={placeholder}
            />
          )}
        </div>
      )}
    />
  );

  const renderCheckbox = (name: any, label: string) => (
    <form.Field
      name={name}
      children={(field) => (
        <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            checked={field.state.value as boolean}
            onChange={(e) => field.handleChange(e.target.checked as any)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
          />
          <span className="text-xs font-bold text-slate-700 tracking-wide">{label}</span>
        </label>
      )}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-full border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Add New Animal</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Register comprehensive record</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex px-4 pt-2 border-b border-slate-100 bg-slate-50 shrink-0 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {(createAnimalMutation.isError || uploadErrorMsg) && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{uploadErrorMsg || 'Failed to save database record.'}</div>
            </div>
          )}

          <form id="animal-mutation-form" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="space-y-6">
            
            <div className={activeTab === 'core' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {renderField('name', 'Animal Name (Optional)', 'text', 'e.g. Apollo')}
                {renderField('species', 'Species', 'text', 'e.g. Golden Eagle')}
                
                <form.Field
                  name="category"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value as AnimalCategory)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="OWL">Owl</option><option value="RAPTOR">Raptor</option><option value="MAMMAL">Mammal</option><option value="EXOTIC">Exotic</option>
                      </select>
                    </div>
                  )}
                />

                <form.Field
                  name="status"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Initial Status</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value as AnimalStatus)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="ON_DISPLAY">On Display</option>
                        <option value="OFF_DISPLAY">Off Display</option>
                        <option value="QUARANTINE">Quarantine / Isolated</option>
                        <option value="MEDICAL">Medical - Off Display</option>
                        <option value="OFFSITE">Stored Offsite</option>
                      </select>
                    </div>
                  )}
                />

                <form.Field
                  name="gender"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gender</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="">Unknown / Not Recorded</option><option value="M">Male</option><option value="F">Female</option><option value="U">Unsexed</option>
                      </select>
                    </div>
                  )}
                />

                {renderField('date_of_birth', 'Date of Birth', 'date')}
                
                <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Profile Photo</label>
                  <form.Field
                    name="profile_image_url"
                    children={(field) => (
                      <ImageUploader value={field.state.value} onChange={(file) => field.handleChange(file as any)} requireCrop={true} aspectRatio={1} />
                    )}
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  {renderCheckbox('is_dob_unknown', 'Date of Birth is Approximate/Unknown')}
                </div>
              </div>
            </div>

            <div className={activeTab === 'id' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {renderField('ring_number', 'Ring Number', 'text', 'e.g. A10-992')}
                {renderField('microchip_id', 'Microchip ID', 'text')}
                <div className="sm:col-span-2 pt-1 pb-4 border-b border-slate-100">
                  {renderCheckbox('has_no_id', 'Animal holds no formal identification')}
                </div>
                {renderField('flying_weight_g', 'Flying/Summer Weight', 'number', 'Weight')}
                {renderField('winter_weight_g', 'Winter/Resting Weight', 'number', 'Weight')}
                {renderField('average_target_weight', 'Target Average Weight', 'number', 'Weight')}
                <form.Field
                  name="weight_unit"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Unit of Measurement</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option>
                      </select>
                    </div>
                  )}
                />
              </div>
            </div>

            <div className={activeTab === 'husbandry' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  {renderCheckbox('ambient_temp_only', 'Requires Ambient Temperature Only (No localized basking)')}
                </div>
                {renderField('target_day_temp_c', 'Target Day Temp (°C)', 'number')}
                {renderField('target_night_temp_c', 'Target Night Temp (°C)', 'number')}
                {renderField('target_humidity_min_percent', 'Min Humidity (%)', 'number')}
                {renderField('target_humidity_max_percent', 'Max Humidity (%)', 'number')}
                {renderField('water_tipping_temp', 'Water Tipping Threshold (°C)', 'number')}
                {renderField('misting_frequency', 'Misting Frequency', 'text', 'e.g. Twice Daily')}
                <div className="sm:col-span-2">
                  {renderField('special_requirements', 'Special Dietary or Enclosure Requirements', 'textarea', 'Detail any unique requirements...')}
                </div>
                <div className="sm:col-span-2">
                  {renderField('critical_husbandry_notes', 'Critical Husbandry Warnings', 'textarea', 'Detail any aggressive behaviors, stress triggers, etc...')}
                </div>
              </div>
            </div>

            <div className={activeTab === 'safety' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <form.Field
                  name="hazard_rating"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Hazard Rating</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="LOW">Low Risk</option><option value="MEDIUM">Medium Risk</option><option value="HIGH">High Risk - DWA</option>
                      </select>
                    </div>
                  )}
                />
                <form.Field
                  name="red_list_status"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">IUCN Red List Status</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="NE">Not Evaluated (NE)</option><option value="DD">Data Deficient (DD)</option><option value="LC">Least Concern (LC)</option><option value="NT">Near Threatened (NT)</option><option value="VU">Vulnerable (VU)</option><option value="EN">Endangered (EN)</option><option value="CR">Critically Endangered (CR)</option><option value="EW">Extinct in the Wild (EW)</option>
                      </select>
                    </div>
                  )}
                />
                <div className="sm:col-span-2 pt-2 pb-4 border-b border-slate-100">
                  {renderCheckbox('is_venomous', 'Species is Venomous')}
                </div>
                {renderField('acquisition_date', 'Acquisition Date', 'date')}
                <form.Field
                  name="acquisition_type"
                  children={(field) => (
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Acquisition Type</label>
                      <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 outline-none transition-all text-sm font-medium shadow-sm">
                        <option value="BRED">Captive Bred (Internal)</option><option value="PURCHASED">Purchased</option><option value="DONATED">Donated / Rescue</option><option value="LOAN">On Loan</option>
                      </select>
                    </div>
                  )}
                />
                {renderField('origin', 'Breeder / Origin Source', 'text')}
                {renderField('origin_location', 'Origin Location / Area', 'text')}
                
                <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Distribution Map</label>
                  <form.Field
                    name="distribution_map_url"
                    children={(field) => (
                      <ImageUploader value={field.state.value} onChange={(file) => field.handleChange(file as any)} requireCrop={false} />
                    )}
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-2 gap-5 pt-2">
                  {renderCheckbox('is_boarding', 'Currently Boarding (Not Academy Property)')}
                  {renderCheckbox('is_quarantine', 'Requires Strict Quarantine Protocol')}
                </div>
              </div>
            </div>

            <div className={activeTab === 'notes' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  {renderCheckbox('lineage_unknown', 'Lineage/Parentage is Unknown')}
                </div>
                <form.Subscribe
                  selector={(state) => state.values.lineage_unknown}
                  children={(lineage_unknown) => (
                    <>
                      {renderField('sire_id', 'Sire UUID', 'text')}
                      {renderField('dam_id', 'Dam UUID', 'text')}
                      {lineage_unknown && (
                        <div className="sm:col-span-2 mt-[-10px] text-[10px] text-amber-600 font-bold tracking-wide">
                          Warning: Parentage fields should be ignored if lineage is marked unknown.
                        </div>
                      )}
                    </>
                  )}
                />
                <div className="sm:col-span-2">
                  {renderField('description', 'General Description / Public Notes', 'textarea', 'Description visible on public-facing materials...')}
                </div>
                {renderField('display_order', 'Display Sequence (UI Override)', 'number')}
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
            {activeTab} module
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors">
              Cancel
            </button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  form="animal-mutation-form"
                  disabled={!canSubmit || isSubmitting || createAnimalMutation.isPending}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  {(isSubmitting || createAnimalMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {(isSubmitting || createAnimalMutation.isPending) ? 'Processing...' : 'Commit Record'}
                </button>
              )}
            />
          </div>
        </div>

      </div>
    </div>
  );
}