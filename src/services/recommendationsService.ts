import { mapFeishuRecommendation } from '../adapters/feishuAdapters';
import { mockRecommendations } from '../data/mockFeishuRecords';
import type { Recommendation, RecommendationObjectType, RecommendationPriority, RecommendationStatus, RecommendationType } from '../types/recommendations';

export interface RecommendationFilters {
  date?: string;
  recommendationType?: RecommendationType | '';
  objectType?: RecommendationObjectType | '';
  priority?: RecommendationPriority | '';
  status?: RecommendationStatus | '';
}

const recommendations = mockRecommendations.map(mapFeishuRecommendation);

export function getRecommendations(filters: RecommendationFilters = {}): Recommendation[] {
  return recommendations.filter((recommendation) => {
    const matchesDate = !filters.date || recommendation.date === filters.date;
    const matchesType = !filters.recommendationType || recommendation.recommendationType === filters.recommendationType;
    const matchesObjectType = !filters.objectType || recommendation.objectType === filters.objectType;
    const matchesPriority = !filters.priority || recommendation.priority === filters.priority;
    const matchesStatus = !filters.status || recommendation.status === filters.status;

    return matchesDate && matchesType && matchesObjectType && matchesPriority && matchesStatus;
  });
}
