import { apiCall } from './httpClient';
import { config } from './config';

export interface ChatCompletionPayload {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
}

export function chatCompletion({ apiKey, model, messages }: ChatCompletionPayload): Promise<unknown> {
  if (!apiKey) throw new Error('chatCompletion: "apiKey" is required');
  if (!model) throw new Error('chatCompletion: "model" is required');
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('chatCompletion: "messages" must be a non-empty array');
  }
  return apiCall({
    baseUrl: config.litellmUrl,
    path: '/v1/chat/completions',
    method: 'POST',
    body: { model, messages },
    apiKey,
  });
}

export function listModels(apiKey: string): Promise<unknown> {
  if (!apiKey) throw new Error('listModels: "apiKey" is required');
  return apiCall({
    baseUrl: config.litellmUrl,
    path: '/v1/models',
    apiKey,
  });
}

export interface HealthCheckOptions {
  signal?: AbortSignal;
}

// Takes a signal so the status page can abort in-flight probes on unmount or
// on the next poll, the same way the other read endpoints do.
export function healthCheck({ signal }: HealthCheckOptions = {}): Promise<unknown> {
  return apiCall({
    baseUrl: config.litellmUrl,
    path: '/health/readiness',
    signal,
  });
}
