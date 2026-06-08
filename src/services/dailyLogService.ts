import { supabase } from '../lib/supabase';
import { DailyLog, FeedDetails } from '../types';

export const dailyLogService = {
  // Fetch active logs for an individual animal
  async getLogsByAnimal(animalId: string): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('animal_id', animalId)
      .eq('is_deleted', false)
      .order('log_date', { ascending: false });

    if (error) throw error;
    return data as DailyLog[];
  },

  // Commit a new log entry or append a meal to an existing day's JSONB block
  async commitLog(payload: {
    animal_id: string;
    log_type: string;
    log_date: string;
    notes?: string;
    weight_grams?: number | null;
    weight_unit?: string | null;
    weight_not_required?: boolean;
    temperature_c?: number | null;
    basking_temp_c?: number | null;
    cool_temp_c?: number | null;
    meal?: {
      food_item: string;
      food_offered_g: number;
      food_consumed_g: number;
      calci_dust_added: boolean;
    };
  }) {
    // 1. Check if a log entry already exists for this animal on this specific calendar date
    const targetDate = new Date(payload.log_date).toISOString().split('T')[0];
    
    const { data: existingLog, error: searchError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('animal_id', payload.animal_id)
      .eq('is_deleted', false)
      .gte('log_date', `${targetDate}T00:00:00.000Z`)
      .lte('log_date', `${targetDate}T23:59:59.999Z`)
      .maybeSingle();

    if (searchError) throw searchError;

    let updatedFeedDetails = { meals: [] as any[] };

    if (existingLog?.feed_details) {
      const parsed = typeof existingLog.feed_details === 'string' 
        ? JSON.parse(existingLog.feed_details) 
        : existingLog.feed_details;
      if (parsed && Array.isArray(parsed.meals)) {
        updatedFeedDetails.meals = parsed.meals;
      }
    }

    if (payload.meal) {
      updatedFeedDetails.meals.push({
        time: new Date().toISOString(),
        ...payload.meal
      });
    }

    if (existingLog) {
      // UPDATE existing row: Merge metrics and append meals
      const { data, error } = await supabase
        .from('daily_logs')
        .update({
          notes: payload.notes || existingLog.notes,
          weight_grams: payload.weight_grams !== undefined ? payload.weight_grams : existingLog.weight_grams,
          weight_unit: payload.weight_unit || existingLog.weight_unit,
          weight_not_required: payload.weight_not_required !== undefined ? payload.weight_not_required : existingLog.weight_not_required,
          temperature_c: payload.temperature_c !== undefined ? payload.temperature_c : existingLog.temperature_c,
          basking_temp_c: payload.basking_temp_c !== undefined ? payload.basking_temp_c : existingLog.basking_temp_c,
          cool_temp_c: payload.cool_temp_c !== undefined ? payload.cool_temp_c : existingLog.cool_temp_c,
          feed_details: updatedFeedDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // INSERT completely new calendar row
      const { data, error } = await supabase
        .from('daily_logs')
        .insert([{
          animal_id: payload.animal_id,
          log_type: payload.log_type,
          log_date: payload.log_date,
          notes: payload.notes || null,
          weight_grams: payload.weight_grams || null,
          weight_unit: payload.weight_unit || 'g',
          weight_not_required: payload.weight_not_required || false,
          temperature_c: payload.temperature_c || null,
          basking_temp_c: payload.basking_temp_c || null,
          cool_temp_c: payload.cool_temp_c || null,
          feed_details: payload.meal ? updatedFeedDetails : null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Edit a specific historical log directly via its primary UUID
  async updateLogDirect(logId: string, updates: Partial<DailyLog>) {
    const { data, error } = await supabase
      .from('daily_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};