import 'server-only';

type TenantTokenResponse = {
  code?: number;
  msg?: string;
  error?: {
    message?: string;
  };
  tenant_access_token?: string;
  expire?: number;
  expires_in?: number;
  data?: {
    tenant_access_token?: string;
    expire?: number;
    expires_in?: number;
  };
};

type BitableSearchResponse = {
  code?: number;
  msg?: string;
  error?: {
    message?: string;
  };
  data?: {
    items?: Array<Record<string, unknown>>;
    records?: Array<Record<string, unknown>>;
    has_more?: boolean;
    hasMore?: boolean;
    page_token?: string;
    next_page_token?: string;
    pageToken?: string;
  };
};

type TenantAccessTokenCache = {
  token: string;
  expiresAt: number;
};

const FEISHU_TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

let cachedToken: TenantAccessTokenCache | null = null;

export async function getTenantAccessToken(): Promise<string> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Feishu credentials are missing. Please set FEISHU_APP_ID and FEISHU_APP_SECRET.');
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const response = await fetch(FEISHU_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const payload = (await response.json().catch(() => ({}))) as TenantTokenResponse;
  const tenantAccessToken = payload.tenant_access_token || payload.data?.tenant_access_token;
  const expiresIn = payload.expires_in ?? payload.expire ?? payload.data?.expires_in ?? payload.data?.expire ?? 7200;
  if (!response.ok || payload.code !== 0 || !tenantAccessToken) {
    throw new Error(payload.msg || payload.error?.message || 'Failed to fetch Feishu tenant access token.');
  }

  cachedToken = {
    token: tenantAccessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 120) * 1000,
  };

  return cachedToken.token;
}

export async function searchBitableRecords(params: {
  appToken: string;
  tableId: string;
  pageSize?: number;
  filter?: Record<string, unknown>;
  fieldNames?: readonly string[];
}): Promise<Array<Record<string, unknown>>> {
  return searchBitableRecordsInternal(params, true);
}

async function searchBitableRecordsInternal(params: {
  appToken: string;
  tableId: string;
  pageSize?: number;
  filter?: Record<string, unknown>;
  fieldNames?: readonly string[];
}, allowFieldNameFallback: boolean): Promise<Array<Record<string, unknown>>> {
  const pageSize = params.pageSize ?? 500;
  const accessToken = await getTenantAccessToken();
  const records: Array<Record<string, unknown>> = [];
  let pageToken: string | undefined;
  const seenPageTokens = new Set<string>();

  while (true) {
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        break;
      }
      seenPageTokens.add(pageToken);
    }

    const searchParams = new URLSearchParams();
    searchParams.set('page_size', String(pageSize));
    if (pageToken) {
      searchParams.set('page_token', pageToken);
    }

    let payload: BitableSearchResponse;
    try {
      const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${params.appToken}/tables/${params.tableId}/records/search?${searchParams.toString()}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: params.filter,
          field_names: params.fieldNames,
        }),
      });

      payload = (await response.json().catch(() => ({}))) as BitableSearchResponse;
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.msg || payload.error?.message || 'Failed to search Feishu bitable records.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (allowFieldNameFallback && params.fieldNames && message.includes('FieldNameNotFound')) {
        return searchBitableRecordsInternal({ ...params, fieldNames: undefined }, false);
      }
      throw error;
    }

    const data = payload.data ?? {};
    const items = data.items ?? data.records ?? [];
    records.push(...items);

    const nextPageToken = data.page_token || data.next_page_token || data.pageToken;
    const hasMore = data.has_more ?? data.hasMore ?? false;
    if (!hasMore || !nextPageToken || seenPageTokens.has(nextPageToken)) {
      break;
    }
    pageToken = nextPageToken;
  }

  return records;
}
