import { jsPDF } from 'jspdf';
import { formatWhatsAppPhone, openWhatsApp } from './whatsapp.js';

// Helper to convert numbers to Indian Rupee Words
function numberToWordsINR(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  let words = '';
  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = Math.floor(remainder / 100);
  let change = remainder % 100;

  if (crore > 0) words += inWords(crore) + ' Crore ';
  if (lakh > 0) words += inWords(lakh) + ' Lakh ';
  if (thousand > 0) words += inWords(thousand) + ' Thousand ';
  if (hundred > 0) words += inWords(hundred) + ' Hundred ';
  if (change > 0) words += (words !== '' ? 'and ' : '') + inWords(change) + ' ';

  return `Rupees ${words.trim()} Only`;
}

/**
 * Cross-browser PDF download helper
 */
export function downloadPdfBlob(blob, fileName, doc = null) {
  let actualBlob = blob;
  let actualDoc = doc;

  // Handle case where result object from generateInvoicePdf was passed directly
  if (blob && typeof blob === 'object' && !(blob instanceof Blob)) {
    if (blob.blob instanceof Blob) actualBlob = blob.blob;
    if (blob.doc) actualDoc = blob.doc;
  }

  if (actualDoc && typeof actualDoc.save === 'function') {
    try {
      actualDoc.save(fileName);
      return true;
    } catch (docErr) {
      console.warn('doc.save failed, falling back to blob anchor:', docErr);
    }
  }

  try {
    if (!actualBlob) {
      console.error('downloadPdfBlob error: No valid Blob available');
      return false;
    }
    const url = URL.createObjectURL(actualBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 5000);
    return true;
  } catch (err) {
    console.error('downloadPdfBlob anchor error:', err);
    try {
      if (actualBlob) {
        const url = URL.createObjectURL(actualBlob);
        window.open(url, '_blank');
        return true;
      }
      return false;
    } catch (e) {
      console.error('All download methods failed:', e);
      return false;
    }
  }
}

// Helper to format dates consistently across the entire invoice
export function formatInvoiceDate(rawDate) {
  if (!rawDate) return '';
  try {
    const clean = String(rawDate).split('T')[0].trim();
    if (!clean) return '';
    let y, m, d;
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-/]/);
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    } else if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(clean)) {
      const parts = clean.split(/[-/]/);
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) return String(rawDate);
      y = parsed.getFullYear();
      m = parsed.getMonth();
      d = parsed.getDate();
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayStr = String(d).padStart(2, '0');
    const monthStr = months[m];
    if (!monthStr || isNaN(y)) return String(rawDate);
    return `${dayStr} ${monthStr} ${y}`;
  } catch {
    return String(rawDate);
  }
}

// Helper to wrap text within a maximum width and break long unbroken strings (e.g. emails)
export function wrapAndBreakText(doc, text, maxWidth) {
  if (!text) return [];
  const str = String(text).trim();
  if (!str) return [];

  // Split on spaces first
  const words = str.split(/\s+/);
  const brokenWords = [];

  for (const word of words) {
    if (doc.getTextWidth(word) > maxWidth) {
      // Break the word into chunks that fit within maxWidth
      let chunk = '';
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (doc.getTextWidth(chunk + char) <= maxWidth) {
          chunk += char;
        } else {
          if (chunk) brokenWords.push(chunk);
          chunk = char;
        }
      }
      if (chunk) brokenWords.push(chunk);
    } else {
      brokenWords.push(word);
    }
  }

  return doc.splitTextToSize(brokenWords.join(' '), maxWidth);
}

/**
 * Shared helper to format start and end date for any package/plan line item.
 * Always formats as "<start date> – <end date>".
 * If an item lacks start or end date, derives them from plan duration or invoice dates.
 * Never prints "Valid until", "Valid till", "undefined", or "Invalid Date".
 */
