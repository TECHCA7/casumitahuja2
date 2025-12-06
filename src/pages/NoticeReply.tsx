import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareReply, Sparkles, Copy, Download, Loader2, Upload, FileText, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function NoticeReply() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState("");
  const [generatedReply, setGeneratedReply] = useState("");
  const [fileName, setFileName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF or Image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 2MB. Try compressing your PDF or Image.",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setSummary("");
    setGeneratedReply("");

    try {
      // 1. Convert file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;
      console.log("File size:", file.size, "Base64 length:", imageBase64.length);

      // 2. Extract Text using OCR
      toast({ title: "Processing", description: "Extracting text from document..." });
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke("ocr-extract", {
        body: {
          imageBase64,
          mimeType: file.type,
        },
      });

      if (ocrError) throw ocrError;
      if (ocrData?.error) throw new Error(ocrData.error);
      
      const extractedText = ocrData?.text;

      if (!extractedText) {
        throw new Error("Could not extract text from the document.");
      }

      // 3. Generate Summary and Reply
      toast({ title: "Analyzing", description: "Generating summary and draft reply..." });
      const { data: replyData, error: replyError } = await supabase.functions.invoke("generate-notice-reply", {
        body: { extractedText },
      });

      if (replyError) throw replyError;
      if (replyData?.error) throw new Error(replyData.error);

      if (replyData) {
        setSummary(replyData.summary || "No summary generated.");
        setGeneratedReply(replyData.reply || "No reply generated.");
        toast({
          title: "Success",
          description: "Notice analyzed and reply generated successfully",
        });
      }

    } catch (error: any) {
      console.error("Error processing notice:", error);
      
      let errorMessage = error.message || "Failed to process the notice. Please try again.";
      if (errorMessage.includes("Failed to send request")) {
        errorMessage = "Connection Error: The backend function is not reachable. If you are testing locally, make sure to deploy the functions using 'npx supabase functions deploy' or run them locally.";
      }

      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedReply);
    toast({
      title: "Copied",
      description: "Reply copied to clipboard",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedReply], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notice-reply-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSummary("");
    setGeneratedReply("");
    setFileName("");
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notice Reply Generator</h1>
          <p className="text-muted-foreground mt-1">
            Upload a notice (PDF/Image) to automatically generate a summary and draft reply
          </p>
        </div>
        {(summary || generatedReply) && (
          <Button variant="outline" onClick={handleReset}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        )}
      </div>

      {!summary && !generatedReply && !isProcessing ? (
        <Card className="flex-1 flex flex-col items-center justify-center border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Upload Notice Document</h3>
              <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                Drag and drop your PDF or Image file here, or click to browse.
                We support Income Tax and GST notices.
              </p>
            </div>
            <Button size="lg" className="mt-4" onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-4 h-4 mr-2" />
              Select File
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      ) : isProcessing ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h3 className="text-xl font-semibold">Analyzing Notice...</h3>
            <p className="text-muted-foreground">
              Extracting text and generating professional reply. This may take a moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Left Side: Summary */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-500" />
                Notice Summary
              </CardTitle>
              <CardDescription>
                Key details extracted from the uploaded document
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <Textarea 
                className="h-full min-h-[400px] resize-none border-0 focus-visible:ring-0 p-6 rounded-none"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary will appear here..."
              />
            </CardContent>
          </Card>

          {/* Right Side: Reply */}
          <Card className="flex flex-col min-h-0 border-primary/20">
            <CardHeader className="pb-3 bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Draft Reply
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <CardDescription>
                AI-generated professional reply draft
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <Textarea 
                className="h-full min-h-[400px] resize-none border-0 focus-visible:ring-0 p-6 rounded-none font-mono text-sm"
                value={generatedReply}
                onChange={(e) => setGeneratedReply(e.target.value)}
                placeholder="Generated reply will appear here..."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
