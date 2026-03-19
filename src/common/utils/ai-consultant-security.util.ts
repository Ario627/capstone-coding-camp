import { PROMPT_INJECTION_PATTERNS, CONSULTANT_TOKEN_BUDGET, CONSULTANT_FILE_CONFIG } from "../../modules/ai/ai-consultant.constant.js";
import type { TokenEstimation } from "../../modules/ai/ai.types.js";

export function estimateTokens(text: string): number {
    if(!text) return 0;
    return Math.ceil(text.length / 3.5);
}

export function estimatePromptTokens(
  systemPrompt: string,
  userContext: string,
  documentContext: string,
  history: Array<{ role: string; content: string }>,
  message: string
): TokenEstimation {
  const systemTokens = estimateTokens(systemPrompt);
  const contextTokens = estimateTokens(userContext);
  const docTokens = estimateTokens(documentContext);
  
  let historyTokens = 0;
  for (const msg of history) {
    historyTokens += estimateTokens(msg.content) + 4; //+4 for role 
  }
  
  const messageTokens = estimateTokens(message);
  const totalTokens = systemTokens + contextTokens + docTokens + historyTokens + messageTokens;
  
  return {
    systemTokens,
    contextTokens,
    historyTokens,
    messageTokens,
    totalTokens,
    withinBudget: totalTokens <= CONSULTANT_TOKEN_BUDGET.MAX_INPUT_TOKENS,
  };
}

// Detect prompt injection 
export function detectPromptInjection(text: string): { detected: boolean; patterns: string[] } {
  const detectedPatterns: string[] = [];
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.source);
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

export function sanitizeInput(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function validateMessage(message: string): {valid: boolean; error?: string} {
    if(!message || message.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
    }

    if(message.length > CONSULTANT_TOKEN_BUDGET.MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `Message cannot exceed ${CONSULTANT_TOKEN_BUDGET.MAX_MESSAGE_LENGTH} characters` };
    }

    const injection = detectPromptInjection(message);
    if(!injection.detected) {
        return {valid: false, error: 'Pesan mengandung pola yang ga di izinkan'}
    }

    return {valid: true}
}

export function validateFileMimeType(buffer: Buffer): {valid: boolean, type?: 'pdf' | 'excel'; error?: string} {
    if(buffer.length < 8) {
        return {valid: false, error: 'File terlalu kecil atau rusak'};
    }

    const bytes = Array.from(buffer.slice(0, 8));

    // Check PDF: %PDF
  const pdfMagic = CONSULTANT_FILE_CONFIG.MAGIC_BYTES.PDF;
  if (pdfMagic.every((b, i) => bytes[i] === b)) {
    return { valid: true, type: 'pdf' };
  }
  
  // Check XLSX (ZIP format)
  const xlsxMagic = CONSULTANT_FILE_CONFIG.MAGIC_BYTES.XLSX;
  if (xlsxMagic.every((b, i) => bytes[i] === b)) {
    return { valid: true, type: 'excel' };
  }
  
  // Check XLS (OLE format)
  const xlsMagic = CONSULTANT_FILE_CONFIG.MAGIC_BYTES.XLS;
  if (xlsMagic.every((b, i) => bytes[i] === b)) {
    return { valid: true, type: 'excel' };
  }
  
  return { valid: false, error: 'Tipe file tidak valid atau file rusak' };
}

// Validate file size
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > CONSULTANT_FILE_CONFIG.MAX_SIZE) {
    return { valid: false, error: `File maksimal ${CONSULTANT_FILE_CONFIG.MAX_SIZE_MB}MB` };
  }
  return { valid: true };
}

export function sanitizeExtractedText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except newlines
    .replace(/\u0000/g, '') // Remove null chars
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Remove replacement chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 50000); // Limit extracted text
}


export function truncateHistory(
    history: Array<{role: string; content: string}>,
    maxTokens: number
): Array<{role: string; content: string}> {
    if(history.length === 0) return history;

    let totalTokens = 0;
    const truncated: Array<{role: string; content: string}> = [];

    for(let i = history.length - 1; i>=0; i--) {
        const msg = history[i]!;
        const msgTokens = estimateTokens(msg.content) + 4; //+4 for role
        if(totalTokens + msgTokens > maxTokens) {
            break;
        }
        totalTokens += msgTokens;
        truncated.unshift(msg);
    }
    return truncated;
}

export function buildHistoryString(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  if (history.length === 0) return '';
  
  const lines = history.map(msg => {
    const role = msg.role === 'user' ? 'Pengguna' : 'Assistant';
    return `${role}: ${msg.content}`;
  });
  
  return `## Riwayat Percakapan\n${lines.join('\n')}`;
}

export function buildUserContextString(context: {
  profile: Record<string, unknown>;
  financialSummary: Record<string, unknown>;
  categoryBreakdown?: Record<string, unknown>;
  recentTransactions?: Array<Record<string, unknown>>;
  businessData?: Record<string, unknown>;
}): string {
  const parts: string[] = ['## Data Keuangan Pengguna'];
  
  if (context.profile) {
    parts.push(`**Profil:** ${JSON.stringify(context.profile)}`);
  }
  
  if (context.financialSummary) {
    parts.push(`**Ringkasan:** ${JSON.stringify(context.financialSummary)}`);
  }
  
  if (context.categoryBreakdown) {
    parts.push(`**Kategori:** ${JSON.stringify(context.categoryBreakdown)}`);
  }
  
  if (context.recentTransactions && context.recentTransactions.length > 0) {
    parts.push(`**Transaksi Terakhir:** ${JSON.stringify(context.recentTransactions.slice(0, 10))}`);
  }
  
  if (context.businessData) {
    parts.push(`**Data Usaha:** ${JSON.stringify(context.businessData)}`);
  }
  
  return parts.join('\n\n');
}

export function buildDocumentContextString(doc: {
  fileName: string;
  fileType: string;
  detectedType: string;
  extractedContent: string;
}): string {
  const contentPreview = doc.extractedContent.slice(0, 3000);
  
  return `## Dokumen yang Diupload
- **Nama file:** ${doc.fileName}
- **Tipe:** ${doc.fileType}
- **Deteksi:** ${doc.detectedType}

**Konten relevan:**
${contentPreview}`;
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for display
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date);
}

// Format number with locale
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}