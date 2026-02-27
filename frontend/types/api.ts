export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'INVESTIGATOR' | 'ANALYST';

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type PendingUser = {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_active: boolean;
  created_at: string;
};

export type InsightResponse = {
  id: string;
  case_id: string;
  summary: string;
  supporting_event_ids: string[];
  contradiction_type: string;
  confidence_score: number;
  ai_reasoning: string;
  created_at: string;
  generated_by_model: string;
};

export type TimelineEvent = {
  id: string;
  case_id: string;
  event_type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  raw_text: string;
  is_deleted: boolean;
};

export type CaseListItem = {
  case_id: string;
  title: string;
  description?: string | null;
  source_filename: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type CaseOverview = {
  case_id: string;
  title: string;
  description?: string | null;
  source_filename: string;
  owner_id: string;
  assigned_user_ids: string[];
  created_at: string;
  updated_at: string;
  total_events: number;
  event_types: Record<string, number>;
  latest_events: TimelineEvent[];
};

export type DashboardMetrics = {
  total_cases: number;
  cases_with_insights: number;
  active_cases: number;
  flagged_clusters: number;
  total_artifacts: number;
  flagged_messages: number;
  media_files: number;
  location_pins: number;
};

export type TimelineResponse = {
  case_id: string;
  time_range: {
    start: string | null;
    end: string | null;
  };
  activity_density_score: number;
  suspicious_windows: Array<{
    start: string;
    end: string;
    reason: string;
    severity: string;
  }>;
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
  timeline: TimelineEvent[];
};

export type SimilarCaseResponse = {
  case_id: string;
  similarity_score: number;
  crime_type?: string;
  explanation: string;
  shared_behavioral_signals: string[];
};

export type EvidenceCluster = {
  id: string;
  risk_score: number;
  related_event_ids: string[];
  related_events: TimelineEvent[];
  anomaly_type: string;
  reasoning: string;
};

export type EvidenceResponse = {
  case_id: string;
  clusters: EvidenceCluster[];
};

export type SearchResponse = {
  interpreted_query: string;
  matching_events: TimelineEvent[];
  explanation: string;
};
