import { AppError } from "../../common/middleware/error-handler.middleware.js";
import {
  CONSULTANT_FILE_CONFIG,
  DOCUMENT_DETECTION_PATTERNS,
} from "./ai-consultant.constant.js";
import {
  validateFileMimeType,
  sanitizeExtractedText,
} from "../../common/utils/ai-consultant-security.util.js";
import type { DocumentContext, DocumentType } from "./ai-consultant.types.js";

let pdfParse:
  | ((
      data: Buffer,
      options?: { max?: number },
    ) => Promise<{
      text: string;
      numpages: number;
      info?: { Title?: string; Author?: string };
    }>)
  | null = null;
let XLSX: typeof import("xlsx") | null = null;

async function loadPdfParse() {
  if (!pdfParse) {
    const module = await import("pdf-parse");
    pdfParse = (module as any).default || module;
  }
  return pdfParse;
}

async function loadExcelParser(): Promise<typeof import("xlsx")> {
  if (!XLSX) {
    XLSX = await import("xlsx");
  }
  return XLSX!;
}

interface ParsedResult {
  text: string;
  pagesOrRows: number;
  metadata?: {
    title?: string | undefined;
    author?: string | undefined;
    sheets?: string[] | undefined;
  };
}

async function parsePDF(buffer: Buffer): Promise<ParsedResult> {
  const pdf = await loadPdfParse();

  if (!pdf) {
    throw new AppError(500, "PDF parsing library failed to load");
  }

  const option = {
    max: CONSULTANT_FILE_CONFIG.MAX_PAGES_PDF,
  };

  const data = await pdf(buffer, option);

  return {
    text: data.text,
    pagesOrRows: data.numpages,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
    },
  };
}

async function parseExcel(buffer: Buffer): Promise<ParsedResult> {
  const xlsx = await loadExcelParser();

  const webhook = xlsx.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellText: false,
  });

  const sheets: string[] = [];
  let totalRows = 0;
  const allText: string[] = [];

  for (const sheetName of webhook.SheetNames) {
    const sheet = webhook.Sheets[sheetName];
    if (!sheet) continue;

    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    });

    const limitedData = data.slice(0, CONSULTANT_FILE_CONFIG.MAX_ROWS_EXCEL);
    totalRows += limitedData.length;

    allText.push(`Sheet: ${sheetName}`);
    allText.push(`Rows: ${limitedData.length}`);

    if (limitedData.length > 0 && limitedData[0]) {
      const headers = Object.keys(limitedData[0]);
      allText.push(`Headers: ${headers.join(", ")}`);
      allText.push("");
    }

    for (const row of limitedData.slice(0, 10)) {
      const values = Object.entries(row)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      allText.push(values);
    }

    allText.push("---");
    sheets.push(sheetName);
  }

  return {
    text: allText.join("\n"),
    pagesOrRows: totalRows,
    metadata: { sheets },
  };
}

function detectDocumentType(text: string): DocumentType {
  const loweredText = text.toLowerCase();

  const scores: Record<DocumentType, number> = {
    bank_statement: 0,
    invoice: 0,
    receipt: 0,
    financial_report: 0,
    unknown: 0,
  };

  for (const pattern of DOCUMENT_DETECTION_PATTERNS.BANK_STATEMENT) {
    if (pattern.test(loweredText)) scores.bank_statement++;
  }

  for (const pattern of DOCUMENT_DETECTION_PATTERNS.INVOICE) {
    if (pattern.test(loweredText)) scores.invoice++;
  }

  for (const pattern of DOCUMENT_DETECTION_PATTERNS.RECEIPT) {
    if (pattern.test(loweredText)) scores.receipt++;
  }

  for (const pattern of DOCUMENT_DETECTION_PATTERNS.FINANCIAL_REPORT) {
    if (pattern.test(loweredText)) scores.financial_report++;
  }

  // Find highest score
  const maxType = Object.entries(scores)
    .filter(([k]) => k !== "unknown")
    .sort((a, b) => b[1] - a[1])[0];

  if (maxType && maxType[1] >= 2) {
    return maxType[0] as DocumentType;
  }

  return "unknown";
}

