import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, FileText, Download, Eye, User, Building2, Plus, Loader2, Upload, Trash2, File, FileSpreadsheet, MoreVertical, Pencil, FolderUp, ChevronLeft } from "lucide-react";
import { useClients, Client } from "@/hooks/useClients";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { exportClientsToExcel, downloadClientTemplate, parseClientsFromExcel, parseMultipleDocumentFiles, ParsedDocumentFile } from "@/lib/excelUtils";

export default function ClientDocuments() {
  const { clients, loading, addClient, updateClient, deleteClient, bulkAddClients } = useClients();
  const { isClient, clientId, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadType, setUploadType] = useState<string>("ITR");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const bulkDocInputRef = useRef<HTMLInputElement>(null);
  const [newClient, setNewClient] = useState({
    name: "", pan: "", email: "", mobile: "", client_type: "Individual", assessment_year: "2024-25", address: "", client_code: "",
  });
  
  // Edit/Delete state
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "", pan: "", email: "", mobile: "", client_type: "Individual", assessment_year: "2024-25", address: "", client_code: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk document import state
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportPreview, setBulkImportPreview] = useState<{
    parsed: ParsedDocumentFile[];
    unparsed: File[];
    clientMap: Map<string, Client>;
  } | null>(null);

  // Auto-select client for client users
  useEffect(() => {
    if (isClient && clientId && clients.length > 0 && !selectedClient) {
      const myClient = clients.find(c => c.id === clientId);
      if (myClient) {
        setSelectedClient(myClient);
      }
    }
  }, [isClient, clientId, clients, selectedClient]);

  const { documents, uploading, uploadDocument, deleteDocument, downloadDocument, viewDocument, loading: docsLoading, bulkUploadForClient, refetch } = useClientDocuments(selectedClient?.id);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.pan?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.client_code?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddClient = async () => {
    if (!newClient.name) return;
    setIsAddingClient(true);
    await addClient(newClient as any);
    setNewClient({ name: "", pan: "", email: "", mobile: "", client_type: "Individual", assessment_year: "2024-25", address: "", client_code: "" });
    setIsAddingClient(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedClient) {
      await uploadDocument(file, uploadType);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportClients = () => {
    if (clients.length === 0) {
      toast({ title: "No Data", description: "No clients to export", variant: "destructive" });
      return;
    }
    exportClientsToExcel(clients, "clients");
    toast({ title: "Exported", description: `Exported ${clients.length} clients to Excel` });
  };

  const handleImportClients = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const parsedClients = await parseClientsFromExcel(file);
      
      if (parsedClients.length === 0) {
        toast({ title: "No Data", description: "No valid clients found in the file", variant: "destructive" });
        return;
      }

      const { success, failed } = await bulkAddClients(parsedClients);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${success} clients${failed > 0 ? `, ${failed} failed` : ""}`,
        variant: failed > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  // Bulk document import handlers
  const handleBulkDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { parsed, unparsed } = parseMultipleDocumentFiles(files);
    
    // Build client code -> client map
    const clientMap = new Map<string, Client>();
    clients.forEach(client => {
      if (client.client_code) {
        clientMap.set(client.client_code, client);
      }
    });

    setBulkImportPreview({ parsed, unparsed, clientMap });
    if (bulkDocInputRef.current) bulkDocInputRef.current.value = "";
  };

  const handleBulkDocumentImport = async () => {
    if (!bulkImportPreview) return;
    
    setIsBulkImporting(true);
    let totalSuccess = 0;
    let totalFailed = 0;
    const missingClients: string[] = [];

    // Group files by client
    const filesByClient = new Map<string, { file: File; documentType: string; metadata?: string }[]>();
    
    for (const parsed of bulkImportPreview.parsed) {
      const client = bulkImportPreview.clientMap.get(parsed.clientCode);
      if (!client) {
        missingClients.push(parsed.clientCode);
        totalFailed++;
        continue;
      }
      
      if (!filesByClient.has(client.id)) {
        filesByClient.set(client.id, []);
      }
      
      const metadata = parsed.versionLabel 
        ? `AY ${parsed.assessmentYear} - ${parsed.versionLabel}`
        : undefined;
      
      filesByClient.get(client.id)!.push({
        file: parsed.file,
        documentType: parsed.documentType,
        metadata,
      });
    }

    // Upload files for each client
    for (const [clientId, files] of filesByClient) {
      const result = await bulkUploadForClient(clientId, files);
      totalSuccess += result.success;
      totalFailed += result.failed;
    }

    // Show results
    let message = `Uploaded ${totalSuccess} documents`;
    if (totalFailed > 0) {
      message += `, ${totalFailed} failed`;
    }
    if (missingClients.length > 0) {
      message += `. Missing client codes: ${[...new Set(missingClients)].join(", ")}`;
    }
    
    toast({
      title: "Bulk Import Complete",
      description: message,
      variant: totalFailed > 0 ? "destructive" : "default",
    });

    setBulkImportPreview(null);
    setIsBulkImporting(false);
    refetch();
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setEditFormData({
      name: client.name,
      pan: client.pan || "",
      email: client.email || "",
      mobile: client.mobile || "",
      client_type: client.client_type,
      assessment_year: client.assessment_year || "2024-25",
      address: client.address || "",
      client_code: client.client_code || "",
    });
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editFormData.name) return;
    setIsUpdating(true);
    const success = await updateClient(editingClient.id, editFormData);
    if (success) {
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient({ ...selectedClient, ...editFormData });
      }
      setEditingClient(null);
    }
    setIsUpdating(false);
  };

  const handleDeleteClient = async () => {
    if (!deleteConfirmClient) return;
    setIsDeleting(true);
    const success = await deleteClient(deleteConfirmClient.id);
    if (success) {
      if (selectedClient?.id === deleteConfirmClient.id) {
        setSelectedClient(null);
      }
    }
    setIsDeleting(false);
    setDeleteConfirmClient(null);
  };

  const getDocIcon = (type: string) => {
    if (type === "ITR") return "bg-red-500/10 text-red-600";
    if (type === "Computation") return "bg-blue-500/10 text-blue-600";
    return "bg-gray-500/10 text-gray-600";
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Client users see simplified view
  if (isClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View and download your ITR and tax documents</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              {selectedClient?.name || "Your Documents"}
            </CardTitle>
            {selectedClient && (
              <CardDescription className="text-xs sm:text-sm">
                PAN: {selectedClient.pan || "N/A"} | {selectedClient.client_type}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {docsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getDocIcon(doc.document_type)}`}>
                            <File className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.document_type}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.file_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDocument(doc)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No documents available yet</p>
                <p className="text-sm">Your tax documents will appear here once uploaded by the firm</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Staff/Admin view (existing full functionality)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Client Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View and manage ITR and computation documents</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportClients}
            className="hidden"
          />
          <input
            ref={bulkDocInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={handleBulkDocumentSelect}
            className="hidden"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isImporting} className="text-xs sm:text-sm">
                <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isImporting ? "Importing..." : "Excel"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportClients}>
                <Download className="w-4 h-4 mr-2" />
                Export Clients
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={downloadClientTemplate}>
                <FileText className="w-4 h-4 mr-2" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => bulkDocInputRef.current?.click()} className="text-xs sm:text-sm">
            <FolderUp className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Bulk Import</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
            <Button size="sm" className="text-xs sm:text-sm"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Client</span></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" />
                </div>
                <div className="space-y-2">
                  <Label>Client Code</Label>
                  <Input value={newClient.client_code} onChange={(e) => setNewClient({ ...newClient, client_code: e.target.value })} placeholder="Unique code (e.g., 1, 2)" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input value={newClient.pan} onChange={(e) => setNewClient({ ...newClient, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newClient.client_type} onValueChange={(v) => setNewClient({ ...newClient, client_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Company">Company</SelectItem>
                      <SelectItem value="Firm">Firm</SelectItem>
                      <SelectItem value="HUF">HUF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input value={newClient.mobile} onChange={(e) => setNewClient({ ...newClient, mobile: e.target.value })} placeholder="9876543210" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assessment Year</Label>
                <Select value={newClient.assessment_year} onValueChange={(v) => setNewClient({ ...newClient, assessment_year: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-26">2025-26</SelectItem>
                    <SelectItem value="2024-25">2024-25</SelectItem>
                    <SelectItem value="2023-24">2023-24</SelectItem>
                    <SelectItem value="2022-23">2022-23</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddClient} disabled={!newClient.name || isAddingClient} className="w-full">
                {isAddingClient ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className={`lg:col-span-1 space-y-4 ${selectedClient ? 'hidden lg:block' : ''}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, PAN, email, or code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${selectedClient?.id === client.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setSelectedClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${client.client_type === "Individual" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"}`}>
                      {client.client_type === "Individual" ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{client.name}</p>
                        {client.client_code && (
                          <Badge variant="outline" className="text-xs shrink-0">#{client.client_code}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{client.pan || "No PAN"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">AY {client.assessment_year}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No clients found</p>
              </div>
            )}
          </div>
        </div>

        <div className={`lg:col-span-2 ${!selectedClient ? 'hidden lg:block' : ''}`}>
          {selectedClient ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2" 
                      onClick={() => setSelectedClient(null)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg sm:text-xl">{selectedClient.name}</CardTitle>
                        {selectedClient.client_code && (
                          <Badge variant="outline" className="text-xs">#{selectedClient.client_code}</Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs sm:text-sm">PAN: {selectedClient.pan || "N/A"} | {selectedClient.client_type}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="hidden sm:inline-flex">{selectedClient.assessment_year}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(selectedClient)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmClient(selectedClient)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{selectedClient.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="text-sm font-medium">{selectedClient.mobile || "N/A"}</p>
                  </div>
                </div>

                {/* Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Documents</h3>
                    <div className="flex items-center gap-2">
                      <Select value={uploadType} onValueChange={setUploadType}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ITR">ITR</SelectItem>
                          <SelectItem value="Computation">Computation</SelectItem>
                          <SelectItem value="Form 16">Form 16</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm">
                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload
                      </Button>
                    </div>
                  </div>

                  {docsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getDocIcon(doc.document_type)}`}>
                                  <File className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{doc.document_type}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.file_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => viewDocument(doc)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteDocument(doc)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-lg">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No documents uploaded yet</p>
                      <p className="text-sm">Upload ITR, Computation, or other documents</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Select a client</p>
                <p className="text-sm">Choose a client from the list to view their documents</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bulk Import Preview Dialog */}
      <Dialog open={!!bulkImportPreview} onOpenChange={(open) => !open && setBulkImportPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Document Import Preview</DialogTitle>
            <DialogDescription>
              Review the files to be imported. Files are matched to clients by their client code.
            </DialogDescription>
          </DialogHeader>
          {bulkImportPreview && (
            <div className="space-y-4 pt-4">
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-1">File naming convention:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><code>ITRV_[code]</code> - ITR for client code (e.g., ITRV_9.pdf)</li>
                  <li><code>COMPUTATION_[code]_[year]_[ver]</code> - Computation (e.g., COMPUTATION_9_2025_1.pdf)</li>
                  <li>Version 1 = Original, 2+ = Revised</li>
                </ul>
              </div>

              {bulkImportPreview.parsed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-green-600">Matched Files ({bulkImportPreview.parsed.length})</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {bulkImportPreview.parsed.map((item, idx) => {
                      const client = bulkImportPreview.clientMap.get(item.clientCode);
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.documentType === "ITR" ? "destructive" : "default"} className="text-xs">
                              {item.documentType}
                            </Badge>
                            <span className="truncate max-w-[200px]">{item.file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.versionLabel && (
                              <Badge variant="outline" className="text-xs">{item.versionLabel}</Badge>
                            )}
                            {client ? (
                              <span className="text-green-600 text-xs">→ {client.name}</span>
                            ) : (
                              <span className="text-red-600 text-xs">Client #{item.clientCode} not found</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bulkImportPreview.unparsed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-amber-600">Unrecognized Files ({bulkImportPreview.unparsed.length})</h4>
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {bulkImportPreview.unparsed.map((file, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportPreview(null)}>Cancel</Button>
            <Button 
              onClick={handleBulkDocumentImport} 
              disabled={isBulkImporting || !bulkImportPreview?.parsed.length}
            >
              {isBulkImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import {bulkImportPreview?.parsed.length || 0} Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={editFormData.name} 
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} 
                  placeholder="Client name" 
                />
              </div>
              <div className="space-y-2">
                <Label>Client Code</Label>
                <Input 
                  value={editFormData.client_code} 
                  onChange={(e) => setEditFormData({ ...editFormData, client_code: e.target.value })} 
                  placeholder="Unique code" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input 
                  value={editFormData.pan} 
                  onChange={(e) => setEditFormData({ ...editFormData, pan: e.target.value.toUpperCase() })} 
                  placeholder="ABCDE1234F" 
                  maxLength={10} 
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editFormData.client_type} onValueChange={(v) => setEditFormData({ ...editFormData, client_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Firm">Firm</SelectItem>
                    <SelectItem value="HUF">HUF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={editFormData.email} 
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} 
                  placeholder="email@example.com" 
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input 
                  value={editFormData.mobile} 
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })} 
                  placeholder="9876543210" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assessment Year</Label>
              <Select value={editFormData.assessment_year} onValueChange={(v) => setEditFormData({ ...editFormData, assessment_year: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                  <SelectItem value="2022-23">2022-23</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={editFormData.address} 
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} 
                placeholder="Client address" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>Cancel</Button>
            <Button onClick={handleUpdateClient} disabled={!editFormData.name || isUpdating}>
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmClient} onOpenChange={(open) => !open && setDeleteConfirmClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteConfirmClient?.name}</span>? 
              This will also delete all associated documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
