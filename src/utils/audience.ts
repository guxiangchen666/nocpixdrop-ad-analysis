export function formatAudienceLabel(audience?: string): string {
  const text = audience?.trim();
  if (!text) return '-';

  const normalized = text.toLowerCase();
  if (normalized.includes('cold') || text.includes('冷受众') || text.includes('冷温热') || text.startsWith('冷')) {
    return '冷受众';
  }

  return text;
}
