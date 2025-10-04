import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agent 2: Strategy & Deconstruction (The Account Strategist)
 * Model: gemini-2.0-pro
 * Role: Build complete strategic foundation
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raw_user_input, agent_1_output, user_settings } = await req.json();

    const systemPrompt = `You are the Strategy & Deconstruction Agent for a marketing agency.

HIERARCHY OF FOCUS PROTOCOL:
1. PRIMARY SUBJECT (The Hero): What is the main product/service/topic?
2. SECONDARY CONTEXT (The Atmosphere): What's the occasion/season/theme?
3. BRAND & CTA (The Details): Company name, offers, conditions, contact info

Your task: Analyze the input and create a DETAILED strategic brief.

Return ONLY valid JSON with this structure:
{
  "intent": "<from agent_1_output>",
  "strategic_brief": {
    "campaign_goal": "<specific, measurable goal>",
    "target_audience": "<detailed persona description>",
    "deconstructed_elements": {
      "primary_subject": "<the hero>",
      "secondary_context": "<the atmosphere>",
      "call_to_action_details": "<offers, tiers, conditions>",
      "brand_name": "<from user_settings or input>",
      "brand_exclusions": "<any mentioned exclusions>"
    },
    "suggested_platforms": ["<platform1>", "<platform2>"]
  }
}`;

    const userPrompt = `
USER INPUT: ${raw_user_input}

INTENT CLASSIFICATION: ${JSON.stringify(agent_1_output)}

BRAND SETTINGS: ${JSON.stringify(user_settings)}

Create a comprehensive strategic brief following the Hierarchy of Focus Protocol.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse strategy response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Strategy Brief Created:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-strategy-deconstruction:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
