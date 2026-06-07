import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC SHA256 signing
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return 'sha256=' + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Exponential backoff intervals (in minutes)
const BACKOFF_INTERVALS = [1, 5, 15, 60, 180, 720, 1440]; // 1m, 5m, 15m, 1h, 3h, 12h, 24h
const MAX_ATTEMPTS = 8;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending deliveries
    const { data: deliveries, error: fetchError } = await supabase
      .from('webhook_deliveries')
      .select(`
        id,
        endpoint_id,
        event_type,
        payload,
        attempt_count,
        webhook_endpoints (
          id,
          url,
          secret,
          is_active,
          workspace_id
        )
      `)
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error('Error fetching deliveries:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch deliveries' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!deliveries || deliveries.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending deliveries',
        processed: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${deliveries.length} deliveries`);

    const results = await Promise.all(deliveries.map(async (delivery) => {
      const endpoint = delivery.webhook_endpoints as unknown as {
        id: string;
        url: string;
        secret: string;
        is_active: boolean;
        workspace_id: string;
      };

      // Skip if endpoint is inactive
      if (!endpoint || !endpoint.is_active) {
        await supabase
          .from('webhook_deliveries')
          .update({ status: 'failed', last_error: 'Endpoint inactive or deleted' })
          .eq('id', delivery.id);
        return { id: delivery.id, status: 'skipped', reason: 'inactive endpoint' };
      }

      // Build standardized payload
      const webhookPayload = {
        id: delivery.id,
        event: delivery.event_type,
        workspace_id: endpoint.workspace_id,
        occurred_at: new Date().toISOString(),
        data: delivery.payload,
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = await signPayload(payloadString, endpoint.secret);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
            'x-webhook-id': delivery.id,
            'x-webhook-event': delivery.event_type,
            'x-webhook-timestamp': new Date().toISOString(),
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Success
          await supabase
            .from('webhook_deliveries')
            .update({
              status: 'success',
              delivered_at: new Date().toISOString(),
              last_status_code: response.status,
              attempt_count: delivery.attempt_count + 1,
            })
            .eq('id', delivery.id);

          console.log(`Delivery ${delivery.id} succeeded`);
          return { id: delivery.id, status: 'success' };
        } else {
          // HTTP error - schedule retry
          const newAttemptCount = delivery.attempt_count + 1;
          const responseText = await response.text().catch(() => 'Unable to read response');
          
          if (newAttemptCount >= MAX_ATTEMPTS) {
            await supabase
              .from('webhook_deliveries')
              .update({
                status: 'failed',
                last_status_code: response.status,
                last_error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
                attempt_count: newAttemptCount,
              })
              .eq('id', delivery.id);

            console.log(`Delivery ${delivery.id} failed permanently after ${MAX_ATTEMPTS} attempts`);
            return { id: delivery.id, status: 'failed', reason: 'max attempts reached' };
          }

          // Schedule retry with backoff
          const backoffMinutes = BACKOFF_INTERVALS[Math.min(newAttemptCount - 1, BACKOFF_INTERVALS.length - 1)];
          const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await supabase
            .from('webhook_deliveries')
            .update({
              attempt_count: newAttemptCount,
              next_attempt_at: nextAttempt.toISOString(),
              last_status_code: response.status,
              last_error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
            })
            .eq('id', delivery.id);

          console.log(`Delivery ${delivery.id} failed, retry scheduled for ${nextAttempt.toISOString()}`);
          return { id: delivery.id, status: 'retry', nextAttempt: nextAttempt.toISOString() };
        }
      } catch (err) {
        // Network/timeout error
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const newAttemptCount = delivery.attempt_count + 1;

        if (newAttemptCount >= MAX_ATTEMPTS) {
          await supabase
            .from('webhook_deliveries')
            .update({
              status: 'failed',
              last_error: errorMessage,
              attempt_count: newAttemptCount,
            })
            .eq('id', delivery.id);

          return { id: delivery.id, status: 'failed', reason: 'max attempts reached' };
        }

        const backoffMinutes = BACKOFF_INTERVALS[Math.min(newAttemptCount - 1, BACKOFF_INTERVALS.length - 1)];
        const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await supabase
          .from('webhook_deliveries')
          .update({
            attempt_count: newAttemptCount,
            next_attempt_at: nextAttempt.toISOString(),
            last_error: errorMessage,
          })
          .eq('id', delivery.id);

        console.log(`Delivery ${delivery.id} network error, retry scheduled`);
        return { id: delivery.id, status: 'retry', error: errorMessage };
      }
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dispatcher error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
