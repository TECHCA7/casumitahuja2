import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareReply, Sparkles, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function NoticeReply() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReply, setGeneratedReply] = useState("");
  
  const [formData, setFormData] = useState({
    noticeType: "",
    clientName: "",
    assessmentYear: "",
    noticeDate: "",
    noticeDetails: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.noticeType || !formData.noticeDetails.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select notice type and enter notice details",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedReply("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-notice-reply", {
        body: formData,
      });

      if (error) throw error;

      if (data?.reply) {
        setGeneratedReply(data.reply);
        toast({
          title: "Reply Generated",
          description: "Your notice reply draft has been generated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error generating reply:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate notice reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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
    a.download = `notice-reply-${formData.noticeType}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notice Reply Generator</h1>
        <p className="text-muted-foreground mt-1">
          Generate professional notice reply drafts for Income Tax and GST notices
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareReply className="h-5 w-5" />
              Notice Details
            </CardTitle>
            <CardDescription>
              Enter the notice information to generate a professional reply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="noticeType">Notice Type *</Label>
              <Select
                value={formData.noticeType}
                onValueChange={(value) => handleInputChange("noticeType", value)}
              >
                <SelectTrigger id="noticeType">
                  <SelectValue placeholder="Select notice type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income Tax - Section 143(1)">Income Tax - Section 143(1)</SelectItem>
                  <SelectItem value="Income Tax - Section 143(2)">Income Tax - Section 143(2)</SelectItem>
                  <SelectItem value="Income Tax - Section 148">Income Tax - Section 148</SelectItem>
                  <SelectItem value="Income Tax - Section 154">Income Tax - Section 154</SelectItem>
                  <SelectItem value="Income Tax - Section 245">Income Tax - Section 245</SelectItem>
                  <SelectItem value="Income Tax - Section 142(1)">Income Tax - Section 142(1)</SelectItem>
                  <SelectItem value="GST - ASMT-10">GST - ASMT-10</SelectItem>
                  <SelectItem value="GST - DRC-01">GST - DRC-01</SelectItem>
                  <SelectItem value="GST - DRC-01A">GST - DRC-01A</SelectItem>
                  <SelectItem value="GST - REG-17">GST - REG-17</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client/Assessee Name</Label>
              <Input
                id="clientName"
                placeholder="Enter client name"
                value={formData.clientName}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assessmentYear">Assessment Year</Label>
                <Input
                  id="assessmentYear"
                  placeholder="e.g., 2023-24"
                  value={formData.assessmentYear}
                  onChange={(e) => handleInputChange("assessmentYear", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noticeDate">Notice Date</Label>
                <Input
                  id="noticeDate"
                  type="date"
                  value={formData.noticeDate}
                  onChange={(e) => handleInputChange("noticeDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="noticeDetails">Notice Details/Content *</Label>
              <Textarea
                id="noticeDetails"
                placeholder="Paste the notice content or describe the key points raised in the notice..."
                className="min-h-[200px]"
                value={formData.noticeDetails}
                onChange={(e) => handleInputChange("noticeDetails", e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Reply...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Reply
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Reply</span>
              {generatedReply && (
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
            <CardDescription>
              AI-generated professional reply draft
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedReply ? (
              <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono text-foreground">
                  {generatedReply}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <MessageSquareReply className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-center">
                  Fill in the notice details and click "Generate Reply" to create a professional draft response.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
