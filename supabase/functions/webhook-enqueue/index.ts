import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnqueueRequest {
  event_type: string;
  workspace_id: string;
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
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
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: EnqueueRequest = await req.json();
    const { event_type, workspace_id, payload } = body;

    if (!event_type || !workspace_id) {
      return new Response(JSON.stringify({ error: 'Missing event_type or workspace_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Enqueueing ${event_type} for workspace ${workspace_id}`);

    // Find all active endpoints subscribed to this event
    const { data: endpoints, error: endpointsError } = await supabase
      .from('webhook_endpoints')
      .select('id, events')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true);

    if (endpointsError) {
      console.error('Error fetching endpoints:', endpointsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch endpoints' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!endpoints || endpoints.length === 0) {
      console.log('No active endpoints found for this workspace');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No endpoints to notify',
        queued: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter endpoints subscribed to this event
    const subscribedEndpoints = endpoints.filter(ep => 
      ep.events && (ep.events.includes(event_type) || ep.events.includes('*'))
    );

    if (subscribedEndpoints.length === 0) {
      console.log('No endpoints subscribed to this event');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No endpoints subscribed to this event',
        queued: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create delivery records for each subscribed endpoint
    const deliveries = subscribedEndpoints.map(ep => ({
      endpoint_id: ep.id,
      event_type,
      payload,
      status: 'pending',
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
    }));

    const { data: insertedDeliveries, error: insertError } = await supabase
      .from('webhook_deliveries')
      .insert(deliveries)
      .select('id');

    if (insertError) {
      console.error('Error creating deliveries:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create deliveries' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Queued ${insertedDeliveries?.length || 0} deliveries`);

    return new Response(JSON.stringify({ 
      success: true, 
      queued: insertedDeliveries?.length || 0,
      delivery_ids: insertedDeliveries?.map(d => d.id) || []
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enqueue error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
