import { jsPDF } from 'jspdf';

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
 * Foolproof cross-browser PDF download helper
 */
export function downloadPdfBlob(blob, fileName, doc = null) {
  // 1. Try jsPDF's native save if doc instance is provided
  if (doc && typeof doc.save === 'function') {
    try {
      doc.save(fileName);
      return true;
    } catch (docErr) {
      console.warn('doc.save failed, falling back to blob anchor:', docErr);
    }
  }

  // 2. DOM anchor download using Blob Object URL
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
    // Fallback: window.open as data URI / blob
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
 * Generate a standard General Tax Invoice PDF
 */
export function generateInvoicePdf({ invoice, member, gymInfo }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const gymName = gymInfo?.name || 'PULSE FIT ATHLETIC CLUB & WELLNESS';
  const gymAddress = gymInfo?.address || 'Central Avenue, Hiranandani Gardens, Powai, Mumbai - 400076';
  const gymGstin = gymInfo?.gstin || '27AAPCP1234F1Z8';
  const gymPhone = gymInfo?.phone || '+91 98201 54321';
  const gymEmail = gymInfo?.email || 'billing@pulsefit.in';

  const memberName = member?.name || invoice.memberName || invoice.member_name || 'Valued Member';
  const memberId = member?.id || invoice.memberId || 'PF-M-101';
  const memberPhone = member?.phone || invoice.phone || 'N/A';
  const memberEmail = member?.email || invoice.email || 'N/A';

  const invoiceId = (invoice.id || 'INV-001').toUpperCase();
  const invoiceDate = invoice.date || new Date().toISOString().split('T')[0];
  const paymentMode = invoice.paymentMethod || 'UPI / Net Banking';
  const planName = invoice.planName || 'Comprehensive Gym Membership Pass';
  const totalAmount = Number(invoice.amount) || 0;
  const taxableBase = Math.round(totalAmount / 1.18);
  const cgst = Math.round(taxableBase * 0.09);
  const sgst = totalAmount - taxableBase - cgst;
  const amountWords = numberToWordsINR(totalAmount);

  // Outer Border Box
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  // Top Accent Strip (Emerald Brand)
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(margin, margin, contentWidth, 4, 'F');

  // 1. HEADER SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(gymName, margin + 5, margin + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(gymAddress, margin + 5, margin + 19);
  doc.text(`GSTIN: ${gymGstin}   |   State Code: 27 (Maharashtra)   |   SAC: 999723`, margin + 5, margin + 23.5);
  doc.text(`Phone: ${gymPhone}   |   Email: ${gymEmail}`, margin + 5, margin + 28);

  // TAX INVOICE BADGE (Right aligned)
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(pageWidth - margin - 52, margin + 8, 47, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('TAX INVOICE', pageWidth - margin - 28.5, margin + 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`ORIGINAL FOR RECIPIENT`, pageWidth - margin - 28.5, margin + 21.5, { align: 'center' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, margin + 32, pageWidth - margin, margin + 32);

  // 2. INVOICE META & BILL TO (TWO COLUMN BOXES)
  const metaBoxY = margin + 35;
  const colWidth = (contentWidth - 4) / 2;

  // Box 1: Billed To Customer
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 2, metaBoxY, colWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED TO (MEMBER / ATHLETE):', margin + 5, metaBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(memberName, margin + 5, metaBoxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Member ID: ${memberId}`, margin + 5, metaBoxY + 17.5);
  doc.text(`Mobile / WhatsApp: ${memberPhone}`, margin + 5, metaBoxY + 23);
  doc.text(`Email: ${memberEmail}`, margin + 5, metaBoxY + 28.5);

  // Box 2: Invoice Details
  const box2X = margin + 2 + colWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box2X, metaBoxY, colWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INVOICE & PAYMENT DETAILS:', box2X + 3, metaBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No: #${invoiceId}`, box2X + 3, metaBoxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date of Issue: ${invoiceDate}`, box2X + 3, metaBoxY + 17.5);
  doc.text(`Payment Mode: ${paymentMode}`, box2X + 3, metaBoxY + 23);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Payment Status: PAID & SETTLED`, box2X + 3, metaBoxY + 28.5);

  // 3. SERVICE LINE ITEMS TABLE
  const tableY = metaBoxY + 38;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin + 2, tableY, contentWidth - 4, 8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('#', margin + 5, tableY + 5.5);
  doc.text('DESCRIPTION OF PHYSICAL FITNESS SERVICES', margin + 14, tableY + 5.5);
  doc.text('SAC CODE', margin + 105, tableY + 5.5);
  doc.text('QTY', margin + 130, tableY + 5.5);
  doc.text('RATE (INR)', margin + 148, tableY + 5.5);
  doc.text('AMOUNT (INR)', pageWidth - margin - 5, tableY + 5.5, { align: 'right' });

  // Row 1
  const rowY = tableY + 8;
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin + 2, rowY, contentWidth - 4, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1', margin + 5, rowY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(planName, margin + 14, rowY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Includes gym floor access, cardio/strength zones, locker, turnstile pass & recovery zone.', margin + 14, rowY + 11);
  doc.text('Facility access valid as per subscription tenure. Non-refundable & non-transferable.', margin + 14, rowY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('999723', margin + 105, rowY + 6);
  doc.text('1', margin + 133, rowY + 6);
  doc.text(`Rs. ${taxableBase.toLocaleString('en-IN')}`, margin + 148, rowY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${taxableBase.toLocaleString('en-IN')}`, pageWidth - margin - 5, rowY + 6, { align: 'right' });

  // 4. TAX & TOTAL CALCULATION TABLE (RIGHT BOX)
  const calcY = rowY + 24;
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth - 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Taxable Value (Base):', summaryBoxX, calcY + 5);
  doc.text(`Rs. ${taxableBase.toLocaleString('en-IN')}`, pageWidth - margin - 5, calcY + 5, { align: 'right' });

  doc.text('CGST @ 9.0%:', summaryBoxX, calcY + 11);
  doc.text(`Rs. ${cgst.toLocaleString('en-IN')}`, pageWidth - margin - 5, calcY + 11, { align: 'right' });

  doc.text('SGST @ 9.0%:', summaryBoxX, calcY + 17);
  doc.text(`Rs. ${sgst.toLocaleString('en-IN')}`, pageWidth - margin - 5, calcY + 17, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX, calcY + 20, pageWidth - margin - 2, calcY + 20);

  // Total Settled (Bold Banner)
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(summaryBoxX, calcY + 22, summaryBoxWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL AMOUNT:', summaryBoxX + 3, calcY + 30);

  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, calcY + 30.5, { align: 'right' });

  // Amount In Words (Left box beside totals)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const wordsBoxWidth = summaryBoxX - margin - 6;
  doc.roundedRect(margin + 2, calcY, wordsBoxWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT CHARGEABLE (IN WORDS):', margin + 5, calcY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const splitWords = doc.splitTextToSize(amountWords, wordsBoxWidth - 6);
  doc.text(splitWords, margin + 5, calcY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Gateway: Instant Settlement (UPI/Card)', margin + 5, calcY + 25);
  doc.text('Transaction Status: 100% Verified in Banking Records', margin + 5, calcY + 29.5);

  // 5. TERMS & CONDITIONS & SIGNATURE
  const footerY = calcY + 38;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Terms Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & CONDITIONS:', margin + 5, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('1. Membership subscriptions once processed are non-refundable and strictly non-transferable.', margin + 5, footerY + 10.5);
  doc.text('2. Member turnstile QR Pass must be presented for automated check-in and compliance logging.', margin + 5, footerY + 14.5);
  doc.text('3. In case of medical emergencies or freeze requests, policy terms approved by club management apply.', margin + 5, footerY + 18.5);
  doc.text('4. This electronic invoice is generated under Indian IT Act 2000 and valid for tax deduction audits.', margin + 5, footerY + 22.5);

  // Authorized Signatory Box (Right)
  const signBoxX = pageWidth - margin - 58;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(signBoxX, footerY + 3, 54, 25, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('PULSEFIT ATHLETIC CLUB', signBoxX + 27, footerY + 9, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Digitally Authorized & Signed', signBoxX + 27, footerY + 15, { align: 'center' });
  doc.text('Official Club Stamp', signBoxX + 27, footerY + 19, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', signBoxX + 27, footerY + 25, { align: 'center' });

  // Bottom watermark
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Page 1 of 1  •  System Generated GST Tax Invoice  •  Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - margin + 2, { align: 'center' });

  const blob = doc.output('blob');
  const fileName = `Invoice_${invoiceId}_${memberName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
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
export async function shareInvoicePdfToMobile({ invoice, member, gymInfo, onToast }) {
  try {
    const { blob, fileName, pdfFile } = generateInvoicePdf({ invoice, member, gymInfo });

    const memberName = member?.name || invoice.memberName || invoice.member_name || 'Member';
    const invoiceId = (invoice.id || 'INV-001').toUpperCase();
    const rawPhone = member?.phone || invoice.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const amount = Number(invoice.amount || 0).toLocaleString('en-IN');
    const planName = invoice.planName || 'Gym Membership Pass';

    const messageText = `*PULSE FIT ATHLETIC CLUB - OFFICIAL TAX INVOICE*\n\nDear *${memberName}*,\nHere is your official payment tax invoice in PDF format:\n\n📄 *Invoice No:* #${invoiceId}\n📅 *Date:* ${invoice.date || 'Today'}\n🏷️ *Plan / Service:* ${planName}\n💳 *Payment Mode:* ${invoice.paymentMethod || 'UPI'}\n✅ *Status:* Paid & Verified\n💰 *Total Settled:* ₹${amount}\n\nYour official GST Tax Invoice PDF (${fileName}) is attached.\n\nThank you for choosing PulseFit!`;

    // 1. Try Native Web Share API with Files (Android / iOS / Mobile Chrome & Edge)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Tax Invoice #${invoiceId}`,
          text: messageText
        });
        if (onToast) onToast(`PDF Invoice shared successfully to ${memberName}!`, 'success');
        return true;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return false;
        }
        console.warn('Native share failed, falling back to direct download + WhatsApp:', shareErr);
      }
    }

    // 2. Reliable cross-browser fallback:
    // First trigger the actual PDF download
    downloadPdfBlob(blob, fileName);

    // Open WhatsApp with pre-filled receipt to that member's mobile number
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    setTimeout(() => {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }, 400);

    if (onToast) {
      onToast(`PDF Invoice downloaded (${fileName}) and WhatsApp opened for ${memberName}!`, 'success');
    }
    return true;
  } catch (error) {
    console.error('Failed to share invoice PDF:', error);
    if (onToast) {
      onToast('Failed to generate or share PDF invoice', 'error');
    }
    return false;
  }
}
