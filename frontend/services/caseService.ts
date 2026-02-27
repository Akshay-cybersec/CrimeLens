import api from '@/lib/api';
import type {
  CaseListItem,
  CaseOverview,
  DashboardMetrics,
  EvidenceResponse,
  SearchResponse,
  SimilarCaseResponse,
  TimelineResponse,
} from '@/types/api';

export const caseService = {
  async uploadCase(file: File, title: string, description?: string): Promise<{ case_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) {
      formData.append('description', description);
    }
    const { data } = await api.post<{ case_id: string }>('/cases/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async buildBehavioralIndex(caseId: string): Promise<{ case_id: string; indexed: boolean }> {
    const { data } = await api.post<{ case_id: string; indexed: boolean }>(`/cases/${caseId}/behavioral-index`);
    return data;
  },

  async getTimeline(caseId: string): Promise<TimelineResponse> {
    const { data } = await api.get<TimelineResponse>(`/cases/${caseId}/timeline`);
    return data;
  },

  async listCases(limit = 100): Promise<CaseListItem[]> {
    const { data } = await api.get<CaseListItem[]>(`/cases`, { params: { limit } });
    return data;
  },

  async getCaseOverview(caseId: string): Promise<CaseOverview> {
    const { data } = await api.get<CaseOverview>(`/cases/${caseId}/overview`);
    return data;
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const { data } = await api.get<DashboardMetrics>(`/cases/dashboard/metrics`);
    return data;
  },

  async getEvidence(caseId: string): Promise<EvidenceResponse> {
    const { data } = await api.get<EvidenceResponse>(`/cases/${caseId}/evidence-analysis`);
    return data;
  },

  async getSimilarCases(caseId: string): Promise<SimilarCaseResponse[]> {
    const { data } = await api.get<SimilarCaseResponse[]>(`/cases/${caseId}/similar-cases`);
    return data;
  },

  async semanticSearch(caseId: string, query: string, topK = 25): Promise<SearchResponse> {
    const { data } = await api.post<SearchResponse>(`/cases/${caseId}/search`, { query, top_k: topK });
    return data;
  },
};
