import * as XLSX from "xlsx";
import type { Client } from "@/hooks/useClients";

export interface ClientExportRow {
  "Client Code": string;
  Name: string;
  PAN: string;
  Email: string;
  Mobile: string;
  Type: string;
  "Assessment Year": string;
  Address: string;
}

export function exportClientsToExcel(clients: Client[], filename = "clients") {
  const exportData: ClientExportRow[] = clients.map((client) => ({
    "Client Code": client.client_code || "",
    Name: client.name,
    PAN: client.pan || "",
    Email: client.email || "",
    Mobile: client.mobile || "",
    Type: client.client_type,
    "Assessment Year": client.assessment_year || "",
    Address: client.address || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 12 }, // Client Code
    { wch: 25 }, // Name
    { wch: 12 }, // PAN
    { wch: 25 }, // Email
    { wch: 12 }, // Mobile
    { wch: 12 }, // Type
    { wch: 15 }, // Assessment Year
    { wch: 35 }, // Address
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function downloadClientTemplate() {
  const templateData: ClientExportRow[] = [
    {
      "Client Code": "1",
      Name: "John Doe",
      PAN: "ABCDE1234F",
      Email: "john@example.com",
      Mobile: "9876543210",
      Type: "Individual",
      "Assessment Year": "2024-25",
      Address: "123 Main St, City",
    },
    {
      "Client Code": "2",
      Name: "ABC Company Pvt Ltd",
      PAN: "AABCA1234B",
      Email: "info@abccompany.com",
      Mobile: "9123456789",
      Type: "Company",
      "Assessment Year": "2024-25",
      Address: "456 Business Park, City",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

  XLSX.writeFile(workbook, "client-import-template.xlsx");
}

export interface ParsedClient {
  name: string;
  pan: string | null;
  email: string | null;
  mobile: string | null;
  client_type: string;
  assessment_year: string | null;
  address: string | null;
  client_code: string | null;
}

export async function parseClientsFromExcel(file: File): Promise<ParsedClient[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
        
        const clients: ParsedClient[] = jsonData
          .map((row) => ({
            name: String(row["Name"] || row["name"] || "").trim(),
            pan: row["PAN"] || row["pan"] ? String(row["PAN"] || row["pan"]).trim().toUpperCase() : null,
            email: row["Email"] || row["email"] ? String(row["Email"] || row["email"]).trim() : null,
            mobile: row["Mobile"] || row["mobile"] ? String(row["Mobile"] || row["mobile"]).trim() : null,
            client_type: String(row["Type"] || row["type"] || row["Client Type"] || "Individual").trim(),
            assessment_year: row["Assessment Year"] || row["assessment_year"] ? String(row["Assessment Year"] || row["assessment_year"]).trim() : null,
            address: row["Address"] || row["address"] ? String(row["Address"] || row["address"]).trim() : null,
            client_code: row["Client Code"] || row["client_code"] ? String(row["Client Code"] || row["client_code"]).trim() : null,
          }))
          .filter((client) => client.name.length > 0);

        resolve(clients);
      } catch (error) {
        reject(new Error("Failed to parse Excel file. Please ensure it's a valid .xlsx file."));
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// Parse document filename to extract client code, document type, and metadata
// Patterns:
// - ITRV_<client_code> -> ITR for client_code
// - COMPUTATION_<client_code>_<year>_<version> -> Computation for client_code, AY, version
// - <client_code>_<year>_26AS -> 26AS for client_code (e.g., SUFIPLASTI_2025_26AS.pdf)
export interface ParsedDocumentFile {
  file: File;
  clientCode: string;
  documentType: string;
  assessmentYear?: string;
  version?: number;
  versionLabel?: string;
}

export function parseDocumentFilename(file: File): ParsedDocumentFile | null {
  const filename = file.name;
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Try 26AS pattern: <client_code>_<year>_26AS (e.g., SUFIPLASTI_2025_26AS)
  const as26Match = nameWithoutExt.match(/^(.+)_(\d{4})_26AS$/i);
  if (as26Match) {
    const year = parseInt(as26Match[2]);
    return {
      file,
      clientCode: as26Match[1].toUpperCase(),
      documentType: "26AS",
      assessmentYear: `${year}-${(year + 1).toString().slice(-2)}`,
    };
  }
  
  // Try ITR pattern: ITRV_<client_code>
  const itrMatch = nameWithoutExt.match(/^ITRV_(.+)$/i);
  if (itrMatch) {
    return {
      file,
      clientCode: itrMatch[1].toUpperCase(),
      documentType: "ITR",
    };
  }
  
  // Try Computation pattern: COMPUTATION_<client_code>_<year>_<version>
  const compMatch = nameWithoutExt.match(/^COMPUTATION_(.+)_(\d{4})_(\d+)$/i);
  if (compMatch) {
    const year = parseInt(compMatch[2]);
    const version = parseInt(compMatch[3]);
    return {
      file,
      clientCode: compMatch[1].toUpperCase(),
      documentType: "Computation",
      assessmentYear: `${year}-${(year + 1).toString().slice(-2)}`,
      version,
      versionLabel: version === 1 ? "Original" : `Revised v${version}`,
    };
  }
  
  return null;
}

export function parseMultipleDocumentFiles(files: FileList): {
  parsed: ParsedDocumentFile[];
  unparsed: File[];
} {
  const parsed: ParsedDocumentFile[] = [];
  const unparsed: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = parseDocumentFilename(file);
    if (result) {
      parsed.push(result);
    } else {
      unparsed.push(file);
    }
  }
  
  return { parsed, unparsed };
}
