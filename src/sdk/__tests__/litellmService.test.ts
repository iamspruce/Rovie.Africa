import { describe, it, expect } from 'vitest';
import { chatCompletion, listModels } from '../litellmService';
import type { ChatCompletionPayload } from '../litellmService';

describe('chatCompletion validation', () => {
  it('throws when apiKey is missing', () => {
    expect(() =>
      chatCompletion({ model: 'kimi-k2.5', messages: [{ role: 'user', content: 'hi' }] } as ChatCompletionPayload)
    ).toThrow(/apiKey/i);
  });

  it('throws when model is missing', () => {
    expect(() =>
      chatCompletion({ apiKey: 'sk-rovie-xxxx', messages: [{ role: 'user', content: 'hi' }] } as ChatCompletionPayload)
    ).toThrow(/model/i);
  });

  it('throws when messages is missing or empty', () => {
    expect(() =>
      chatCompletion({ apiKey: 'sk-rovie-xxxx', model: 'kimi-k2.5' } as ChatCompletionPayload)
    ).toThrow(/messages/i);
    expect(() =>
      chatCompletion({ apiKey: 'sk-rovie-xxxx', model: 'kimi-k2.5', messages: [] })
    ).toThrow(/messages/i);
  });

  it('passes validation with correct arguments', () => {
    let result;
    expect(() => {
      result = chatCompletion({
        apiKey: 'sk-rovie-xxxx',
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: 'Hello!' }],
      });
    }).not.toThrow();
    expect(result).toBeInstanceOf(Promise);
    (result as unknown as Promise<unknown>).catch(() => {});
  });
});

describe('listModels validation', () => {
  it('throws when apiKey is missing', () => {
    expect(() => listModels(undefined as unknown as string)).toThrow(/apiKey/i);
  });
});
