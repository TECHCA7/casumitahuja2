import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Merge,
  Split,
  Unlock,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Trash2,
  GripVertical,
  Loader2,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PDFTools() {
  const [mergeFiles, setMergeFiles] = useState<UploadedFile[]>([]);
  const [splitFile, setSplitFile] = useState<UploadedFile | null>(null);
  const [unlockFile, setUnlockFile] = useState<UploadedFile | null>(null);
  const [excelFile, setExcelFile] = useState<UploadedFile | null>(null);
  const [wordFile, setWordFile] = useState<UploadedFile | null>(null);
  
  const [splitRange, setSplitRange] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const splitInputRef = useRef<HTMLInputElement>(null);
  const unlockInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (files: UploadedFile[] | UploadedFile | null) => void,
    isMultiple: boolean = false
  ) => {
    const files = e.target.files;
    if (!files) return;

    if (isMultiple) {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        file,
      }));
      setter((prev: any) => [...(prev || []), ...newFiles]);
    } else {
      const file = files[0];
      setter({
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        file,
      });
    }
  };

  const removeFile = (id: string, setter: any, isArray: boolean = true) => {
    if (isArray) {
      setter((prev: any[]) => prev.filter((f) => f.id !== id));
    } else {
      setter(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApiCall = async (
    endpoint: string,
    formData: FormData,
    successMessage: string,
    downloadName: string
  ) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const blob = await response.blob();
      downloadBlob(blob, downloadName);

      toast({
        title: "Success",
        description: successMessage,
      });
      return true;
    } catch (error: any) {
      console.error("API Error:", error);
      toast({
        title: "Error",
        description: error.message || "Operation failed",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) {
      toast({
        title: "Error",
        description: "Please upload at least 2 PDF files to merge",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    mergeFiles.forEach((f) => formData.append("files", f.file));

    const success = await handleApiCall(
      "/api/pdf/merge",
      formData,
      `Merged ${mergeFiles.length} PDFs successfully`,
      `merged-${new Date().toISOString().split("T")[0]}.pdf`
    );

    if (success) {
      setMergeFiles([]);
      if (mergeInputRef.current) mergeInputRef.current.value = "";
    }
  };

  const handleSplit = async () => {
    if (!splitFile) return;
    if (!splitRange.trim()) {
      toast({
        title: "Error",
        description: "Please enter a page range",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", splitFile.file);
    formData.append("pages", splitRange);

    await handleApiCall(
      "/api/pdf/split",
      formData,
      "PDF split successfully",
      "split-result.zip" // API might return zip or pdf, browser handles extension usually but zip is safe default for multiple
    );
  };

  const handleUnlock = async () => {
    if (!unlockFile) return;
    
    const formData = new FormData();
    formData.append("file", unlockFile.file);
    formData.append("password", unlockPassword);

    await handleApiCall(
      "/api/pdf/unlock",
      formData,
      "PDF unlocked successfully",
      `unlocked-${unlockFile.name}`
    );
  };

  const handleToExcel = async () => {
    if (!excelFile) return;

    const formData = new FormData();
    formData.append("file", excelFile.file);

    await handleApiCall(
      "/api/pdf/to-excel",
      formData,
      "Converted to Excel successfully",
      `${excelFile.name.replace(".pdf", "")}.xlsx`
    );
  };

  const handleToWord = async () => {
    if (!wordFile) return;

    const formData = new FormData();
    formData.append("file", wordFile.file);

    await handleApiCall(
      "/api/pdf/to-word",
      formData,
      "Converted to Word successfully",
      `${wordFile.name.replace(".pdf", "")}.docx`
    );
  };

  const FileUploader = ({ 
    file, 
    setFile, 
    inputRef, 
    id, 
    accept = ".pdf",
    label = "Select File"
  }: { 
    file: UploadedFile | null, 
    setFile: any, 
    inputRef: any, 
    id: string,
    accept?: string,
    label?: string
  }) => (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Upload a file to process
        </p>
        <Input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          id={id}
          onChange={(e) => handleFileUpload(e, setFile)}
        />
        <Button asChild variant="outline">
          <label htmlFor={id} className="cursor-pointer">
            {label}
          </label>
        </Button>
      </div>

      {file && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <FileText className="w-4 h-4 text-red-500" />
          <span className="flex-1 text-sm truncate">{file.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">PDF Tools</h1>
        <p className="text-muted-foreground mt-1">
          Powered by Python Backend - Merge, split, convert and more
        </p>
      </div>

      <Tabs defaultValue="merge" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
          <TabsTrigger value="merge" className="flex items-center gap-2">
            <Merge className="w-4 h-4" />
            <span className="hidden sm:inline">Merge</span>
          </TabsTrigger>
          <TabsTrigger value="split" className="flex items-center gap-2">
            <Split className="w-4 h-4" />
            <span className="hidden sm:inline">Split</span>
          </TabsTrigger>
          <TabsTrigger value="unlock" className="flex items-center gap-2">
            <Unlock className="w-4 h-4" />
            <span className="hidden sm:inline">Unlock</span>
          </TabsTrigger>
          <TabsTrigger value="excel" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">To Excel</span>
          </TabsTrigger>
          <TabsTrigger value="word" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">To Word</span>
          </TabsTrigger>
        </TabsList>

        {/* Merge PDFs */}
        <TabsContent value="merge">
          <Card>
            <CardHeader>
              <CardTitle>Merge PDFs</CardTitle>
              <CardDescription>Combine multiple PDF files into a single document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop PDF files here, or click to browse
                </p>
                <Input
                  ref={mergeInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  id="merge-upload"
                  onChange={(e) => handleFileUpload(e, setMergeFiles, true)}
                />
                <Button asChild variant="outline">
                  <label htmlFor="merge-upload" className="cursor-pointer">
                    Select Files
                  </label>
                </Button>
              </div>

              {mergeFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Files to merge ({mergeFiles.length})</p>
                  {mergeFiles.map((file, index) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">{index + 1}.</span>
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(file.id, setMergeFiles)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleMerge}
                className="w-full"
                size="lg"
                disabled={isProcessing || mergeFiles.length < 2}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Merge className="w-4 h-4 mr-2" />
                    Merge PDFs
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Split PDF */}
        <TabsContent value="split">
          <Card>
            <CardHeader>
              <CardTitle>Split PDF</CardTitle>
              <CardDescription>Extract specific pages or split a PDF into multiple files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader file={splitFile} setFile={setSplitFile} inputRef={splitInputRef} id="split-upload" />

              <div className="space-y-2">
                <label className="text-sm font-medium">Page Range</label>
                <Input
                  placeholder="e.g., 1-5, 8, 10-12"
                  value={splitRange}
                  onChange={(e) => setSplitRange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter page numbers or ranges separated by commas
                </p>
              </div>

              <Button
                onClick={handleSplit}
                className="w-full"
                size="lg"
                disabled={isProcessing || !splitFile}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  <>
                    <Split className="w-4 h-4 mr-2" />
                    Split PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unlock PDF */}
        <TabsContent value="unlock">
          <Card>
            <CardHeader>
              <CardTitle>Unlock PDF</CardTitle>
              <CardDescription>Remove password protection from PDF files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader file={unlockFile} setFile={setUnlockFile} inputRef={unlockInputRef} id="unlock-upload" />

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter PDF password"
                    className="pl-9"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleUnlock}
                className="w-full"
                size="lg"
                disabled={isProcessing || !unlockFile}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF to Excel */}
        <TabsContent value="excel">
          <Card>
            <CardHeader>
              <CardTitle>PDF to Excel</CardTitle>
              <CardDescription>Convert PDF tables to Excel spreadsheets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader file={excelFile} setFile={setExcelFile} inputRef={excelInputRef} id="excel-upload" />

              <Button
                onClick={handleToExcel}
                className="w-full"
                size="lg"
                disabled={isProcessing || !excelFile}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Convert to Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF to Word */}
        <TabsContent value="word">
          <Card>
            <CardHeader>
              <CardTitle>PDF to Word</CardTitle>
              <CardDescription>Convert PDF documents to Word format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader file={wordFile} setFile={setWordFile} inputRef={wordInputRef} id="word-upload" />

              <Button
                onClick={handleToWord}
                className="w-full"
                size="lg"
                disabled={isProcessing || !wordFile}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Convert to Word
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
