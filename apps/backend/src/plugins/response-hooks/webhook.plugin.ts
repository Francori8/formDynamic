import type { ResponseHookPlugin, HookResult } from '@formdynamic/plugin-contracts';
import type { ResponsePayload } from '@formdynamic/plugin-contracts';

interface WebhookConfig {
  url: string;
}

export const webhookPlugin: ResponseHookPlugin = {
  name: 'webhook',
  type: 'response-hook',

  async onResponse(payload: ResponsePayload, config: unknown): Promise<HookResult> {
    const { url } = config as WebhookConfig;

    if (!url) return { success: false, error: 'No webhook URL configured' };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      return res.ok
        ? { success: true }
        : { success: false, error: `Webhook responded with ${res.status}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Webhook failed' };
    }
  },
};
