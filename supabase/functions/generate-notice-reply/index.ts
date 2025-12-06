import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noticeType, noticeDetails, clientName, assessmentYear, noticeDate, extractedText } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (extractedText) {
      // New Mode: Analyze extracted text
      systemPrompt = `You are an expert Indian tax consultant. 
      Analyze the provided text from an Income Tax or GST notice.
      
      Your task is to:
      1. Extract key details (Client Name, Assessment Year, Notice Date, Section, Demand Amount).
      2. Create a concise summary of what the notice is about.
      3. Draft a professional, formal reply to this notice.

      Return your response in a valid JSON format with the following structure:
      {
        "summary": "A summary of the notice including the key details extracted...",
        "reply": "The formal draft reply letter..."
      }
      
      Do not include any markdown formatting (like \`\`\`json) in your response, just the raw JSON string.`;

      userPrompt = `Here is the text extracted from the notice:
      
      ${extractedText}
      
      Please analyze this and generate the summary and reply.`;
    } else {
      // Legacy Mode: Manual details
      systemPrompt = `You are an expert Indian tax consultant specializing in drafting professional replies to Income Tax and GST notices. 
    
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

      userPrompt = `Please draft a professional reply for the following ${noticeType} notice:

Client Name: ${clientName || "Not specified"}
Assessment Year: ${assessmentYear || "Not specified"}
Notice Date: ${noticeDate || "Not specified"}

Notice Details/Content:
${noticeDetails}

Please generate a comprehensive, professional reply addressing all points in the notice.`;
    }

    // Using Gemini 2.0 Flash Experimental as requested (closest to "2.5")
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt + "\n\n" + userPrompt }
          ]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      throw new Error("No reply generated");
    }

    let result;
    if (extractedText) {
      try {
        // Try to parse JSON, handling potential markdown code blocks
        const cleanContent = generatedContent.replace(/```json\n?|```/g, "").trim();
        result = JSON.parse(cleanContent);
      } catch (e) {
        // Fallback if JSON parsing fails
        console.error("JSON Parse Error", e);
        result = {
          summary: "Could not parse summary from AI response.",
          reply: generatedContent
        };
      }
    } else {
      result = { reply: generatedContent };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-notice-reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate notice reply";
    // Return 200 with error field so client can read the message easily
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
