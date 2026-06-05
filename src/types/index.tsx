export type AnimalCategory = 'OWL' | 'RAPTOR' | 'MAMMAL' | 'EXOTIC';
export type AnimalStatus = 'ON_DISPLAY' | 'OFF_DISPLAY' | 'QUARANTINE' | 'MEDICAL' | 'OFFSITE';
export type RecordType = 'INDIVIDUAL' | 'GROUP';

export interface Animal {
  id: string;
  record_type: RecordType;
  parent_group_id: string | null;
  name: string | null;
  species: string | null;
  latin_name: string | null;
  census_count: number;
  category: AnimalCategory | null;
  status: AnimalStatus | null;
  
  gender: string | null;
  date_of_birth: string | null;
  is_dob_unknown: boolean;
  
  // Weights (Standardized to Grams in Database)
  flying_weight: number | null;
  winter_weight: number | null;
  average_target_weight: number | null;
  weight_unit: string | null; // Stores preferred display unit
  
  microchip_id: string | null;
  ring_number: string | null;
  has_no_id: boolean;
  
  is_boarding: boolean;
  is_quarantine: boolean;
  origin: string | null;
  origin_location: string | null;
  acquisition_date: string | null;
  acquisition_type: string | null;
  display_order: number | null;
  
  hazard_rating: string | null;
  is_venomous: boolean;
  red_list_status: string | null;
  description: string | null;
  special_requirements: string | null;
  critical_husbandry_notes: string | null;
  
  ambient_temp_only: boolean;
  target_day_temp_c: number | null;
  target_night_temp_c: number | null;
  water_tipping_temp: number | null;
  target_humidity_min_percent: number | null;
  target_humidity_max_percent: number | null;
  misting_frequency: string | null;
  
  distribution_map_url: string | null;
  profile_image_url: string | null;
  lineage_unknown: boolean;
  sire_id: string | null;
  dam_id: string | null;

  location_name?: string; 
  next_feed_date?: string;
  next_feed_note?: string;
  subRows?: Animal[]; 
}