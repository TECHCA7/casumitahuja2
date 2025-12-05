import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noticeType, noticeDetails, clientName, assessmentYear, noticeDate } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert Indian tax consultant specializing in drafting professional replies to Income Tax and GST notices. 
    
Your task is to generate a formal, professional reply letter that:
1. Uses proper legal and tax terminology
2. Addresses all points raised in the notice
3. Maintains a respectful and cooperative tone
4. Includes relevant sections of the Income Tax Act or GST Act where applicable
5. Follows standard notice reply format used in India

Format the reply as a formal letter with:
- Date and reference number placeholders
- Proper salutation
- Subject line
- Body with numbered points addressing each concern
- Prayer/request section
- Closing with signature block

Use professional language appropriate for communication with tax authorities.`;

    const userPrompt = `Please draft a professional reply for the following ${noticeType} notice:

Client Name: ${clientName || "Not specified"}
Assessment Year: ${assessmentYear || "Not specified"}
Notice Date: ${noticeDate || "Not specified"}

Notice Details/Content:
${noticeDetails}

Please generate a comprehensive, professional reply addressing all points in the notice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate reply");
    }

    const data = await response.json();
    const generatedReply = data.choices?.[0]?.message?.content;

    if (!generatedReply) {
      throw new Error("No reply generated");
    }

    return new Response(
      JSON.stringify({ reply: generatedReply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-notice-reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate notice reply";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
