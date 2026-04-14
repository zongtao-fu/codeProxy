import type {
  OAuthModelAliasEntry,
  OpenAIProvider,
  ProviderApiKeyEntry,
  ProviderModel,
  ProviderSimpleConfig,
  ProviderUsageConfig,
  ProviderUsageExtractor,
} from "@/lib/http/types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const extractArrayPayload = (data: unknown, key: string): unknown[] => {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  const candidate = data[key] ?? data.items ?? data.data ?? data;
  return Array.isArray(candidate) ? candidate : [];
};

export const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const normalizeHeaders = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string> = {};
  Object.entries(value).forEach(([key, raw]) => {
    const k = key.trim();
    if (!k) return;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed) result[k] = trimmed;
    } else if (typeof raw === "number" || typeof raw === "boolean") {
      result[k] = String(raw);
    }
  });
  return Object.keys(result).length ? result : undefined;
};

export const normalizeUsageExtractor = (value: unknown): ProviderUsageExtractor | undefined => {
  if (!isRecord(value)) return undefined;
  const extractor: ProviderUsageExtractor = {};
  const planNamePath = normalizeString(value["plan-name-path"] ?? value.planNamePath);
  const usedPath = normalizeString(value["used-path"] ?? value.usedPath);
  const remainingPath = normalizeString(value["remaining-path"] ?? value.remainingPath);
  const totalPath = normalizeString(value["total-path"] ?? value.totalPath);
  const unitPath = normalizeString(value["unit-path"] ?? value.unitPath);
  const expiresAtPath = normalizeString(value["expires-at-path"] ?? value.expiresAtPath);
  if (planNamePath) extractor.planNamePath = planNamePath;
  if (usedPath) extractor.usedPath = usedPath;
  if (remainingPath) extractor.remainingPath = remainingPath;
  if (totalPath) extractor.totalPath = totalPath;
  if (unitPath) extractor.unitPath = unitPath;
  if (expiresAtPath) extractor.expiresAtPath = expiresAtPath;
  return Object.keys(extractor).length ? extractor : undefined;
};

export const normalizeUsageConfig = (value: unknown): ProviderUsageConfig | undefined => {
  if (!isRecord(value)) return undefined;
  const url = normalizeString(value.url);
  if (!url) return undefined;
  const refreshIntervalRaw =
    value["refresh-interval-seconds"] ?? value.refreshIntervalSeconds ?? undefined;
  const refreshIntervalSeconds =
    typeof refreshIntervalRaw === "number" && Number.isFinite(refreshIntervalRaw)
      ? refreshIntervalRaw
      : typeof refreshIntervalRaw === "string" && refreshIntervalRaw.trim() !== ""
        ? Number(refreshIntervalRaw)
        : undefined;
  const normalizedRefresh =
    refreshIntervalSeconds !== undefined && Number.isFinite(refreshIntervalSeconds)
      ? Math.max(0, refreshIntervalSeconds)
      : undefined;
  const extractor = normalizeUsageExtractor(value.extractor);
  return {
    url,
    method: normalizeString(value.method) ?? undefined,
    headers: normalizeHeaders(value.headers) ?? undefined,
    ...(normalizedRefresh !== undefined ? { refreshIntervalSeconds: normalizedRefresh } : {}),
    ...(extractor ? { extractor } : {}),
  };
};

