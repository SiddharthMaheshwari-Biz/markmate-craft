import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Agent 4: Master Synthesis (The Creative Director)
 * Model: gemini-2.5-pro
 * Role: Synthesize all inputs into final client-ready blueprint
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_2_output, agent_3_outputs, user_settings } = await req.json();

    const systemPrompt = `You are the Master Synthesis Agent - the Creative Director.

Your mandate:
1. Review all strategic and creative drafts
2. Select the STRONGEST headline, CLEAREST body copy, most IMPACTFUL CTA
3. Refine and polish into a single "Master" version
4. Engineer a HIGHLY DETAILED image prompt for gemini-2.5-flash-image
5. Build complete layout instructions including contact strip if enabled

Return ONLY valid JSON with this EXACT structure:
{
  "campaignTitle": "...",
  "strategicSummary": {
    "intent": "...",
    "goal": "...",
    "targetAudience": "..."
  },
  "brandIdentity": {
    "personality": "...",
    "colorPalette": {
      "primary": "#...",
      "secondary": "#...",
      "accent": "#..."
    },
    "typography": "..."
  },
  "masterCopywriting": {
    "headline": "...",
    "body": "...",
    "callToAction": "..."
  },
  "distributionAssets": {
    "facebook_instagram_post": {
      "copy": "...",
      "format_suggestion": "..."
    },
    "whatsapp_status": {
      "copy": "...",
      "format_suggestion": "..."
    }
  },
  "masterVisuals": {
    "creative_direction": "...",
    "master_image_prompt_for_gemini_2_5_flash_image": "Ultra-realistic... (DETAILED prompt)",
    "layoutInstructions": {
      "contact_strip": {
        "enabled": true/false,
        "background_color": "#...",
        "text_color": "#...",
        "content_placeholders": ["...", "..."],
        "font_style": "..."
      },
      "logo_placement": "...",
      "main_text_placement": {
        "headline_position": "...",
        "body_position": "..."
      }
    }
  }
}`;

    const userPrompt = `
STRATEGIC BRIEF:
${JSON.stringify(agent_2_output, null, 2)}

CREATIVE DRAFTS:
${JSON.stringify(agent_3_outputs, null, 2)}

USER SETTINGS:
${JSON.stringify(user_settings, null, 2)}

Create the complete Agency X Blueprint. Make the image prompt EXTREMELY detailed and cinematic.`;

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
      console.error('Failed to parse synthesis response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Master Blueprint Created');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in agent-master-synthesis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
