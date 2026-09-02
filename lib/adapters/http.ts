import { z } from "zod";
import { acquireProviderRateLimit } from "@/lib/db";

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly retryable: boolean,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

interface ProviderConfig {
  url: string;
  token: string;
  rateLimitPerMinute: number;
}

function configFor(provider: string): ProviderConfig {
  const prefix = `${provider}_VALIDATION`;
  const url = process.env[`${prefix}_URL`];
  const token = process.env[`${provider}_API_TOKEN`];
  if (!url || !token) {
    throw new IntegrationError(
      `${provider} integration is not configured. Set ${prefix}_URL and ${provider}_API_TOKEN as server secrets.`,
      provider,
      false,
    );
  }
  const configuredLimit = Number(process.env[`${provider}_RATE_LIMIT_PER_MINUTE`] ?? "30");
  return { url, token, rateLimitPerMinute: Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 30 };
}

async function respectRateLimit(provider: string, limit: number) {
  const wait = await acquireProviderRateLimit(provider, limit);
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
}

export async function requestAuthorizedProvider<T>(
  provider: string,
  operation: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  correlationId: string,
  beforeRequest?: () => Promise<void>,
): Promise<T> {
  const config = configFor(provider);
  await respectRateLimit(provider, config.rateLimitPerMinute);
  await beforeRequest?.();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.token}`,
        "X-Correlation-Id": correlationId,
        "X-Monitoring-Operation": operation,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new IntegrationError(
        `${provider} responded with HTTP ${response.status}`,
        provider,
        response.status === 408 || response.status === 429 || response.status >= 500,
        response.status,
      );
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new IntegrationError(`${provider} returned an invalid response shape`, provider, false);
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new IntegrationError(
      timedOut ? `${provider} timed out` : `${provider} could not be reached`,
      provider,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}