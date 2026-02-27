import api from '@/lib/api';
import type { InsightResponse } from '@/types/api';

export const insightService = {
  async getCaseInsights(caseId: string): Promise<InsightResponse[]> {
    const { data } = await api.get<InsightResponse[]>(`/cases/${caseId}/insights`);
    return data;
  },

  async regenerateInsights(caseId: string): Promise<{ message: string; insight: InsightResponse }> {
    const { data } = await api.post<{ message: string; insight: InsightResponse }>(
      `/cases/${caseId}/insights/regenerate`
    );
    return data;
  },
};