function extractFinancialData(text: string): {
  dateRange?: { start: Date; end: Date };
  amounts?: Array<{ label: string; amount: number }>;
} {
  // Extract amounts (IDR format)
  const amountPatterns = [
    /Rp\s*[\d.,]+/gi,
    /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\b/g,
  ];

  const amounts: Array<{ label: string; amount: number }> = [];

  const labels = [
    "total",
    "subtotal",
    "jumlah",
    "grand total",
    "bayar",
    "pembayaran",
    "saldo",
  ];
  const lines = text.split("\n");

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const label of labels) {
      if (lowerLine.includes(label)) {
        const match = line.match(/[\d.,]+/);
        if (match) {
          const amount = parseAmount(match[0]);
          if (amount > 0) {
            amounts.push({ label: capitalize(label), amount });
          }
        }
      }
    }
  }

  // Extract dates
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
  ];

  const dates: Date[] = [];

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = parseDate(match[0]);
      if (parsed) {
        dates.push(parsed);
      }
    }
  }

  let dateRange: { start: Date; end: Date } | undefined;

  if (dates.length > 0) {
    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = sorted[0];
    const endDate = sorted[sorted.length - 1];
    if (startDate && endDate) {
      dateRange = {
        start: startDate,
        end: endDate,
      };
    }
  }

  const result: {
    dateRange?: { start: Date; end: Date };
    amounts?: Array<{ label: string; amount: number }>;
  } = {};
  if (dateRange) {
    result.dateRange = dateRange;
  }
  if (amounts.length > 0) {
    result.amounts = amounts.slice(0, 10);
  }

  return result;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/[^\d.,]/g, "");
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

function parseDate(str: string): Date | null {
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export async function parseFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<DocumentContext> {
  if (buffer.length > CONSULTANT_FILE_CONFIG.MAX_SIZE) {
    throw new AppError(
      400,
      `File terlalu besar. Maksimal ${CONSULTANT_FILE_CONFIG.MAX_SIZE_MB}MB`,
      {
        code: "FILE_TOO_LARGE",
        maxSize: CONSULTANT_FILE_CONFIG.MAX_SIZE,
      },
    );
  }

  const mimeValidation = validateFileMimeType(buffer);
  if (!mimeValidation.valid) {
    throw new AppError(400, mimeValidation.error || "Tipe file tidak valid");
  }

  const fileType = mimeValidation.type;
  let parsed: ParsedResult;

  try {
    if (fileType === "pdf") {
      parsed = await parsePDF(buffer);
    } else {
      parsed = await parseExcel(buffer);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new AppError(400, `Gagal memproses file: ${msg}`);
  }

  const sanitizedText = sanitizeExtractedText(parsed.text);

  const documentType = detectDocumentType(sanitizedText);
  const financialData = extractFinancialData(sanitizedText);

  const summary: DocumentContext["summary"] = {
    pagesOrRows: parsed.pagesOrRows,
  };

  if (financialData.dateRange) {
    summary.dateRange = financialData.dateRange;
  }

  if (financialData.amounts) {
    summary.totalAmounts = financialData.amounts;
  }

  return {
    fileName,
    fileType: fileType as "pdf" | "excel",
    detectedType: documentType,
    extractedContent: sanitizedText,
    summary,
  };
}

export function getFileType(mimeType: string): "pdf" | "excel" | "unknown" {
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("xls")
  )
    return "excel";
  return "unknown";
}

export function validateFile(file: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Check MIME type from header
  const allowedMimes = [...CONSULTANT_FILE_CONFIG.ALLOWED_MIME_TYPES];
  if (!allowedMimes.includes(file.mimetype as (typeof allowedMimes)[number])) {
    return {
      valid: false,
      error: "Tipe file tidak didukung. Gunakan PDF atau Excel.",
    };
  }

  const ext = "." + file.originalname.split(".").pop()?.toLowerCase();
  if (
    !CONSULTANT_FILE_CONFIG.ALLOWED_EXTENSIONS.includes(
      ext as (typeof CONSULTANT_FILE_CONFIG.ALLOWED_EXTENSIONS)[number],
    )
  ) {
    return {
      valid: false,
      error: "Ekstensi file tidak didukung. Gunakan .pdf, .xlsx, atau .xls.",
    };
  }

  // Check size
  if (file.size > CONSULTANT_FILE_CONFIG.MAX_SIZE) {
    return {
      valid: false,
      error: `File maksimal ${CONSULTANT_FILE_CONFIG.MAX_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}
