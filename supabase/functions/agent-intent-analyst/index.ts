import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agent 1: Intent Analyst (The Gatekeeper)
 * Model: gemini-2.5-flash-lite
 * Role: Instantly classify user's core marketing intent
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raw_user_input } = await req.json();

    if (!raw_user_input) {
      return new Response(
        JSON.stringify({ error: 'Missing raw_user_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are the Intent Analyst for a marketing agency. Classify user intent into ONE of these categories:
- DIRECT_RESPONSE_SALE (promotional offers, discounts, sales)
- BRAND_AWARENESS (announcements, introductions, general promotion)
- ENGAGEMENT (interactive content, questions, polls)
- EVENT_CELEBRATION (festivals, holidays, special occasions)
- PRODUCT_LAUNCH (new products, services, features)
- EDUCATIONAL (how-to, tips, informative content)
- AMBIGUOUS_REQUEST (unclear intent)

Return ONLY valid JSON with:
{
  "intent_classification": "<CATEGORY>",
  "intent_summary": "<one-line human-readable summary>"
}`
          },
          {
            role: 'user',
            content: raw_user_input
          }
        ],
        temperature: 0.3,
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
    
    // Parse the JSON response from the AI
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // If AI didn't return valid JSON, create a fallback
      result = {
        intent_classification: "AMBIGUOUS_REQUEST",
        intent_summary: content.substring(0, 100)
      };
    }

    console.log('Intent Analysis Result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-intent-analyst:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
