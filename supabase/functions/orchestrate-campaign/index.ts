import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Campaign Orchestrator: Runs all 4 agents sequentially
 * Integrates with credits system and generates final image
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raw_user_input, user_settings, user_id, inspiration_image_url } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check and deduct credits (1 credit per generation)
    const { data: creditsData, error: creditsError } = await supabase.rpc('deduct_credits', {
      _user_id: user_id,
      _amount: 1,
      _description: 'Campaign generation via Agency X'
    });

    if (creditsError || !creditsData) {
      console.error('Failed to deduct credits:', creditsError);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          message: 'You need 1 credit to generate a campaign. Please purchase more credits.'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Credits deducted successfully');

    // AGENT 1: Intent Analyst
    console.log('Running Agent 1: Intent Analyst...');
    const agent1Response = await fetch(`${SUPABASE_URL}/functions/v1/agent-intent-analyst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_user_input })
    });
    const agent1Output = await agent1Response.json();
    console.log('Agent 1 complete:', agent1Output);

    // AGENT 2: Strategy & Deconstruction
    console.log('Running Agent 2: Strategy & Deconstruction...');
    const agent2Response = await fetch(`${SUPABASE_URL}/functions/v1/agent-strategy-deconstruction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_user_input,
        agent_1_output: agent1Output,
        user_settings
      })
    });
    const agent2Output = await agent2Response.json();
    console.log('Agent 2 complete');

    // AGENT 3: Content Planners (parallel execution inside)
    console.log('Running Agent 3: Content Planners...');
    const agent3Response = await fetch(`${SUPABASE_URL}/functions/v1/agent-content-planners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_2_output: agent2Output })
    });
    const agent3Outputs = await agent3Response.json();
    console.log('Agent 3 complete');

    // AGENT 4: Master Synthesis
    console.log('Running Agent 4: Master Synthesis...');
    const agent4Response = await fetch(`${SUPABASE_URL}/functions/v1/agent-master-synthesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_2_output: agent2Output,
        agent_3_outputs: agent3Outputs,
        user_settings
      })
    });
    const masterBlueprint = await agent4Response.json();
    console.log('Agent 4 complete - Master Blueprint created');

    // Generate the final image using the engineered prompt
    console.log('Generating final image...');
    const imagePrompt = masterBlueprint.masterVisuals?.master_image_prompt_for_gemini_2_5_flash_image || 
                       'A professional marketing visual';

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: inspiration_image_url 
              ? [
                  { type: 'text', text: `${imagePrompt}\n\nUse this image as inspiration:` },
                  { type: 'image_url', image_url: { url: inspiration_image_url } }
                ]
              : imagePrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      throw new Error('Image generation failed');
    }

    const imageData = await imageResponse.json();
    const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error('No image generated');
    }

    console.log('Image generated successfully');

    // Return complete campaign package
    const result = {
      ...masterBlueprint,
      generatedImageUrl,
      agentPipeline: {
        intent_analysis: agent1Output,
        strategic_brief: agent2Output,
        content_drafts: agent3Outputs
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in orchestrate-campaign:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
