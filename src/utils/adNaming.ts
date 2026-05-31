import type { AdDailyRecord } from '../types/ads';
import type { CreativeRecord } from '../types/creatives';

const campaignTypes = ['TOF', 'ASC', 'LAL', 'ENG', 'TRAFFIC'];
const knownAudiences = ['冷受众', '温受众', '通投', 'LAL1%', 'LAL2%', '冷温热'];
const materialTypePrefixes = ['视频-', '图文-'];
const materialTypeValues = ['轮播', '幻灯片', 'Canvas'];

export interface ParsedCampaignName {
  product?: string;
  seriesType?: string;
  objectiveNote?: string;
}

export interface ParsedAdSetName {
  date?: string;
  productModel?: string;
  audienceType?: string;
  targetingDescription?: string;
}

export interface ParsedAdName {
  launchDate?: string;
  productModel?: string;
  materialDirections: string[];
  materialName?: string;
  version?: string;
  materialType?: string;
  hook?: string;
  bgm?: string;
  duration?: string;
  extensions: string[];
}

export interface CreativeNamingInsights {
  sourceAdName?: string;
  sourceCampaignName?: string;
  sourceAdsetName?: string;
  campaign: ParsedCampaignName;
  adSet: ParsedAdSetName;
  ad: ParsedAdName;
  inferred: {
    product?: string;
    seriesType?: string;
    audienceType?: string;
    targetingDescription?: string;
    launchDate?: string;
    materialDirection?: string;
    materialName?: string;
    version?: string;
    materialType?: string;
    hook?: string;
    bgm?: string;
    duration?: string;
  };
  completeness: string;
  missingFields: string[];
}

export function buildCreativeNamingInsights(creative: CreativeRecord, ads: AdDailyRecord[]): CreativeNamingInsights {
  const sourceAd = chooseSourceAd(creative, ads);
  const sourceAdName = sourceAd?.adName || creative.adName || creative.creativeName;
  const sourceCampaignName = sourceAd?.campaignName;
  const sourceAdsetName = sourceAd?.adsetName;
  const campaign = parseCampaignName(sourceCampaignName);
  const adSet = parseAdSetName(sourceAdsetName);
  const ad = parseAdName(sourceAdName);

  const inferred = {
    product: ad.productModel || adSet.productModel || campaign.product || creative.product,
    seriesType: campaign.seriesType,
    audienceType: adSet.audienceType || creative.audience,
    targetingDescription: adSet.targetingDescription,
    launchDate: ad.launchDate || adSet.date,
    materialDirection: ad.materialDirections.join('、') || creative.materialDirection,
    materialName: ad.materialName || creative.materialName,
    version: ad.version,
    materialType: ad.materialType || creative.materialType || creative.creativeType,
    hook: ad.hook,
    bgm: ad.bgm,
    duration: ad.duration,
  };
  const missingFields = getMissingFields(inferred);

  return {
    sourceAdName,
    sourceCampaignName,
    sourceAdsetName,
    campaign,
    adSet,
    ad,
    inferred,
    completeness: `${Math.round(((8 - missingFields.length) / 8) * 100)}%`,
    missingFields,
  };
}

export function parseCampaignName(name?: string): ParsedCampaignName {
  const parts = splitName(name, '-');
  if (parts.length === 0) return {};

  const first = parts[0].toUpperCase();
  if (campaignTypes.includes(first)) {
    return {
      seriesType: first,
      objectiveNote: parts.slice(1).join('-') || undefined,
    };
  }

  const second = parts[1]?.toUpperCase();
  return {
    product: isProductLike(parts[0]) ? parts[0].toUpperCase() : undefined,
    seriesType: campaignTypes.includes(second) ? second : parts[1],
    objectiveNote: parts.slice(2).join('-') || undefined,
  };
}

export function parseAdSetName(name?: string): ParsedAdSetName {
  const parts = splitName(name, '_');
  if (parts.length === 0) return {};

  const datePart = parts.find((part) => parseDateToken(part));
  const productPart = parts.find((part) => part !== datePart && isProductLike(part));
  const audiencePart = parts.find((part) => part !== datePart && part !== productPart && readAudienceType(part));
  const remaining = parts.filter((part) => part !== datePart && part !== productPart && part !== audiencePart);
  const audiencePieces = splitAudience(audiencePart);
  const descriptionParts = [...audiencePieces.description, ...remaining];

  return {
    date: parseDateToken(datePart),
    productModel: productPart?.toUpperCase(),
    audienceType: audiencePieces.audienceType,
    targetingDescription: descriptionParts.join(' / ') || undefined,
  };
}

