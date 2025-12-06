import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanText, Upload, Copy, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function OCR() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload an image (JPG, PNG, WebP) or PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setExtractedText("");

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an image or PDF to extract text from",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setExtractedText("");

    try {
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(selectedFile);
      const imageBase64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: {
          imageBase64,
          mimeType: selectedFile.type,
          documentType: documentType || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.text) {
        setExtractedText(data.text);
        toast({
          title: "Text Extracted",
          description: "Document text has been extracted successfully",
        });
      }
    } catch (error: any) {
      console.error("OCR error:", error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(extractedText);
    toast({ title: "Copied", description: "Text copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr-extracted-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Document OCR</h1>
        <p className="text-muted-foreground mt-1">
          Extract text from documents and images using AI-powered OCR
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Upload PAN card, Aadhaar, Form 16, bank statements, or any document to extract text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type (Optional)</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="PAN Card">PAN Card</SelectItem>
                  <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                  <SelectItem value="Form 16">Form 16</SelectItem>
                  <SelectItem value="Bank Statement">Bank Statement</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="ITR Acknowledgement">ITR Acknowledgement</SelectItem>
                  <SelectItem value="GST Certificate">GST Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="space-y-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={clearFile}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ScanText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground mb-4">
                    Drag and drop an image or PDF, or click to browse
                  </p>
                </>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                id="ocr-upload"
                onChange={handleFileSelect}
              />
              {!selectedFile && (
                <Button asChild variant="outline">
                  <label htmlFor="ocr-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Select File
                  </label>
                </Button>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleExtract}
              disabled={isProcessing || !selectedFile}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Text...
                </>
              ) : (
                <>
                  <ScanText className="w-4 h-4 mr-2" />
                  Extract Text
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extracted Text</span>
              {extractedText && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>AI-extracted text from your document</CardDescription>
          </CardHeader>
          <CardContent>
            {extractedText ? (
              <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
                  {extractedText}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <ScanText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-center">
                  Upload a document and click "Extract Text" to see the results here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
