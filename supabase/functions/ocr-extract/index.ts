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
    const { imageBase64, mimeType, documentType } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let contentPart;

    if (mimeType === "application/pdf") {
      console.log("Processing PDF file...");
      // For PDFs, we need to use the File API
      const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
      
      // Convert Base64 to Uint8Array
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 1. Initial Resumable Upload Request
      const initResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": bytes.length.toString(),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: { displayName: "uploaded_document.pdf" } }),
      });

      if (!initResponse.ok) {
        const err = await initResponse.text();
        throw new Error(`Failed to initialize PDF upload: ${err}`);
      }

      const uploadUrlHeader = initResponse.headers.get("x-goog-upload-url");
      if (!uploadUrlHeader) {
        throw new Error("Failed to get upload URL for PDF");
      }

      // 2. Upload the actual bytes
      const uploadResponse = await fetch(uploadUrlHeader, {
        method: "POST",
        headers: {
          "Content-Length": bytes.length.toString(),
          "X-Goog-Upload-Offset": "0",
          "X-Goog-Upload-Command": "upload, finalize",
        },
        body: bytes,
      });

      if (!uploadResponse.ok) {
        const err = await uploadResponse.text();
        throw new Error(`Failed to upload PDF bytes: ${err}`);
      }

      const uploadData = await uploadResponse.json();
      const fileUri = uploadData.file.uri;
      console.log("PDF uploaded successfully, URI:", fileUri);

      contentPart = {
        file_data: {
          mime_type: mimeType,
          file_uri: fileUri
        }
      };
    } else {
      // For Images, use inline_data
      contentPart = {
        inline_data: {
          mime_type: mimeType,
          data: imageBase64
        }
      };
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

    // Using Gemini 2.0 Flash Experimental as requested (closest to "2.5")
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt + "\n\n" + userPrompt },
            contentPart
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
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
    // Return 200 with error field so client can read the message easily
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
