export interface AdvancementPoolRead {
  id: number
  event_id: number
  source_round_id: number
  target_round_id: number
  event_participant_id: number
  user_id: number
  advancement_relationship_id: number
  advancement_position: number
  advancement_criteria_type: string
  advancement_criteria_value: number
  is_assigned_to_squad: boolean
  assigned_squad_id?: number
  created_at: string
  updated_at: string
  user?: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  event_participant?: {
    id: number
    entry_number?: number
    qualifying_average?: number
  }
}

export interface AdvancementPoolCreate {
  event_id: number
  source_round_id: number
  target_round_id: number
  event_participant_id: number
  user_id: number
  advancement_relationship_id: number
  advancement_position: number
  advancement_criteria_type: string
  advancement_criteria_value: number
  is_assigned_to_squad?: boolean
  assigned_squad_id?: number
}

export interface AdvancementPoolUpdate {
  is_assigned_to_squad?: boolean
  assigned_squad_id?: number
}

export interface AdvancementPoolAssignment {
  pool_entry_id: number
  squad_id: number
}

export interface AdvancementPoolParticipantData {
  event_id: number
  source_round_id: number
  target_round_id: number
  event_participant_id: number
  user_id: number
  advancement_relationship_id: number
  advancement_position: number
  criteria_type: string
  criteria_value: number
}

export interface AdvancementPoolBulkAdd {
  participants: AdvancementPoolParticipantData[]
  source_round_id: number
  target_round_id: number
  relationship_id: number
}

export interface AdvancementPoolResponse {
  success: boolean
  message: string
  pool_entries_created?: number
  removed_count?: number
  error?: string
}

export interface PoolParticipantWithUser extends AdvancementPoolRead {
  user?: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  event_participant?: {
    id: number
    entry_number: number
    qualifying_average?: number
  }
}

export interface PoolValidationResult {
  success: boolean
  can_start: boolean
  available_participants: number
  required_participants: number
  unassigned_participants: number
  error?: string
}