export function formatPackageDateRange(pkg, invoice = {}, member = {}) {
  let rawStart =
    pkg?.startDate ||
    pkg?.start_date ||
    pkg?.from ||
    (invoice?.packages?.length === 1 || !invoice?.packages
      ? (invoice?.startDate || invoice?.start_date || invoice?.date || member?.startDate || member?.start_date || member?.membershipStartDate)
      : null);

  let rawEnd =
    pkg?.endDate ||
    pkg?.end_date ||
    pkg?.expiryDate ||
    pkg?.expiry_date ||
    pkg?.validTill ||
    pkg?.to ||
    (invoice?.packages?.length === 1 || !invoice?.packages
      ? (invoice?.endDate || invoice?.end_date || invoice?.expiryDate || invoice?.expiry_date || member?.expiryDate || member?.expiry_date || member?.membershipEndDate)
      : null);

  const durationMonths = Number(pkg?.durationMonths || pkg?.duration_months || pkg?.duration || invoice?.durationMonths || invoice?.duration_months || 0);
  const durationDays = Number(pkg?.durationDays || pkg?.duration_days || (durationMonths > 0 ? durationMonths * 30 : 0));

  // If start is missing but end exists: derive start from duration
  if (!rawStart && rawEnd && durationDays > 0) {
    try {
      const d = new Date(rawEnd);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() - durationDays);
        rawStart = d.toISOString().split('T')[0];
      }
    } catch (_) {}
  }

  // If end is missing but start exists: derive end from duration (default 30 days if plan/package)
  if (rawStart && !rawEnd) {
    try {
      const daysToAdd = durationDays > 0 ? durationDays : 30;
      const d = new Date(rawStart);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + daysToAdd);
        rawEnd = d.toISOString().split('T')[0];
      }
    } catch (_) {}
  }

  // Fallback to invoice start/end if item still has no dates
  if (!rawStart && invoice?.startDate) rawStart = invoice.startDate;
  if (!rawStart && invoice?.date) rawStart = invoice.date;
  if (!rawEnd && (invoice?.endDate || invoice?.expiryDate)) rawEnd = invoice.endDate || invoice.expiryDate;

  const fmtStart = rawStart ? formatInvoiceDate(rawStart) : '';
  const fmtEnd = rawEnd ? formatInvoiceDate(rawEnd) : '';

  const isValidDateStr = (str) =>
    Boolean(str && !str.toLowerCase().includes('invalid') && !str.toLowerCase().includes('nan') && !str.toLowerCase().includes('undefined'));

  const validStart = isValidDateStr(fmtStart) ? fmtStart : '';
  const validEnd = isValidDateStr(fmtEnd) ? fmtEnd : '';

  if (validStart && validEnd) {
    return `${validStart} – ${validEnd}`;
  }
  if (validStart) {
    return `${validStart}`;
  }
  if (validEnd) {
    return `${validEnd}`;
  }
  return '';
}

/**
 * Generate a modern, elegant Gym Membership & Payment Receipt PDF
 * (Clean fitness club format — easy to read, transparent, and aesthetically premium)
 */
