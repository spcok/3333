export type AnimalCategory = 'OWL' | 'RAPTOR' | 'MAMMAL' | 'EXOTIC';
export type AnimalStatus = 'ON_DISPLAY' | 'OFF_DISPLAY' | 'QUARANTINE' | 'MEDICAL' | 'OFFSITE';

export interface Animal {
  id: string;
  name: string | null;
  species: string | null;
  category: AnimalCategory | null;
  status: AnimalStatus | null;
  
  // Physical Characteristics
  gender: string | null;
  date_of_birth: string | null;
  is_dob_unknown: boolean;
  flying_weight_g: number | null;
  winter_weight_g: number | null;
  average_target_weight: number | null;
  weight_unit: string | null;
  
  // Identification
  microchip_id: string | null;
  ring_number: string | null;
  has_no_id: boolean;
  
  // Logistics & Status
  is_boarding: boolean;
  is_quarantine: boolean;
  origin: string | null;
  origin_location: string | null;
  acquisition_date: string | null;
  acquisition_type: string | null;
  display_order: number | null;
  
  // Husbandry & Safety
  hazard_rating: string | null;
  is_venomous: boolean;
  red_list_status: string | null;
  description: string | null;
  special_requirements: string | null;
  critical_husbandry_notes: string | null;
  
  // Environmental Targets
  ambient_temp_only: boolean;
  target_day_temp_c: number | null;
  target_night_temp_c: number | null;
  water_tipping_temp: number | null;
  target_humidity_min_percent: number | null;
  target_humidity_max_percent: number | null;
  misting_frequency: string | null;
  
  // Lineage & Metadata
  distribution_map_url: string | null;
  profile_image_url: string | null;
  lineage_unknown: boolean;
  sire_id: string | null;
  dam_id: string | null;

  // Joined/Relational Data (For Dashboard Quick Views)
  location_name?: string; 
  next_feed_date?: string;
  next_feed_note?: string;
}