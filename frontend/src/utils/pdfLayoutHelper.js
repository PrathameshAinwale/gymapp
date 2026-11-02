/**
 * PDF LAYOUT & WRAPPING HELPER (Shared across all client-side PDF documents)
 *
 * CORE ARCHITECTURAL RULES:
 * 1. ALWAYS WRAP: Every piece of text must be wrapped to its container's maximum width.
 *    Never draw raw doc.text() without an explicit width constraint.
 * 2. UNBROKEN STRINGS: Always break unbroken words (long names, URLs, emails, hashes)
 *    using character-level splitting if they exceed maxWidth.
 * 3. DYNAMIC HEIGHTS: Never hardcode fixed container/box heights for variable content.
 *    Measure wrapped text height first, then draw the enclosing card/box.
 * 4. PAGINATION: Check remaining vertical space before rendering elements.
 *    If an element would cross the bottom margin, start a new page.
 *    Table headers must repeat on new pages, and rows must not be split across pages.
 * 5. SAFE VALUES: Always sanitize and safely convert null, undefined, and numbers to string.
 */

// Standard A4 dimensions in millimeters (jsPDF unit: 'mm')
export const PDF_PAGE_WIDTH = 210;
export const PDF_PAGE_HEIGHT = 297;
export const PDF_MARGIN_LEFT = 16;
export const PDF_MARGIN_RIGHT = 16;
export const PDF_MARGIN_TOP = 16;
export const PDF_MARGIN_BOTTOM = 16;
export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN_LEFT - PDF_MARGIN_RIGHT; // 178 mm
export const PDF_USABLE_HEIGHT = PDF_PAGE_HEIGHT - PDF_MARGIN_TOP - PDF_MARGIN_BOTTOM; // 265 mm

/**
 * Safely convert any value (null, undefined, number, object) to a trimmed string.
 */
export function safeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return String(val);
}

/**
 * Wrap text to fit within maxWidth.
 * Preserves user-entered \n line breaks.
 * Forces character-level splitting for unbroken words (e.g., 200+ char strings with no spaces).
 *
 * @param {import('jspdf').jsPDF} doc - jsPDF instance
 * @param {string|number} text - Input text
 * @param {number} maxWidth - Maximum width in mm
 * @returns {string[]} Array of lines that fit within maxWidth
 */
export function wrapAndBreakText(doc, text, maxWidth) {
  const str = safeString(text);
  if (!str.trim()) return [];

  const maxW = Math.max(1, Number(maxWidth) || PDF_CONTENT_WIDTH);

  // Preserve explicit newlines in user-entered text
  const rawParagraphs = str.split(/\r?\n/);
  const allFinalLines = [];

  for (const paragraph of rawParagraphs) {
    if (!paragraph.trim()) {
      allFinalLines.push('');
      continue;
    }

    // Split into words by whitespace
    const words = paragraph.split(/\s+/).filter(Boolean);
    const safeWords = [];

    for (const word of words) {
      if (doc.getTextWidth(word) > maxW) {
        // Character-level splitting for words exceeding maxWidth
        let chunk = '';
        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          if (doc.getTextWidth(chunk + char) <= maxW) {
            chunk += char;
          } else {
            if (chunk) safeWords.push(chunk);
            chunk = char;
          }
        }
        if (chunk) safeWords.push(chunk);
      } else {
        safeWords.push(word);
      }
    }

    const wrapped = doc.splitTextToSize(safeWords.join(' '), maxW);
    if (Array.isArray(wrapped)) {
      for (const line of wrapped) {
        // Final sanity safeguard: if any wrapped line still exceeds maxW, force-chunk it
        if (doc.getTextWidth(line) > maxW) {
          let sub = '';
          for (let c = 0; c < line.length; c++) {
            if (doc.getTextWidth(sub + line[c]) <= maxW) {
              sub += line[c];
            } else {
              if (sub) allFinalLines.push(sub);
              sub = line[c];
            }
          }
          if (sub) allFinalLines.push(sub);
        } else {
          allFinalLines.push(line);
        }
      }
    } else if (wrapped) {
      allFinalLines.push(String(wrapped));
    }
  }

  return allFinalLines;
}

