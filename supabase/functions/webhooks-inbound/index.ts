import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token, x-webhook-signature',
};

// HMAC SHA256 verification
async function verifyHmacSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const source = url.searchParams.get('source') || 'custom';
    const workspaceId = url.searchParams.get('workspace');

    // Read raw body for signature verification
    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authentication validation
    const webhookToken = req.headers.get('x-webhook-token');
    const webhookSignature = req.headers.get('x-webhook-signature');
    const inboundToken = Deno.env.get('INBOUND_WEBHOOK_TOKEN');
    const signingSecret = Deno.env.get('INBOUND_WEBHOOK_SIGNING_SECRET');

    // Validate token if provided and secret is configured
    if (webhookToken && inboundToken) {
      if (webhookToken !== inboundToken) {
        console.log('Invalid webhook token');
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate HMAC signature if provided and secret is configured
    if (webhookSignature && signingSecret) {
      const isValid = await verifyHmacSignature(rawBody, webhookSignature, signingSecret);
      if (!isValid) {
        console.log('Invalid HMAC signature');
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract headers (excluding sensitive ones)
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!['authorization', 'x-webhook-token'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Insert into webhook_inbox
    const { data, error } = await supabase
      .from('webhook_inbox')
      .insert({
        workspace_id: workspaceId || null,
        source,
        headers,
        payload,
        status: 'received',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting webhook:', error);
      return new Response(JSON.stringify({ error: 'Failed to store webhook' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Webhook received: ${data.id} from ${source}`);

    return new Response(JSON.stringify({ 
      success: true, 
      id: data.id,
      message: 'Webhook received successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook inbound error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
