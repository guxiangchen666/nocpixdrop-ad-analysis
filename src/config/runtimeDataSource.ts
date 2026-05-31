import type { SourceModes } from './dataSource';

const defaultSourceModes: SourceModes = {
  ads: 'mock',
  creatives: 'mock',
  relations: 'mock',
  recommendations: 'mock',
  aiAnalysis: 'mock',
};

export function getRuntimeSourceModes(): SourceModes {
  if (typeof document === 'undefined') return defaultSourceModes;

  const script = document.getElementById('data-source-state');
  if (script?.textContent) {
    try {
      const parsed = JSON.parse(script.textContent) as Partial<SourceModes>;
      return {
        ads: parsed.ads === 'feishu' ? 'feishu' : 'mock',
        creatives: parsed.creatives === 'feishu' ? 'feishu' : 'mock',
        relations: parsed.relations === 'feishu' ? 'feishu' : 'mock',
        recommendations: parsed.recommendations === 'feishu' ? 'feishu' : 'mock',
        aiAnalysis: parsed.aiAnalysis === 'feishu' ? 'feishu' : 'mock',
      };
    } catch {
      return defaultSourceModes;
    }
  }

  return defaultSourceModes;
}