/**
 * Measure text height and wrapped lines using a specific font, style, and size.
 */
export function measureTextHeight(doc, text, maxWidth, options = {}) {
  const { fontSize = 9, fontName = 'helvetica', fontStyle = 'normal', lineHeight = 4.5 } = options;

  const prevSize = doc.getFontSize();
  const prevFont = doc.getFont();

  doc.setFont(fontName, fontStyle);
  doc.setFontSize(fontSize);

  const lines = wrapAndBreakText(doc, text, maxWidth);
  const height = lines.length * lineHeight;

  doc.setFont(prevFont.fontName, prevFont.fontStyle);
  doc.setFontSize(prevSize);

  return {
    lines,
    lineCount: lines.length,
    height
  };
}

/**
 * Layout and Page Manager for multi-page document pagination and running headers/footers.
 */
export class PdfPageManager {
  /**
   * @param {import('jspdf').jsPDF} doc
   * @param {Object} options
   */
  constructor(doc, options = {}) {
    this.doc = doc;
    this.pageWidth = options.pageWidth || PDF_PAGE_WIDTH;
    this.pageHeight = options.pageHeight || PDF_PAGE_HEIGHT;
    this.marginLeft = options.marginLeft || PDF_MARGIN_LEFT;
    this.marginRight = options.marginRight || PDF_MARGIN_RIGHT;
    this.marginTop = options.marginTop || PDF_MARGIN_TOP;
    this.marginBottom = options.marginBottom || PDF_MARGIN_BOTTOM;
    this.contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    this.bottomLimit = this.pageHeight - this.marginBottom;

    this.curY = this.marginTop;
    this.currentPage = 1;

    // Callbacks for running elements
    this.onNewPage = options.onNewPage || null;
    this.drawFooter = options.drawFooter || null;
  }

  /**
   * Check if there is enough space on the current page for `neededHeight` mm.
   */
  hasSpace(neededHeight) {
    return this.curY + neededHeight <= this.bottomLimit;
  }

  /**
   * Ensure space exists on the current page; if not, adds a new page and calls onNewPage.
   */
  ensureSpace(neededHeight, onNewPageOverride = null) {
    if (!this.hasSpace(neededHeight)) {
      this.addNewPage(onNewPageOverride);
    }
  }

  /**
   * Force add a new page, reset curY, and invoke new-page callbacks.
   */
  addNewPage(onNewPageOverride = null) {
    this.doc.addPage();
    this.currentPage++;
    this.curY = this.marginTop;

    // Draw top accent / running header if callback provided
    if (typeof onNewPageOverride === 'function') {
      onNewPageOverride(this);
    } else if (typeof this.onNewPage === 'function') {
      this.onNewPage(this);
    }
  }

  /**
   * Draw wrapped text lines safely and advance curY.
   */
  drawTextLines(lines, x, y, options = {}) {
    const {
      fontSize = 9,
      fontName = 'helvetica',
      fontStyle = 'normal',
      textColor = [15, 23, 42],
      lineHeight = 4.5,
      align = 'left'
    } = options;

    if (!lines || lines.length === 0) return y;

    this.doc.setFont(fontName, fontStyle);
    this.doc.setFontSize(fontSize);
    if (Array.isArray(textColor)) {
      this.doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    }

    this.doc.text(lines, x, y, { align });
    return y + (lines.length - 1) * lineHeight;
  }

  /**
   * Stamp running footers and "Page X of Y" on all pages at the end of document generation.
   */
  finalizeFooters(footerCallback) {
    const totalPages = this.doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p);
      if (typeof footerCallback === 'function') {
        footerCallback(this, p, totalPages);
      }
    }
  }
}

