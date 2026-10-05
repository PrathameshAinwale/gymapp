import { jsPDF } from 'jspdf';
import { formatWhatsAppPhone, openWhatsApp } from './whatsapp';

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
  if (doc && typeof doc.save === 'function') {
    try {
      doc.save(fileName);
      return true;
    } catch (docErr) {
      console.warn('doc.save failed, falling back to blob anchor:', docErr);
    }
  }

  try {
    const url = URL.createObjectURL(blob);
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
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      return true;
    } catch (e) {
      console.error('All download methods failed:', e);
      return false;
    }
  }
}

/**
 * Generate a modern, elegant Gym Membership & Payment Receipt PDF
 * (Clean fitness club format — easy to read, transparent, and aesthetically premium)
 */
export function generateInvoicePdf({ invoice, member, gymInfo }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const gymName = gymInfo?.name || 'ARCHFIT ATHLETIC CLUB';
  const gymAddress = gymInfo?.address || 'Central Avenue, Hiranandani Gardens, Powai, Mumbai - 400076';
  const gymGstin = gymInfo?.gstin || '27AAPCP1234F1Z8';
  const gymPhone = gymInfo?.phone || '+91 98201 54321';
  const gymEmail = gymInfo?.email || 'billing@archfit.in';

  const memberName = member?.name || invoice.memberName || invoice.member_name || 'Valued Member';
  const memberId = member?.id || invoice.memberId || 'AF-M-101';
  const memberPhone = member?.phone || invoice.phone || 'N/A';
  const memberEmail = member?.email || invoice.email || 'N/A';

  const invoiceId = (invoice.id || 'INV-001').toUpperCase();
  const invoiceDate = invoice.date || new Date().toISOString().split('T')[0];
  const paymentMode = invoice.paymentMethod || 'UPI';
  const planName = invoice.planName || 'Comprehensive Gym Membership Pass';
  const totalAmount = Number(invoice.amount) || 0;
  const pendingAmount = Number(
    invoice.pendingAmount ??
    invoice.duesAmount ??
    invoice.dues_amount ??
    ((invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'partial'
      ? (member?.duesAmount || member?.dues_amount || 0)
      : 0)
  );
  const isPending = (invoice.status || '').toLowerCase() === 'pending' || (invoice.status || '').toLowerCase() === 'partial' || pendingAmount > 0;
  const taxableBase = Math.round(totalAmount / 1.18);
  const totalGst = totalAmount - taxableBase;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;
  const amountWords = numberToWordsINR(totalAmount);

  // Background subtle canvas
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Accent Bar (Amber for pending, emerald for paid)
  if (isPending) {
    doc.setFillColor(245, 158, 11); // amber-500
  } else {
    doc.setFillColor(16, 185, 129); // emerald-500
  }
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 1. BRAND & RECEIPT HEADER
  let curY = margin + 4;

  // Gym Monogram / Logo Mark
  if (isPending) {
    doc.setFillColor(245, 158, 11);
  } else {
    doc.setFillColor(16, 185, 129);
  }
  doc.roundedRect(margin, curY, 11, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('PF', margin + 5.5, curY + 7.5, { align: 'center' });

  // Gym Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(gymName.toUpperCase(), margin + 15, curY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Premium Fitness, Strength & Wellness Club', margin + 15, curY + 10.5);

  // Right Side: Receipt Status Pill
  const pillW = 56;
  const pillH = 14;
  const pillX = pageWidth - margin - pillW;

  if (isPending) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.roundedRect(pillX, curY - 1, pillW, pillH, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('PENDING INVOICE', pillX + pillW / 2, curY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`Due: Rs. ${pendingAmount.toLocaleString('en-IN')}`, pillX + pillW / 2, curY + 9.5, { align: 'center' });
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(pillX, curY - 1, pillW, pillH, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('PAYMENT RECEIPT', pillX + pillW / 2, curY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`Payment Verified & Paid`, pillX + pillW / 2, curY + 9.5, { align: 'center' });
  }

  // Gym Contact Sub-bar
  curY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${gymAddress}  •  Phone: ${gymPhone}  •  GSTIN: ${gymGstin}`, margin, curY);

  let rawCreator = invoice.createdByName || invoice.created_by_name || invoice.executive || invoice.creatorName || invoice.creator?.name || 'Staff';
  const createdByName = rawCreator.replace(/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i, '').trim() || 'Staff';

  // Soft Divider
  curY += 5;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.6);
  doc.line(margin, curY, pageWidth - margin, curY);

  // 2. MEMBER & RECEIPT INFORMATION (TWO ELEGANT CARDS)
  curY += 6;
  const colW = (contentWidth - 6) / 2;
  const cardH = 38;

  // Card A: Member Info
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, curY, colW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO MEMBER', margin + 5, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(memberName, margin + 5, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Member ID: ${memberId}`, margin + 5, curY + 19);
  doc.text(`Mobile: ${memberPhone}`, margin + 5, curY + 24.5);
  if (memberEmail && memberEmail !== 'N/A') {
    doc.text(`Email: ${memberEmail}`, margin + 5, curY + 29.5);
  } else {
    doc.text(`State: Maharashtra (27)`, margin + 5, curY + 29.5);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Verification: KYC Verified Athlete', margin + 5, curY + 34.5);

  // Card B: Receipt / Invoice Details
  const cardBX = margin + colW + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardBX, curY, colW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RECEIPT DETAILS', cardBX + 5, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Receipt #${invoiceId}`, cardBX + 5, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${invoiceDate}`, cardBX + 5, curY + 18.5);
  doc.text(`Payment: ${paymentMode}`, cardBX + 5, curY + 23.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`Created By: ${createdByName}`, cardBX + 5, curY + 28.5);

  doc.setFont('helvetica', 'bold');
  if (isPending) {
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`Status: Pending (Rs. ${pendingAmount.toLocaleString('en-IN')} Due)`, cardBX + 5, curY + 34);
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text(`Status: Paid & Settled (Full)`, cardBX + 5, curY + 34);
  }

  // 3. MEMBERSHIP PLAN & PRIVILEGES HERO CARD
  curY += cardH + 8;

  const isPT = planName.toLowerCase().includes('pt') || planName.toLowerCase().includes('personal');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('SUBSCRIPTION & ACCESS DETAILS', margin, curY);

  curY += 3;
  const planCardH = 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, planCardH, 3, 3, 'FD');

  // Accent badge inside card
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin + 4, curY + 4, 38, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text('ACTIVE MEMBERSHIP', margin + 23, curY + 8, { align: 'center' });

  // Plan Title (Bold & Clear)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(planName, margin + 4, curY + 16.5);

  // Plan Price on the Right
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 6, curY + 16.5, { align: 'right' });

  // Subtle separator inside plan card
  doc.setDrawColor(241, 245, 249);
  doc.line(margin + 4, curY + 20.5, pageWidth - margin - 4, curY + 20.5);

  // Included Privileges (Easy to read checkmarks instead of manufacturing columns)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  if (isPT) {
    doc.text('• 1-on-1 Dedicated Certified Coach & Strength Guidance', margin + 4, curY + 26);
    doc.text('• Individualized Nutrition, Calorie & Macro Target Plan', margin + 4, curY + 31);
    doc.text('• Biometric Workout Logging & OTP Verification', margin + 4, curY + 36);
    doc.text('• Full Access to Strength & Cardio Recovery Facilities', margin + 4, curY + 41);
  } else {
    doc.text('• Unlimited Access to Cardio, Strength & Free Weight Zones', margin + 4, curY + 26);
    doc.text('• Automated Turnstile QR Pass on ArchFit Mobile App', margin + 4, curY + 31);
    doc.text('• Locker Facilities, Steam Room & Shower Access', margin + 4, curY + 36);
    doc.text('• Complimentary InBody Body Composition & BMI Assessment', margin + 4, curY + 41);
  }

  // Right side of plan card: Validity note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('All-inclusive club pass', pageWidth - margin - 6, curY + 26, { align: 'right' });
  doc.text('SAC Code: 999723', pageWidth - margin - 6, curY + 31, { align: 'right' });
  doc.text('Non-transferable', pageWidth - margin - 6, curY + 36, { align: 'right' });

  // 4. FINANCIAL SUMMARY & AMOUNT IN WORDS
  curY += planCardH + 8;

  const sumBoxW = 78;
  const sumBoxX = pageWidth - margin - sumBoxW;
  const leftBoxW = sumBoxX - margin - 6;
  const finH = 40;

  // Left Box: Amount in words & payment details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, leftBoxW, finH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS', margin + 5, curY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const wordsLines = doc.splitTextToSize(amountWords, leftBoxW - 10);
  doc.text(wordsLines, margin + 5, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Gateway: Instant Settlement • Verified in Bank Records', margin + 5, curY + 27);
  doc.text('Valid for Corporate Wellness Reimbursement & Tax Records', margin + 5, curY + 32);

  // Right Box: Clean Transparent Financial Breakdown
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(sumBoxX, curY, sumBoxW, finH, 2.5, 2.5, 'FD');

  let rY = curY + 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Plan Base Fee:', sumBoxX + 5, rY);
  doc.text(`Rs. ${taxableBase.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });

  rY += 5.5;
  doc.text('CGST (9%):', sumBoxX + 5, rY);
  doc.text(`Rs. ${cgst.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });

  rY += 5;
  doc.text('SGST (9%):', sumBoxX + 5, rY);
  doc.text(`Rs. ${sgst.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });

  if (isPending && pendingAmount > 0) {
    rY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('Pending Balance Due:', sumBoxX + 5, rY);
    doc.text(`Rs. ${pendingAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, rY, { align: 'right' });
  }

  // Total Banner inside box
  rY += 3.5;
  doc.setDrawColor(203, 213, 225);
  doc.line(sumBoxX + 4, rY, pageWidth - margin - 4, rY);

  rY += 2;
  if (isPending) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(sumBoxX + 3, rY, sumBoxW - 6, 11, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('AMOUNT RECEIVED:', sumBoxX + 6, rY + 7);

    doc.setFontSize(10.5);
    doc.setTextColor(217, 119, 6);
    doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 6, rY + 7, { align: 'right' });
  } else {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(sumBoxX + 3, rY, sumBoxW - 6, 11, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL PAID:', sumBoxX + 6, rY + 7);

    doc.setFontSize(11.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 6, rY + 7, { align: 'right' });
  }

  // 5. CLUB POLICIES & DIGITAL SEAL
  curY += finH + 10;
  doc.setDrawColor(241, 245, 249);
  doc.line(margin, curY, pageWidth - margin, curY);

  curY += 5;
  // Left: Friendly club guidelines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MEMBERSHIP GUIDELINES & SUPPORT', margin, curY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('1. Present your Mobile App QR Turnstile Pass at the front gate for entry.', margin, curY + 5);
  doc.text('2. Membership subscriptions once processed are non-transferable & non-refundable.', margin, curY + 9.5);
  doc.text('3. Inquiries & Freeze requests: Contact front desk or email billing@archfit.in.', margin, curY + 14);

  // Right: Clean Digital Stamp
  const sealX = pageWidth - margin - 54;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sealX, curY - 2, 54, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('ARCHFIT ATHLETIC CLUB', sealX + 27, curY + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified Digital Receipt', sealX + 27, curY + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(createdByName, sealX + 27, curY + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory', sealX + 27, curY + 18.5, { align: 'center' });

  // Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for choosing ArchFit Athletic Club • Official Tax Invoice & Payment Receipt', pageWidth / 2, pageHeight - margin + 2, { align: 'center' });

  const blob = doc.output('blob');
  const fileName = `Receipt_${invoiceId}_${memberName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

  return {
    doc,
    blob,
    pdfFile,
    fileName,
    download: () => downloadPdfBlob(blob, fileName, doc)
  };
}

/**
 * Direct shortcut to generate and trigger download of Invoice PDF
 */
export function downloadInvoicePdf({ invoice, member, gymInfo }) {
  const result = generateInvoicePdf({ invoice, member, gymInfo });
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
    const gymName = gymInfo?.name || invoice.gymName || 'ARCHFIT ATHLETIC CLUB';

    const messageText = isPending
      ? `*${gymName.toUpperCase()} - INVOICE (PENDING)*\n\nDear *${memberName}*,\nHere is your official gym membership invoice:\n\n📄 *Invoice No:* #${invoiceId}\n📅 *Date:* ${invoice.date || 'Today'}\n🏷️ *Plan:* ${planName}\n💳 *Payment Mode:* ${invoice.paymentMethod || 'UPI'}\n⚠️ *Status:* Pending\n💰 *Amount Paid:* ₹${amount}\n🔴 *Pending Balance Due:* ₹${pendingAmount.toLocaleString('en-IN')}\n\nYour official Invoice PDF (${fileName}) has been downloaded to your device.\n\nThank you for working out with ${gymName}!`
      : `*${gymName.toUpperCase()} - PAYMENT RECEIPT*\n\nDear *${memberName}*,\nHere is your official gym membership receipt:\n\n📄 *Receipt No:* #${invoiceId}\n📅 *Date:* ${invoice.date || 'Today'}\n🏷️ *Plan:* ${planName}\n💳 *Payment Mode:* ${invoice.paymentMethod || 'UPI'}\n✅ *Status:* Paid & Verified\n💰 *Total Settled:* ₹${amount}\n\nYour official Receipt PDF (${fileName}) has been downloaded to your device.\n\nThank you for working out with ${gymName}!`;

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