export const normalizeModels = (value: unknown): ProviderModel[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const models = value
    .map((item) => {
      if (!isRecord(item)) return null;
      const name = normalizeString(item.name ?? item.id);
      if (!name) return null;
      const alias = normalizeString(item.alias);
      const priorityRaw = item.priority;
      const priority =
        typeof priorityRaw === "number" && Number.isFinite(priorityRaw) ? priorityRaw : undefined;
      const testModel = normalizeString(item["test-model"] ?? item.testModel) ?? undefined;
      return {
        name,
        ...(alias ? { alias } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(testModel ? { testModel } : {}),
      };
    })
    .filter(Boolean) as ProviderModel[];
  return models.length ? models : undefined;
};

export const normalizeExcludedModels = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    const trimmed = String(item ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.length ? result : undefined;
};

export const serializeHeaders = (headers?: Record<string, string>) =>
  headers && Object.keys(headers).length ? headers : undefined;

export const serializeModels = (models?: ProviderModel[]) =>
  Array.isArray(models)
    ? models
        .map((model) => {
          const name = normalizeString(model?.name) ?? "";
          if (!name) return null;
          const payload: Record<string, unknown> = { name };
          const alias = normalizeString(model?.alias);
          if (alias && alias !== name) payload.alias = alias;
          if (typeof model?.priority === "number" && Number.isFinite(model.priority)) {
            payload.priority = model.priority;
          }
          const testModel = normalizeString(model?.testModel);
          if (testModel) payload["test-model"] = testModel;
          return payload;
        })
        .filter(Boolean)
    : undefined;

export const serializeProviderKey = (config: ProviderSimpleConfig) => {
  const payload: Record<string, unknown> = { "api-key": config.apiKey };
  const name = normalizeString(config.name);
  if (name) payload.name = name;
  const prefix = normalizeString(config.prefix);
  if (prefix) payload.prefix = prefix;
  const baseUrl = normalizeString(config.baseUrl);
  if (baseUrl) payload["base-url"] = baseUrl;
  const proxyUrl = normalizeString(config.proxyUrl);
  if (proxyUrl) payload["proxy-url"] = proxyUrl;
  const headers = serializeHeaders(config.headers);
  if (headers) payload.headers = headers;
  const models = serializeModels(config.models);
  if (models && models.length) payload.models = models;
  if (config.excludedModels && config.excludedModels.length) {
    payload["excluded-models"] = config.excludedModels;
  }
  if (config.skipAnthropicProcessing) {
    payload["skip-anthropic-processing"] = true;
  }
  const usageConfig = serializeUsageConfig(config.usageConfig);
  if (usageConfig) payload["usage-config"] = usageConfig;
  return payload;
};

export const serializeGeminiKey = (config: ProviderSimpleConfig) => {
  const payload: Record<string, unknown> = { "api-key": config.apiKey };
  const name = normalizeString(config.name);
  if (name) payload.name = name;
  const prefix = normalizeString(config.prefix);
  if (prefix) payload.prefix = prefix;
  const baseUrl = normalizeString(config.baseUrl);
  if (baseUrl) payload["base-url"] = baseUrl;
  const headers = serializeHeaders(config.headers);
  if (headers) payload.headers = headers;
  const models = serializeModels(config.models);
  if (models && models.length) payload.models = models;
  if (config.excludedModels && config.excludedModels.length) {
    payload["excluded-models"] = config.excludedModels;
  }
  const usageConfig = serializeUsageConfig(config.usageConfig);
  if (usageConfig) payload["usage-config"] = usageConfig;
  return payload;
};

export const serializeOpenAIProvider = (provider: OpenAIProvider) => {
  const payload: Record<string, unknown> = { name: provider.name };
  const baseUrl = normalizeString(provider.baseUrl);
  if (baseUrl) payload["base-url"] = baseUrl;
  const prefix = normalizeString(provider.prefix);
  if (prefix) payload.prefix = prefix;
  const headers = serializeHeaders(provider.headers);
  if (headers) payload.headers = headers;
  const models = serializeModels(provider.models);
  if (models && models.length) payload.models = models;
  if (typeof provider.priority === "number" && Number.isFinite(provider.priority)) {
    payload.priority = provider.priority;
  }
  const testModel = normalizeString(provider.testModel);
  if (testModel) payload["test-model"] = testModel;

  const usageCfg = serializeUsageConfig(provider.usageConfig);
  if (usageCfg) payload["usage-config"] = usageCfg;

  if (Array.isArray(provider.apiKeyEntries) && provider.apiKeyEntries.length) {
    const entries = provider.apiKeyEntries
      .map((entry): Record<string, unknown> | null => {
        const apiKey = normalizeString(entry.apiKey) ?? "";
        if (!apiKey) return null;
        const entryPayload: Record<string, unknown> = { "api-key": apiKey };
        const proxyUrl = normalizeString(entry.proxyUrl);
        if (proxyUrl) entryPayload["proxy-url"] = proxyUrl;
        const entryHeaders = serializeHeaders(entry.headers);
        if (entryHeaders) entryPayload.headers = entryHeaders;
        return entryPayload;
      })
      .filter(Boolean);
    if (entries.length) {
      payload["api-key-entries"] = entries;
    }
  }

  return payload;
};

export const serializeUsageConfig = (usageConfig?: ProviderUsageConfig) => {
  const url = normalizeString(usageConfig?.url);
  if (!url) return undefined;
  const payload: Record<string, unknown> = { url };
  const method = normalizeString(usageConfig?.method);
  if (method) payload.method = method;
  const headers = serializeHeaders(usageConfig?.headers);
  if (headers) payload.headers = headers;
  if (
    typeof usageConfig?.refreshIntervalSeconds === "number" &&
    Number.isFinite(usageConfig.refreshIntervalSeconds) &&
    usageConfig.refreshIntervalSeconds >= 0
  ) {
    payload["refresh-interval-seconds"] = usageConfig.refreshIntervalSeconds;
  }
  const extractorPayload: Record<string, unknown> = {};
  const extractor = usageConfig?.extractor;
  const planNamePath = normalizeString(extractor?.planNamePath);
  const usedPath = normalizeString(extractor?.usedPath);
  const remainingPath = normalizeString(extractor?.remainingPath);
  const totalPath = normalizeString(extractor?.totalPath);
  const unitPath = normalizeString(extractor?.unitPath);
  const expiresAtPath = normalizeString(extractor?.expiresAtPath);
  if (planNamePath) extractorPayload["plan-name-path"] = planNamePath;
  if (usedPath) extractorPayload["used-path"] = usedPath;
  if (remainingPath) extractorPayload["remaining-path"] = remainingPath;
  if (totalPath) extractorPayload["total-path"] = totalPath;
  if (unitPath) extractorPayload["unit-path"] = unitPath;
  if (expiresAtPath) extractorPayload["expires-at-path"] = expiresAtPath;
  if (Object.keys(extractorPayload).length) payload.extractor = extractorPayload;
  return payload;
};

export const normalizeOauthExcludedModels = (payload: unknown): Record<string, string[]> => {
  if (!isRecord(payload)) return {};
  const source = payload["oauth-excluded-models"] ?? payload.items ?? payload;
  if (!isRecord(source)) return {};

  const result: Record<string, string[]> = {};

  Object.entries(source).forEach(([provider, models]) => {
    const key = String(provider ?? "")
      .trim()
      .toLowerCase();
    if (!key) return;
    const normalized = normalizeExcludedModels(models);
    if (!normalized) return;
    result[key] = normalized;
  });

  return result;
};

export const normalizeOauthModelAlias = (
  payload: unknown,
): Record<string, OAuthModelAliasEntry[]> => {
  if (!isRecord(payload)) return {};
  const source = payload["oauth-model-alias"] ?? payload.items ?? payload;
  if (!isRecord(source)) return {};

  const result: Record<string, OAuthModelAliasEntry[]> = {};

  Object.entries(source).forEach(([channel, mappings]) => {
    const key = String(channel ?? "")
      .trim()
      .toLowerCase();
    if (!key) return;
    if (!Array.isArray(mappings)) return;
    const seen = new Set<string>();
    const normalized = mappings
      .map((item) => {
        if (!isRecord(item)) return null;
        const name = normalizeString(item.name ?? item.id ?? item.model) ?? "";
        const alias = normalizeString(item.alias) ?? "";
        if (!name || !alias) return null;
        const fork = item.fork === true;
        return fork ? { name, alias, fork } : { name, alias };
      })
      .filter(Boolean)
      .filter((entry) => {
        const aliasEntry = entry as OAuthModelAliasEntry;
        const dedupeKey = `${aliasEntry.name.toLowerCase()}::${aliasEntry.alias.toLowerCase()}::${aliasEntry.fork ? "1" : "0"}`;
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      }) as OAuthModelAliasEntry[];
    if (normalized.length) {
      result[key] = normalized;
    }
  });

  return result;
};

export const normalizeApiKeyEntries = (raw: unknown): ProviderApiKeyEntry[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const entries = raw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const apiKey = normalizeString(entry["api-key"] ?? entry.apiKey) ?? "";
      if (!apiKey) return null;
      const proxyUrl = normalizeString(entry["proxy-url"] ?? entry.proxyUrl) ?? undefined;
      const entryHeaders = normalizeHeaders(entry.headers);
      return {
        apiKey,
        ...(proxyUrl ? { proxyUrl } : {}),
        ...(entryHeaders ? { headers: entryHeaders } : {}),
      };
    })
    .filter(Boolean) as ProviderApiKeyEntry[];
  return entries.length ? entries : undefined;
};
