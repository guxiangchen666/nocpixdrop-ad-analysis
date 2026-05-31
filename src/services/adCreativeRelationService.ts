import type { AdCreativeRelation } from '../types/feishu';
import { loadDataBundle } from './dataStore';
import { buildCreativeJoinContext, resolveCreativeForAd, resolveCreativeForAdWithContext } from './performanceService';

export async function getAdCreativeRelations(): Promise<AdCreativeRelation[]> {
  const bundle = await loadDataBundle();
  return bundle.adCreativeRelations;
}

export { buildCreativeJoinContext, resolveCreativeForAd, resolveCreativeForAdWithContext };
