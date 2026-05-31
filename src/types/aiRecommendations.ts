import type { CreativeAnalysisRange } from '../services/creativeAnalysisService';

export type AiRecommendationCategory = 'recommended' | 'avoid' | 'experiment';

export type AiCreativeRecommendation = {
  id: string;
  category: AiRecommendationCategory;
  title: string;
  content: string;
  confidence: number;
  referenceCreativeIds?: string[];
};

export type AiRecommendationResponse = {
  productSku: string;
  productName: string;
  range: CreativeAnalysisRange;
  recommended: AiCreativeRecommendation[];
  avoid: AiCreativeRecommendation[];
  experiment: AiCreativeRecommendation[];
  generatedAt: string;
  model: string;
  mode: 'mock-ai' | 'real-ai';
};

export type CreativeBrief = {
  id: string;
  productSku: string;
  productName: string;
  recommendationTitle: string;
  recommendationContent: string;
  referenceCreatives: {
    creativeId: string;
    name: string;
    thumbnail?: string;
    roas?: number;
    cpa?: number;
  }[];
  format: string;
  duration: string;
  aspectRatio: string[];
  subtitles: string;
  cta: string;
  headlineKeywords: string[];
  exampleHeadline: string;
  targetRoas?: number;
  confidence: number;
  generatedAt: string;
  markdown: string;
};