export function generateInvoicePdf(arg1, arg2, arg3) {
  let invoice = null;
  let member = null;
  let gymInfo = null;

  if (arg1 && typeof arg1 === 'object') {
    if ('invoice' in arg1) {
      invoice = arg1.invoice;
      member = arg1.member || null;
      gymInfo = arg1.gymInfo || null;
    } else {
      invoice = arg1;
      if (arg2 && typeof arg2 === 'object') {
        if (arg2.gstin || arg2.gst_number || arg2.address || arg2.tagline || arg2.currency || arg2.logo || arg2.taxRate !== undefined || arg2.tax_rate !== undefined) {
          gymInfo = arg2;
          member = arg3 || null;
        } else {
          member = arg2;
          gymInfo = arg3 || null;
        }
      }
    }
  }

  invoice = invoice || {};
  member = member || {};
  gymInfo = gymInfo || {};

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const gymName = gymInfo?.name || invoice?.gymName || '';
  const gymAddress = gymInfo?.address || '';
  const gymGstin = gymInfo?.gstin || gymInfo?.gstNumber || gymInfo?.gst_number || '';
  const gymPhone = gymInfo?.phone || '';
  const gymEmail = gymInfo?.email || '';
  const gymWebsite = gymInfo?.website || '';
  const gymTagline = gymInfo?.tagline || gymInfo?.tag_line || '';
  const currencySymbol = gymInfo?.currency || '₹';
  const pdfCurrencySymbol = (!gymInfo?.currency || gymInfo.currency === '₹' || gymInfo.currency.includes('â')) ? 'Rs.' : gymInfo.currency;
  const taxRate = Number(invoice?.gstRate ?? invoice?.taxRate ?? gymInfo?.tax_rate ?? gymInfo?.taxRate ?? 18);

  const memberName = member?.name || invoice.memberName || invoice.member_name || 'Valued Member';
  const memberId = member?.id || invoice.memberId || 'AF-M-101';
  const memberPhone = member?.phone || invoice.phone || 'N/A';
  const memberEmail = member?.email || invoice.email || 'N/A';

  const invoiceId = (invoice.id || invoice.invoiceNumber || invoice.invoice_number || 'INV-001').toString().toUpperCase();

  // Safely resolve the invoice Issue Date from the exact same source fields the invoice list uses
  // Avoid confusing the package start date with the invoice issue date
  const candidateStartDate = (invoice.startDate || invoice.start_date || member?.startDate || member?.start_date || '').toString().split('T')[0].trim();
  let rawIssueDate =
    invoice.issueDate ||
    invoice.issue_date ||
    invoice.invoiceDate ||
    invoice.invoice_date ||
    null;

  if (!rawIssueDate && invoice.date) {
    const candidate = String(invoice.date).split('T')[0].trim();
    // If invoice.date was mistakenly assigned the package start date while a true creation or payment date exists, use that
    if (candidateStartDate && candidate === candidateStartDate && (invoice.paymentDate || invoice.payment_date || invoice.created_at || invoice.createdAt)) {
      rawIssueDate = (invoice.paymentDate || invoice.payment_date || invoice.created_at || invoice.createdAt).toString().split('T')[0].trim();
    } else {
      rawIssueDate = candidate;
    }
  }

  if (!rawIssueDate) {
    rawIssueDate =
      invoice.paymentDate ||
      invoice.payment_date ||
      invoice.created_at ||
      invoice.createdAt ||
      new Date().toISOString().split('T')[0];
  }

  const invoiceDate = formatInvoiceDate(rawIssueDate);
  const paymentMode = invoice.paymentMethod || invoice.payment_method || 'UPI';
  const planName = invoice.planName || invoice.plan_name || 'Comprehensive Gym Membership Pass';
  const totalAmount = Number(invoice.amount ?? invoice.paidAmount ?? invoice.paid_amount ?? 0);
  const pendingAmount = Number(
    invoice.pendingAmount ??
    invoice.duesAmount ??
    invoice.dues_amount ??
    ((invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'partial'
      ? (member?.duesAmount || member?.dues_amount || 0)
      : 0)
  );
  const isPending = (invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'partial' || pendingAmount > 0;
  const hasGst = Boolean(
    invoice.isGstIncluded ??
    invoice.hasGst ??
    invoice.gstIncluded ??
    invoice.is_gst_included ??
    (invoice.taxable_amount !== undefined && Number(invoice.taxable_amount) < totalAmount)
  );
  const effectiveTaxRate = taxRate > 0 ? taxRate : 18;
  const taxableBase = hasGst ? Math.round(totalAmount / (1 + (effectiveTaxRate / 100))) : totalAmount;
  const totalGst = hasGst ? Math.max(0, totalAmount - taxableBase) : 0;
  const cgst = hasGst ? Math.round(totalGst / 2) : 0;
  const sgst = hasGst ? (totalGst - cgst) : 0;
  const amountWords = numberToWordsINR(totalAmount);

  // Background canvas
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Accent Bar (Amber for pending, emerald for paid)
  if (isPending) {
    doc.setFillColor(245, 158, 11); // amber-500
  } else {
    doc.setFillColor(16, 185, 129); // emerald-500
  }
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 1. BRAND & RECEIPT HEADER
  let curY = margin + 3;

  // Gym Monogram Logo Mark
  const monogram = (gymName || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || (gymName ? gymName.slice(0, 2).toUpperCase() : '★');

  if (isPending) {
    doc.setFillColor(245, 158, 11);
  } else {
    doc.setFillColor(16, 185, 129);
  }
  doc.roundedRect(margin, curY, 11, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(monogram, margin + 5.5, curY + 7.5, { align: 'center' });

  // Gym Title (Wrapped with max width so long names never overflow)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  const displayName = gymName ? gymName.toUpperCase() : 'FITNESS CLUB';
  const gymNameLines = wrapAndBreakText(doc, displayName, 95);
  doc.text(gymNameLines, margin + 14, curY + 5.5);

  const gymNameH = gymNameLines.length * 4.5;
  if (gymTagline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(gymTagline, margin + 14, curY + 6.5 + gymNameH);
  }

  // Right Side Header Box: Status Pill, Invoice Number & Issue Date clearly visible
  const headerRightW = 68;
  const headerRightX = pageWidth - margin - headerRightW;

  if (isPending) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.roundedRect(headerRightX, curY - 1, headerRightW, 8, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('PENDING INVOICE', headerRightX + headerRightW / 2, curY + 4.5, { align: 'center' });
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(headerRightX, curY - 1, headerRightW, 8, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('PAYMENT RECEIPT • VERIFIED', headerRightX + headerRightW / 2, curY + 4.5, { align: 'center' });
  }

  // Header: Invoice Number & Issue Date prominently displayed near each other
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const invNumLines = wrapAndBreakText(doc, `Invoice #: ${invoiceId}`, headerRightW);
  doc.text(invNumLines, headerRightX + headerRightW, curY + 12, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue Date: ${invoiceDate}`, headerRightX + headerRightW, curY + 16.5 + (invNumLines.length - 1) * 3.5, { align: 'right' });

  // Gym Contact Sub-bar below branding (Only show available fields; hide if empty)
  const contactParts = [];
  if (gymAddress) contactParts.push(gymAddress);
  if (gymPhone) contactParts.push(`Phone: ${gymPhone}`);
  if (gymGstin) contactParts.push(`GSTIN: ${gymGstin}`);
  if (gymEmail) contactParts.push(`Email: ${gymEmail}`);
  if (gymWebsite) contactParts.push(`Web: ${gymWebsite}`);

  const contactText = contactParts.join('  •  ');
  const contactLines = contactText ? wrapAndBreakText(doc, contactText, 105) : [];
  const contactY = curY + 12 + gymNameH;
  if (contactLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(contactLines, margin, contactY);
  }

  const isGenericStaff = (val) => {
    if (!val || typeof val !== 'string') return true;
    const lower = val.trim().toLowerCase();
    return lower === '' || lower === 'staff' || lower === 'staff / admin' || lower === 'admin' || lower === 'system' || lower === 'unknown';
  };

  const sanitizeCreator = (val) => {
    if (!val || typeof val !== 'string') return '';
    return val.replace(/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i, '').trim();
  };

  let candidateCreator =
    sanitizeCreator(invoice.createdByName) ||
    sanitizeCreator(invoice.created_by_name) ||
    sanitizeCreator(invoice.staffName) ||
    sanitizeCreator(invoice.staff_name) ||
    sanitizeCreator(invoice.staff) ||
    sanitizeCreator(invoice.executive) ||
    sanitizeCreator(invoice.issuedBy) ||
    sanitizeCreator(invoice.issued_by) ||
    sanitizeCreator(invoice.handledBy) ||
    sanitizeCreator(invoice.handled_by) ||
    sanitizeCreator(invoice.creatorName) ||
    sanitizeCreator(invoice.creator_name) ||
    sanitizeCreator(invoice.creator?.name) ||
    sanitizeCreator(invoice.createdBy?.name) ||
    sanitizeCreator(invoice.created_by?.name);

  if (isGenericStaff(candidateCreator)) {
    const memberCandidate =
      sanitizeCreator(member?.executive) ||
      sanitizeCreator(member?.staffName) ||
      sanitizeCreator(member?.staff_name) ||
      sanitizeCreator(member?.handledBy) ||
      sanitizeCreator(member?.handled_by) ||
      sanitizeCreator(member?.createdByName) ||
      sanitizeCreator(member?.created_by_name);

    if (memberCandidate && !isGenericStaff(memberCandidate)) {
      candidateCreator = memberCandidate;
    }
  }

  if (isGenericStaff(candidateCreator)) {
    const gymCandidate =
      sanitizeCreator(gymInfo?.ownerName) ||
      sanitizeCreator(gymInfo?.owner_name) ||
      sanitizeCreator(gymInfo?.owner) ||
      sanitizeCreator(gymInfo?.contactPerson) ||
      sanitizeCreator(gymInfo?.contact_person);

    if (gymCandidate && !isGenericStaff(gymCandidate)) {
      candidateCreator = gymCandidate;
    }
  }

  const createdByName = (!isGenericStaff(candidateCreator) && candidateCreator) ? candidateCreator : 'Staff';

  // Dynamic Header advancement
  const headerTotalH = Math.max(contactY + contactLines.length * 3.5 - curY, 20);
  curY += headerTotalH + 3;

  // Soft Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, curY, pageWidth - margin, curY);

  // 2. MEMBER & RECEIPT INFORMATION (TWO ELEGANT DYNAMIC CARDS)
  curY += 5;
  const colW = (contentWidth - 6) / 2;
  const cardPad = 5;
  const textMaxW = colW - cardPad * 2;

  // Pre-calculate wrapped lines for Card A (Member)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const memberNameLines = wrapAndBreakText(doc, memberName, textMaxW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const memberEmailLines = memberEmail && memberEmail !== 'N/A'
    ? wrapAndBreakText(doc, `Email: ${memberEmail}`, textMaxW)
    : [];

  const cardAHeight = 6 + memberNameLines.length * 4.5 + 4 + 4.5 + (memberEmailLines.length > 0 ? memberEmailLines.length * 3.8 : 4) + 6;

  // Pre-calculate wrapped lines for Card B (Receipt Details)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const cardBInvLines = wrapAndBreakText(doc, `Receipt #${invoiceId}`, textMaxW);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const modeLines = wrapAndBreakText(doc, `Payment: ${paymentMode}`, textMaxW);
  const creatorLines = wrapAndBreakText(doc, `Created By: ${createdByName}`, textMaxW);

  const cardBHeight = 6 + cardBInvLines.length * 4 + 4.5 + modeLines.length * 3.8 + creatorLines.length * 3.8 + 7;

  // Both cards expand dynamically to the maximum needed height
  const cardH = Math.max(cardAHeight, cardBHeight, 40);

  // Card A: Member Info
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, curY, colW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO MEMBER', margin + cardPad, curY + 6);

  let mY = curY + 11.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(memberNameLines, margin + cardPad, mY);
  mY += memberNameLines.length * 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Member ID: ${memberId}`, margin + cardPad, mY);
  mY += 4.5;
  doc.text(`Mobile: ${memberPhone}`, margin + cardPad, mY);
  mY += 4.5;

  if (memberEmailLines.length > 0) {
    doc.text(memberEmailLines, margin + cardPad, mY);
    mY += memberEmailLines.length * 3.8;
  }
  const stateStr = member?.state || gymInfo?.state;
  if (stateStr) {
    doc.text(`State: ${stateStr}`, margin + cardPad, mY);
    mY += 4;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Verification: KYC Verified Athlete', margin + cardPad, curY + cardH - 3.5);

  // Card B: Receipt / Invoice Details
  const cardBX = margin + colW + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardBX, curY, colW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RECEIPT & PAYMENT DETAILS', cardBX + cardPad, curY + 6);

  let rDetailY = curY + 11.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cardBInvLines, cardBX + cardPad, rDetailY);
  rDetailY += cardBInvLines.length * 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Issue Date: ${invoiceDate}`, cardBX + cardPad, rDetailY);
  rDetailY += 4.5;

  doc.text(modeLines, cardBX + cardPad, rDetailY);
  rDetailY += modeLines.length * 3.8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(creatorLines, cardBX + cardPad, rDetailY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  if (isPending) {
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`Status: Pending (Rs. ${pendingAmount.toLocaleString('en-IN')} Due)`, cardBX + cardPad, curY + cardH - 3.5);
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text(`Status: Paid & Settled (Full)`, cardBX + cardPad, curY + cardH - 3.5);
  }

  // 3. PACKAGES & SUBSCRIPTION LINE ITEMS TABLE
  curY += cardH + 7;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('SUBSCRIPTION & PACKAGE DETAILS', margin, curY);

  curY += 3;

  // Normalize packages list (support multi-package checkouts and single plans)
  let packagesList = [];
  if (Array.isArray(invoice.packages) && invoice.packages.length > 0) {
    packagesList = invoice.packages;
  } else if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    packagesList = invoice.items;
  } else if (Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0) {
    packagesList = invoice.lineItems;
  } else {
    packagesList = [
      {
        name: planName,
        packageType: invoice.packageType || invoice.package_type || 'Membership',
        price: totalAmount,
        startDate: invoice.startDate || invoice.start_date || member?.startDate || member?.start_date || member?.membershipStartDate,
        endDate: invoice.endDate || invoice.end_date || invoice.expiryDate || invoice.expiry_date || member?.expiryDate || member?.expiry_date || member?.membershipEndDate,
        description: invoice.description || ''
      }
    ];
  }

  // Pre-calculate rows and dynamic package card height
  const pkgColWidth = contentWidth - 45;
  const packageRows = packagesList.map((pkg) => {
    const pkgName = pkg.name || pkg.planName || pkg.plan_name || pkg.packageType || 'Fitness Package';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const titleLines = wrapAndBreakText(doc, pkgName, pkgColWidth);

    // Shared start/end date calculation across all package types
    const dateText = formatPackageDateRange(pkg, invoice, member);

    const shortDesc = pkg.description || (pkg.packageType && pkg.packageType !== 'Membership' && !pkgName.toLowerCase().includes(pkg.packageType.toLowerCase()) ? pkg.packageType : '');

    const rowHeight = Math.max(titleLines.length * 4.5 + (dateText ? 4 : 0) + (shortDesc ? 3.5 : 0) + 4, 12);
    const priceVal = Number(pkg.price ?? (packagesList.length === 1 ? totalAmount : 0));

    return {
      titleLines,
      dateText,
      shortDesc,
      priceVal,
      rowHeight
    };
  });

  const tableHeaderH = 7.5;
  const totalPackagesH = tableHeaderH + packageRows.reduce((sum, r) => sum + r.rowHeight, 0) + 2;

  // Outer Box for Subscription Line Items
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, totalPackagesH, 2.5, 2.5, 'FD');

  // Table Column Header Bar
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, curY, contentWidth, tableHeaderH, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PACKAGE / PLAN ITEM', margin + 4, curY + 5);
  doc.text('AMOUNT', pageWidth - margin - 4, curY + 5, { align: 'right' });

  // Divider below table header
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, curY + tableHeaderH, pageWidth - margin, curY + tableHeaderH);

  let pkgY = curY + tableHeaderH + 1.5;

  packageRows.forEach((row, idx) => {
    // Package Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(row.titleLines, margin + 4, pkgY + 4);

    let subY = pkgY + 4 + (row.titleLines.length - 1) * 4.5;

    // Package Dates: Start Date and End Date directly below the package name in small, muted text
    if (row.dateText) {
      subY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500 muted
      doc.text(row.dateText, margin + 4, subY);
    }

    // Optional short description (1 line in small text, no feature clutter)
    if (row.shortDesc) {
      subY += 3.5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(row.shortDesc, margin + 4, subY);
    }

    // Price on the Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${pdfCurrencySymbol} ${row.priceVal.toLocaleString('en-IN')}`, pageWidth - margin - 4, pkgY + 4.5, { align: 'right' });

    pkgY += row.rowHeight;

    // Subtle line between multiple package rows
    if (idx < packageRows.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.line(margin + 4, pkgY, pageWidth - margin - 4, pkgY);
    }
  });

  // 4. FINANCIAL SUMMARY & AMOUNT IN WORDS
  curY += totalPackagesH + 7;

  const sumBoxW = 78;
  const sumBoxX = pageWidth - margin - sumBoxW;
  const leftBoxW = sumBoxX - margin - 6;

  // Pre-calculate Left Box lines (Amount words + custom notes)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const wordsLines = wrapAndBreakText(doc, amountWords, leftBoxW - 10);

  const rawNotes = invoice.notes ? String(invoice.notes).trim() : '';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const notesLines = rawNotes ? wrapAndBreakText(doc, `Notes: ${rawNotes}`, leftBoxW - 10) : [];

  const leftFinH = 6 + wordsLines.length * 4 + (notesLines.length > 0 ? notesLines.length * 3.5 + 4 : 0) + 12;
  const rightFinH = hasGst ? 46 : (isPending && pendingAmount > 0 ? 44 : 38);
  const finH = Math.max(leftFinH, rightFinH, 38);

  // Left Box: Amount in words & payment details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, leftBoxW, finH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS', margin + 5, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(wordsLines, margin + 5, curY + 11.5);

  let nY = curY + 11.5 + wordsLines.length * 4;
  if (notesLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(notesLines, margin + 5, nY);
    nY += notesLines.length * 3.5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    hasGst
      ? 'Valid for Corporate Wellness Reimbursement & Official Tax Records'
      : 'Official Payment Receipt • Non-GST Payment Record',
    margin + 5,
    curY + finH - 3.5
  );

  // Right Box: Clean Transparent Financial Breakdown
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(sumBoxX, curY, sumBoxW, finH, 2.5, 2.5, 'FD');

  let rY = curY + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const halfTaxRate = (taxRate / 2).toFixed(taxRate % 2 === 0 ? 0 : 1);
  if (hasGst) {
    doc.text('Plan Base Fee:', sumBoxX + 5, rY);
    doc.text(`${pdfCurrencySymbol} ${taxableBase.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });

    rY += 4.5;
    doc.text(`CGST (${halfTaxRate}%):`, sumBoxX + 5, rY);
    doc.text(`${pdfCurrencySymbol} ${cgst.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });

    rY += 4.5;
    doc.text(`SGST (${halfTaxRate}%):`, sumBoxX + 5, rY);
    doc.text(`${pdfCurrencySymbol} ${sgst.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });
  } else {
    doc.text('Plan Fee:', sumBoxX + 5, rY);
    doc.text(`${pdfCurrencySymbol} ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });

    rY += 4.5;
    doc.text('Tax Applied:', sumBoxX + 5, rY);
    doc.text('None (Non-GST Payment)', pageWidth - margin - 5, rY, { align: 'right' });
  }

  if (isPending && pendingAmount > 0) {
    rY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('Pending Balance Due:', sumBoxX + 5, rY);
    doc.text(`${pdfCurrencySymbol} ${pendingAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });
  }

  // Total Banner inside box
  rY += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(sumBoxX + 4, rY, pageWidth - margin - 4, rY);

  rY += 1.5;
  if (isPending) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(sumBoxX + 3, rY, sumBoxW - 6, 9.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('AMOUNT RECEIVED:', sumBoxX + 5, rY + 6);

    doc.setFontSize(9.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`${pdfCurrencySymbol} ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY + 6, { align: 'right' });
  } else {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(sumBoxX + 3, rY, sumBoxW - 6, 9.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL PAID:', sumBoxX + 5, rY + 6);

    doc.setFontSize(10.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`${pdfCurrencySymbol} ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY + 6, { align: 'right' });
  }

  // 5. CLUB POLICIES & DIGITAL SEAL
  curY += finH + 7;
  doc.setDrawColor(241, 245, 249);
  doc.line(margin, curY, pageWidth - margin, curY);

  curY += 4;
  // Left: Club guidelines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MEMBERSHIP GUIDELINES & SUPPORT', margin, curY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const customTerms = gymInfo?.terms_and_conditions || gymInfo?.terms;
  if (customTerms) {
    const termLines = String(customTerms).split('\n').map((l) => l.trim()).filter(Boolean);
    termLines.slice(0, 3).forEach((line, i) => {
      doc.text(line.replace(/^[-•*]\s*/, `${i + 1}. `), margin, curY + 4.5 + i * 4);
    });
  } else {
    doc.text('1. Present your Mobile App QR Turnstile Pass at the front gate for entry.', margin, curY + 4.5);
    doc.text('2. Membership subscriptions once processed are non-transferable & non-refundable.', margin, curY + 8.5);
    const helpContact = gymEmail || (gymPhone ? `phone ${gymPhone}` : 'the front desk');
    doc.text(`3. Inquiries & Freeze requests: Contact front desk or reach ${helpContact}.`, margin, curY + 12.5);
  }

  // Right: Clean Digital Stamp
  const sealX = pageWidth - margin - 54;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sealX, curY - 2, 54, 21, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  const sealGymTitle = wrapAndBreakText(doc, (gymName || 'AUTHORIZED GYM').toUpperCase(), 48);
  doc.text(sealGymTitle[0] || 'AUTHORIZED GYM', sealX + 27, curY + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified Digital Receipt', sealX + 27, curY + 7.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const sealCreatorLines = wrapAndBreakText(doc, createdByName, 48);
  doc.text(sealCreatorLines[0] || 'Staff', sealX + 27, curY + 12.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  const signatoryTitle = gymInfo?.signatory_text || gymInfo?.signatoryText || 'Authorized Signatory';
  doc.text(signatoryTitle, sealX + 27, curY + 17, { align: 'center' });

  // Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const customFooter = gymInfo?.footer_text || gymInfo?.footerText;
  const defaultFooter = gymName
    ? (hasGst ? `Thank you for choosing ${gymName} • Official Tax Invoice & Payment Receipt` : `Thank you for choosing ${gymName} • Official Payment Receipt`)
    : (hasGst ? 'Official Tax Invoice & Payment Receipt' : 'Official Payment Receipt');
  doc.text(
    customFooter || defaultFooter,
    pageWidth / 2,
    pageHeight - margin + 2,
    { align: 'center' }
  );

  const blob = doc.output('blob');
  const safeMemberFile = memberName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Receipt_${invoiceId}_${safeMemberFile}.pdf`;
  const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

  return {
    doc,
    blob,
    pdfFile,
    fileName,
    createdByName,
    output: (...args) => doc.output(...args),
    save: (...args) => doc.save(...args),
    getBlobUrl: () => URL.createObjectURL(blob),
    download: () => downloadPdfBlob(blob, fileName, doc)
  };
}

/**
 * Direct shortcut to generate and trigger download of Invoice PDF
 */
export function downloadInvoicePdf(arg1, arg2, arg3) {
  const result = generateInvoicePdf(arg1, arg2, arg3);
  return result.download();
}

/**
 * Share the invoice in PDF format to the member's mobile number
 */
export async function shareInvoicePdfToMobile(arg1, arg2, arg3) {
  let invoice = null;
  let member = null;
  let gymInfo = null;
  let onToast = null;

  if (arg1 && typeof arg1 === 'object' && ('invoice' in arg1 || 'onToast' in arg1)) {
    invoice = arg1.invoice;
    member = arg1.member;
    gymInfo = arg1.gymInfo;
    onToast = arg1.onToast;
  } else {
    invoice = arg1;
    if (arg2 && typeof arg2 === 'object') {
      if (arg2.currency || arg2.gst_number || arg2.tagline) {
        gymInfo = arg2;
      } else {
        member = arg2;
      }
    }
    if (typeof arg3 === 'function') {
      onToast = arg3;
    }
  }

  if (!invoice) {
    if (onToast) onToast('Invoice data not available to share.', 'error');
    return false;
  }

  try {
    const { blob, fileName } = generateInvoicePdf({ invoice, member, gymInfo });

    const memberName = member?.name || invoice.memberName || invoice.member_name || 'Member';
    const invoiceId = (invoice.id || invoice.invoiceNumber || invoice.invoice_number || 'INV-001').toString().toUpperCase();
    const rawPhone = member?.phone || invoice.phone || invoice.memberPhone || invoice.member_phone || '';
    const cleanPhone = formatWhatsAppPhone(rawPhone);

    const planName = invoice.planName || invoice.plan_name || member?.planName || member?.plan_name || 'Gym Membership';
    const amountVal = Number(invoice.amount ?? invoice.paidAmount ?? invoice.paid_amount ?? invoice.totalAmount ?? 0);
    const amount = amountVal.toLocaleString('en-IN');

    const pendingAmount = Number(
      invoice.pendingAmount ??
      invoice.duesAmount ??
      invoice.dues_amount ??
      ((invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'partial'
        ? (member?.duesAmount || member?.dues_amount || 0)
        : 0)
    );
    const isPending = (invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'partial' || pendingAmount > 0;
    const gymName = gymInfo?.name || invoice.gymName || 'Our Gym';
    const displayDate = formatInvoiceDate(invoice.issueDate || invoice.issue_date || invoice.invoiceDate || invoice.date) || 'Today';

    const messageText = isPending
      ? `*${gymName.toUpperCase()} - INVOICE (PENDING)*\n\nDear *${memberName}*,\nHere is your official gym membership invoice:\n\n📄 *Invoice No:* #${invoiceId}\n📅 *Date:* ${displayDate}\n🏷️ *Plan:* ${planName}\n💳 *Payment Mode:* ${invoice.paymentMethod || 'UPI'}\n⚠️ *Status:* Pending\n💰 *Amount Paid:* ₹${amount}\n🔴 *Pending Balance Due:* ₹${pendingAmount.toLocaleString('en-IN')}\n\nYour official Invoice PDF (${fileName}) has been downloaded to your device.\n\nThank you for working out with ${gymName}!`
      : `*${gymName.toUpperCase()} - PAYMENT RECEIPT*\n\nDear *${memberName}*,\nHere is your official gym membership receipt:\n\n📄 *Receipt No:* #${invoiceId}\n📅 *Date:* ${displayDate}\n🏷️ *Plan:* ${planName}\n💳 *Payment Mode:* ${invoice.paymentMethod || 'UPI'}\n✅ *Status:* Paid & Verified\n💰 *Total Settled:* ₹${amount}\n\nYour official Receipt PDF (${fileName}) has been downloaded to your device.\n\nThank you for working out with ${gymName}!`;

    // 1. Download PDF receipt blob immediately to ensure user has the file
    downloadPdfBlob(blob, fileName);

    // 2. Open WhatsApp directly with prefilled message
    openWhatsApp({
      phone: cleanPhone,
      text: messageText,
      recipientName: memberName,
      onToast: onToast
        ? () => onToast(`Receipt PDF downloaded (${fileName}) and WhatsApp opened for ${memberName}!`, 'success')
        : null
    });

    return true;
  } catch (error) {
    console.error('Failed to share invoice PDF:', error);
    if (onToast) {
      onToast('Failed to generate or share PDF invoice: ' + error.message, 'error');
    }
    return false;
  }
}
