// Edge runtime types

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateContentRequest {
  needFor: string;
  brandProfile: {
    name: string;
    color: string;
    logo?: string;
    voice?: string;
    mission?: string;
    tagline?: string;
    industry?: string;
    description?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { needFor, brandProfile }: GenerateContentRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Step 1: Analyzing creative goal...');
    
    // Step 1: Intent Gateway - Determine if it's product_ad or occasion_greeting
    const intentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an intent classification expert. Analyze the user\'s request and determine if it\'s primarily a "product_ad" (promoting/selling a product/service) or "occasion_greeting" (holiday/event greeting without direct sales pitch). Respond with ONLY one word: either "product_ad" or "occasion_greeting".'
          },
          {
            role: 'user',
            content: `User request: "${needFor}"\nBrand: ${brandProfile.name}\n\nClassify this as product_ad or occasion_greeting:`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!intentResponse.ok) {
      throw new Error(`Intent analysis failed: ${intentResponse.statusText}`);
    }

    const intentData = await intentResponse.json();
    const creativeGoal = intentData.choices[0].message.content.trim().toLowerCase();
    console.log('Creative goal determined:', creativeGoal);

    console.log('Step 2: Generating master prompt with AI Art Director...');
    
    // Step 2: AI Art Director - Generate detailed prompt based on intent
    const promptTemplate = `You are "Planner AI Version X," an advanced AI art director for brand marketing content creation.

## Your Task
Transform the user's request into a detailed, structured prompt for an image generation AI (Gemini 2.5 Flash Image).

## Creative Goal: ${creativeGoal}

${creativeGoal === 'product_ad' ? `
### Product-First Hierarchy (Active)
- **Hero**: The product/service is the star
- **Atmosphere**: Occasion/theme sets the mood
- **CTA**: Extract specific offer details (primary offer, conditions, fine print)
` : `
### Occasion-First Hierarchy (Active)
- **Hero**: The occasion/event is the star
- **Atmosphere**: Brand subtly integrated
- **Brand Integration**: Logo and name elegantly placed in festive context
`}

## Brand Profile
- Name: ${brandProfile.name}
- Primary Color: ${brandProfile.color}
- Voice: ${brandProfile.voice || 'Professional'}
- Industry: ${brandProfile.industry || 'General'}
- Tagline: ${brandProfile.tagline || ''}
- Mission: ${brandProfile.mission || ''}

## User Request
"${needFor}"

## Output Format
Generate a detailed prompt following this structure:

1. **Aesthetic & Style**: Describe the overall visual style
2. **Hero Focus**: What should dominate the composition (70% of space)
3. **Background/Atmosphere**: Supporting visual elements
4. **Brand Integration**: Logo placement and brand colors
5. **Typography**: Text style and CTA placement
6. **Mood**: Overall emotional tone
7. **Technical Specs**: Platform optimization (Instagram post format, 4:5 ratio)

Create a comprehensive, detailed prompt that the image generation AI can follow precisely.`;

    const plannerResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI art director specializing in brand marketing content. Generate detailed, precise prompts for image generation that incorporate brand identity, marketing strategy, and visual design principles.'
          },
          {
            role: 'user',
            content: promptTemplate
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!plannerResponse.ok) {
      throw new Error(`Planner AI failed: ${plannerResponse.statusText}`);
    }

    const plannerData = await plannerResponse.json();
    const masterPrompt = plannerData.choices[0].message.content;
    console.log('Master prompt generated');

    console.log('Step 3: Generating image with Gemini 2.5 Flash Image...');
    
    // Step 3: Image Generation with Nano Banana
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
            content: masterPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image generation error:', errorText);
      throw new Error(`Image generation failed: ${imageResponse.statusText}`);
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    console.log('Content generated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        creativeGoal,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-content:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
