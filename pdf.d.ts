import type { FieldModel } from '../form-model/index.js'

/** Field descriptor for PDF rendering. Full FieldModel union + runtime value references. */
export type PdfField = FieldModel & {
  /** Raw value (JSONata expression at build time, resolved at runtime). */
  value: unknown
  /** Display label for dropdowns (JSONata expression at build time). */
  displayValue?: string | null
  /** Array field: table-to-card layout threshold (default 6). */
  maxColumns?: number
}

export interface PdfSection {
  title?: unknown
  children: Array<PdfField | PdfSection>
}

export interface PdfFile {
  fileName: string
  createdAt?: string
  fieldName?: string
  localPath?: string
  thumbnail?: string
}

/**
 * PDF generation data. At build time, expression fields (title, description,
 * files) contain JSONata strings or text value objects; the Jigx runtime
 * resolves them to plain values before passing to create().
 */
export interface PdfData {
  [key: string]: unknown
  title?: unknown
  description?: unknown
  submittedAt?: string
  sections?: PdfSection[]
  files?: unknown
}

/**
 * Generates a PDF HTML template from form data.
 *
 * @param data - Form data with typed field descriptors and section grouping
 * @returns HTML string for PDF generation
 */
export function create(data: PdfData): string