export function parseAdName(name?: string): ParsedAdName {
  const parts = splitName(name, '_');
  const result: ParsedAdName = {
    materialDirections: [],
    extensions: [],
  };

  const dateIndex = parts.findIndex((part) => Boolean(parseDateToken(part)));
  if (dateIndex >= 0) {
    result.launchDate = parseDateToken(parts[dateIndex]);
  }

  const productIndex = parts.findIndex((part, index) => index !== dateIndex && isProductLike(part));
  if (productIndex >= 0) {
    result.productModel = parts[productIndex].toUpperCase();
  }

  const contentParts = parts.filter((_, index) => index !== dateIndex && index !== productIndex);
  const materialParts: string[] = [];

  contentParts.forEach((part) => {
    const extension = parseExtension(part);
    if (extension) {
      Object.assign(result, extension.fields);
      if (extension.extra) result.extensions.push(extension.extra);
      return;
    }

    if (isMaterialType(part)) {
      result.materialType = part;
      return;
    }

    if (!result.version && isVersionToken(part)) {
      result.version = part;
      return;
    }

    materialParts.push(part);
  });

  const [directionPart, ...nameParts] = materialParts;
  result.materialDirections = splitMaterialDirections(directionPart);
  result.materialName = nameParts.join('_') || undefined;

  return result;
}

function chooseSourceAd(creative: CreativeRecord, ads: AdDailyRecord[]) {
  if (ads.length === 0) return undefined;
  const directAd = creative.adId ? ads.find((ad) => ad.adId === creative.adId) : undefined;
  if (directAd) return directAd;
  return [...ads].sort((left, right) => right.spend - left.spend)[0];
}

function splitName(name: string | undefined, separator: '-' | '_') {
  if (!name) return [];
  return name
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseDateToken(token?: string) {
  if (!token) return undefined;
  const compact = token.trim();
  const yyMMdd = compact.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (yyMMdd) return `20${yyMMdd[1]}-${yyMMdd[2]}-${yyMMdd[3]}`;

  const monthDay = compact.match(/^(\d{1,2})[.-](\d{1,2})$/);
  if (monthDay) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${monthDay[1].padStart(2, '0')}-${monthDay[2].padStart(2, '0')}`;
  }

  return undefined;
}

function isProductLike(value?: string) {
  if (!value) return false;
  return /^[a-z]{2,}\d{1,3}[a-z0-9]*$/i.test(value);
}

function readAudienceType(value?: string) {
  if (!value) return undefined;
  return knownAudiences.find((audience) => value.includes(audience));
}

function splitAudience(value?: string) {
  const audienceType = readAudienceType(value);
  if (!value || !audienceType) return { audienceType, description: [] as string[] };
  const description = value
    .replace(audienceType, '')
    .split(/[-/、|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return { audienceType, description };
}

function parseExtension(part: string): { fields: Partial<ParsedAdName>; extra?: string } | undefined {
  const hook = part.match(/^Hook(\d+)$/i);
  if (hook) return { fields: { hook: `Hook${hook[1]}` } };

  const bgm = part.match(/^BGM(.+)$/i);
  if (bgm) return { fields: { bgm: bgm[1] } };

  const duration = part.match(/^(?:时长)?(\d+)s$/i);
  if (duration) return { fields: { duration: `${duration[1]}s` } };

  return undefined;
}

function isMaterialType(part: string) {
  return materialTypePrefixes.some((prefix) => part.startsWith(prefix)) || materialTypeValues.includes(part);
}

function isVersionToken(part: string) {
  return /^(?:v\d+|[A-Z]|\d+)$/i.test(part);
}

function splitMaterialDirections(value?: string) {
  if (!value) return [];
  return value
    .split(/[\\/、|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getMissingFields(inferred: CreativeNamingInsights['inferred']) {
  const required: Array<[keyof CreativeNamingInsights['inferred'], string]> = [
    ['product', '产品型号'],
    ['seriesType', '系列类型'],
    ['audienceType', '受众类型'],
    ['launchDate', '上线日期'],
    ['materialDirection', '素材方向'],
    ['materialName', '素材名'],
    ['version', '版本'],
    ['materialType', '素材类型'],
  ];

  return required
    .filter(([key]) => !inferred[key])
    .map(([, label]) => label);
}
