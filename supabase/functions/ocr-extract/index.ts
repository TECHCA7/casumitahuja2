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
    const { imageBase64, mimeType, documentType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert OCR assistant specializing in Indian financial and identity documents. 
Extract ALL text from the provided image accurately, maintaining the original structure and formatting where possible.

For specific document types:
- PAN Card: Extract Name, Father's Name, Date of Birth, PAN Number
- Aadhaar Card: Extract Name, DOB, Gender, Aadhaar Number, Address
- Form 16: Extract Employee details, TAN, TDS amounts, Salary breakup
- Bank Statement: Extract Account details, Transaction entries, Balances
- Invoice: Extract Invoice number, Date, Items, Amounts, GST details
- ITR Acknowledgement: Extract Name, PAN, Assessment Year, Filing Date, Acknowledgement Number

Provide the extracted text in a clean, structured format. If it's a known document type, organize the data with clear labels.`;

    const userPrompt = documentType 
      ? `Extract all text from this ${documentType}. Provide structured output with labeled fields.`
      : `Extract all text from this document image. Identify the document type if possible and structure the output accordingly.`;

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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
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
      throw new Error("Failed to process image");
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText) {
      throw new Error("No text extracted from image");
    }

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ocr-extract:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to extract text";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
