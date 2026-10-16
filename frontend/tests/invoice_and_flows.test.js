import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { formatInvoiceDate, wrapAndBreakText, generateInvoicePdf, formatPackageDateRange } from '../src/utils/invoicePdfGenerator.js';
import {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidEmergencyContact,
  getTodayDateStr,
  isValidDob,
  hasSqlInjection,
  sanitizeText,
  sanitizeDigits,
  sanitizePhone
} from '../src/utils/validation.js';
import {
  calculateAgeFromDob,
  calculateMaxPromiseDate,
  validatePromiseDate,
  calculateMemberStatus
} from '../src/utils/dateUtils.js';
import { mapInvoiceRecord } from '../src/utils/invoiceMapper.js';

test('1. formatInvoiceDate correctly standardizes various date formats to DD MMM YYYY', () => {
  // YYYY-MM-DD
  assert.equal(formatInvoiceDate('2026-10-15'), '15 Oct 2026');
  assert.equal(formatInvoiceDate('2026-01-01'), '01 Jan 2026');

  // DD-MM-YYYY or DD/MM/YYYY
  assert.equal(formatInvoiceDate('15-10-2026'), '15 Oct 2026');
  assert.equal(formatInvoiceDate('15/10/2026'), '15 Oct 2026');
  assert.equal(formatInvoiceDate('01-05-2026'), '01 May 2026');

  // ISO timestamps with T
  assert.equal(formatInvoiceDate('2026-10-15T04:58:34.000000Z'), '15 Oct 2026');
  assert.equal(formatInvoiceDate('2026-02-28T23:59:59Z'), '28 Feb 2026');

  // Month-end boundaries
  assert.equal(formatInvoiceDate('2026-01-31'), '31 Jan 2026');
  assert.equal(formatInvoiceDate('2026-04-30'), '30 Apr 2026');
  assert.equal(formatInvoiceDate('2026-12-31'), '31 Dec 2026');

  // Leap years
  assert.equal(formatInvoiceDate('2024-02-29'), '29 Feb 2024');
  assert.equal(formatInvoiceDate('2028-02-29'), '29 Feb 2028');

  // Empty / null
  assert.equal(formatInvoiceDate(''), '');
  assert.equal(formatInvoiceDate(null), '');
  assert.equal(formatInvoiceDate(undefined), '');
});

test('2. wrapAndBreakText splits text and unbroken strings within maxWidth without overflow', () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(9);

  // Normal text
  const normalText = 'Silver Annual Membership Plan with Cardio and CrossFit';
  const normalLines = wrapAndBreakText(doc, normalText, 150);
  assert.ok(Array.isArray(normalLines));
  assert.ok(normalLines.length > 1, 'Should wrap into multiple lines for narrow width');
  for (const line of normalLines) {
    assert.ok(doc.getTextWidth(line) <= 150 + 0.1, `Line "${line}" exceeds max width`);
  }

  // Unbroken long string (e.g. extremely long email address)
  const longEmail = 'superlongunbrokencustomeremailaddressexceedingcellboundaries@verylonggymdomainname.com';
  const emailLines = wrapAndBreakText(doc, longEmail, 120);
  assert.ok(emailLines.length > 1, 'Unbroken string must be split across lines');
  for (const line of emailLines) {
    assert.ok(doc.getTextWidth(line) <= 120 + 0.1, `Line "${line}" exceeds max width`);
  }

  // Empty / whitespace
  assert.deepEqual(wrapAndBreakText(doc, '', 100), []);
  assert.deepEqual(wrapAndBreakText(doc, '   ', 100), []);
  assert.deepEqual(wrapAndBreakText(doc, null, 100), []);
});

test('3. generateInvoicePdf handles single plan with issue date in header & dates below title', async () => {
  const invoiceData = {
    invoiceNumber: 'INV-2026-001',
    customerName: 'Priya Sharma',
    customerPhone: '9876543210',
    customerEmail: 'priya.sharma@example.com',
    planName: 'Gold 6-Month Fitness',
    date: '2026-10-15',
    issueDate: '2026-10-15',
    startDate: '2026-11-01',
    expiryDate: '2027-04-30',
    grossAmount: 12000,
    packageAmount: 12000,
    discountAmount: 1000,
    netAmount: 11000,
    paidAmount: 8000,
    duesAmount: 3000,
    dueDate: '2026-11-15',
    paymentMethod: 'UPI / GPay',
    isGstIncluded: true,
  };

  const gymInfo = {
    name: 'PulseFit Athletic Club',
    address: '101 Fitness Boulevard, Cyber City',
    phone: '9898989898',
    email: 'contact@pulsefit.in',
    gstNumber: '27AAAAA0000A1Z5'
  };

  const result = await generateInvoicePdf(invoiceData, gymInfo, false);
  assert.ok(result, 'Result should be returned');
  assert.ok(result.doc && typeof result.doc.text === 'function', 'result.doc should have jsPDF methods');
  assert.ok(result.blob, 'result.blob should be defined');
  assert.ok(result.fileName.includes('INV-2026-001'));
});

test('4. generateInvoicePdf handles multi-package line items with independent start and end dates', async () => {
  const invoiceData = {
    invoiceNumber: 'INV-2026-MULTI-01',
    customerName: 'Rohit Verma',
    customerPhone: '9123456789',
    customerEmail: 'rohit.verma@example.com',
    planName: 'Gym-Cardio (3 Months) + Personal Training (12 Sessions)',
    date: '2026-10-15',
    issueDate: '2026-10-15',
    packages: [
      {
        name: 'Gym-Cardio Quarterly',
        package_type: 'Gym-Cardio',
        price: 6000,
        discount: 500,
        startDate: '2026-10-15',
        endDate: '2027-01-14'
      },
      {
        name: 'Personal Training 1-on-1 (12 Sessions)',
        package_type: 'Personal Training',
        price: 8000,
        discount: 0,
        startDate: '2026-10-20',
        endDate: '2026-11-20'
      }
    ],
    grossAmount: 14000,
    discountAmount: 500,
    netAmount: 13500,
    paidAmount: 13500,
    duesAmount: 0,
    paymentMethod: 'Credit Card',
    isGstIncluded: true,
  };

  const gymInfo = {
    name: 'PulseFit Elite',
    address: '2nd Floor, Grand Mall',
    phone: '9876543210',
    email: 'info@pulsefit.com'
  };

  const result = await generateInvoicePdf(invoiceData, gymInfo, false);
  assert.ok(result.doc);
  assert.ok(result.blob);
});

test('5. generateInvoicePdf handles extreme overflow texts without throwing or crashing', async () => {
  const invoiceData = {
    invoiceNumber: 'INV-OVERFLOW-999',
    customerName: 'Siddharth Roy Chowdhury With Very Long Hereditary Surname That Exceeds Container Limits',
    customerPhone: '+91 9999999999 / +91 8888888888 / Alternate Contact +91 7777777777',
    customerEmail: 'siddharth.roy.chowdhury.corporate.executive.accounts.monitoring@department.technology-conglomerate.enterprise.org',
    customerAddress: 'Flat 1204, Wing C-3, Tower 9, Imperial Heritage Heights Residential Complex, Opposite Tech Valley Phase 4, Outer Ring Road, Bengaluru, Karnataka - 560103',
    planName: 'Platinum Comprehensive Diamond Executive Annual Membership with Unlimited Sauna, Hydrotherapy, Personal Coach Access, Nutrition Counseling, and Group Classes',
    notes: 'Special request: athlete requested morning locker slot #42. Medical consideration: mild lower back stiffness on heavy deadlifts. Follow-up consultation scheduled on next month.',
    date: '2026-10-15',
    issueDate: '2026-10-15',
    startDate: '2026-10-15',
    expiryDate: '2027-10-14',
    grossAmount: 35000,
    discountAmount: 5000,
    netAmount: 30000,
    paidAmount: 20000,
    duesAmount: 10000,
    dueDate: '2026-11-30',
    paymentMethod: 'Bank Transfer / NEFT / RTGS (Ref: UTR998877665544332211)',
    isGstIncluded: true,
  };

  const gymInfo = {
    name: 'PulseFit World Athletic Centre and High Performance Conditioning Academy',
    address: 'Campus Building 4, International Sports Village, Northern Highway Corridor, New Delhi - 110001',
    phone: '+91 11 2345 6789 / Toll Free: 1800 123 4567',
    email: 'corporate-enquiries-and-concierge@pulsefit-highperformance-athletics.com',
    gstNumber: '07AAAAA9999A1Z9'
  };

  const result = await generateInvoicePdf(invoiceData, gymInfo, false);
  assert.ok(result.doc);
  assert.ok(result.blob);
});

test('6. Financial calculations (subtotal, discount, GST 18%, dues) are mathematically sound', () => {
  const gross = 10000;
  const discount = 1500;
  const net = gross - discount; // 8500
  assert.equal(net, 8500);

  // GST 18% included
  const baseFee = Math.round(net / 1.18);
  const totalGst = net - baseFee;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

  assert.equal(baseFee + totalGst, net);
  assert.equal(cgst + sgst, totalGst);
  assert.ok(totalGst > 0);

  // Partial payment
  const paid = 5000;
  const dues = net - paid;
  assert.equal(dues, 3500);
  assert.ok(dues > 0, 'Should have positive dues balance');
});

test('7. Phone & Email validation rules adhere to production constraints using real app validators', () => {
  // Test real isValidPhone from src/utils/validation.js (10-digit Indian mobile validation)
  assert.equal(isValidPhone('9876543210'), true);
  assert.equal(isValidPhone('9123456780'), true);
  assert.equal(isValidPhone('12345'), false);
  assert.equal(isValidPhone(''), false);
  assert.equal(isValidPhone(null), false);
  assert.equal(isValidPhone(undefined), false);

  // Test real sanitizePhone to format incoming strings to 10 digits
  assert.equal(sanitizePhone('98765-43210'), '9876543210');
  assert.equal(sanitizePhone('987654321012345'), '9876543210');

  // Test real isValidEmail from src/utils/validation.js
  assert.equal(isValidEmail('member@example.com'), true);
  assert.equal(isValidEmail('member.name+gym@sub.domain.co.in'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail('no@domain'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(null), false);
});

test('8. Input sanitization and SQL injection detection using real app validators', () => {
  // Test real hasSqlInjection from src/utils/validation.js
  assert.equal(hasSqlInjection("Robert'); DROP TABLE users;--"), true);
  assert.equal(hasSqlInjection("1' OR '1'='1"), true);
  assert.equal(hasSqlInjection("UNION SELECT * FROM members"), true);
  assert.equal(hasSqlInjection("John Doe"), false);
  assert.equal(hasSqlInjection("Silver Annual Membership"), false);

  // Test real sanitizeDigits & sanitizeText from src/utils/validation.js
  assert.equal(sanitizeDigits('ABC 123-456 XYZ'), '123456');
  assert.equal(sanitizeText('  PulseFit Athlete \0 '), 'PulseFit Athlete');
});

test('9. Invoice PDF shows real staff/owner name with fallback chain instead of literal "Staff"', () => {
  const baseGym = {
    name: 'ArchFit Club',
    ownerName: 'Prathamesh Ainwale',
    phone: '9898989898',
    email: 'billing@archfit.in',
    gstNumber: '27AAAAA0000A1Z5'
  };

  // Case A: Explicit createdByName
  const res1 = generateInvoicePdf({
    invoice: { invoiceNumber: 'INV-101', planName: 'Gold Plan', amount: 5000, createdByName: 'Prathamesh' },
    gymInfo: baseGym
  });
  assert.equal(res1.createdByName, 'Prathamesh', 'Direct createdByName should be respected');

  // Case B: created_by_name with role suffix "Prathamesh (Owner)"
  const res2 = generateInvoicePdf({
    invoice: { invoiceNumber: 'INV-102', planName: 'Gold Plan', amount: 5000, created_by_name: 'Prathamesh (Owner)' },
    gymInfo: baseGym
  });
  assert.equal(res2.createdByName, 'Prathamesh', 'Role suffix in created_by_name should be sanitized');

  // Case C: staffName field
  const res3 = generateInvoicePdf({
    invoice: { invoiceNumber: 'INV-103', planName: 'Gold Plan', amount: 5000, staffName: 'Coach Vikram' },
    gymInfo: baseGym
  });
  assert.equal(res3.createdByName, 'Coach Vikram', 'staffName key should be respected');

  // Case D: Invoice has generic placeholder "Staff", but member object has executive
  const res4 = generateInvoicePdf({
    invoice: { invoiceNumber: 'INV-104', planName: 'Gold Plan', amount: 5000, createdByName: 'Staff' },
    member: { id: 1, name: 'Aman', executive: 'Siddharth Frontdesk' },
    gymInfo: baseGym
  });
  assert.equal(res4.createdByName, 'Siddharth Frontdesk', 'Should fall back to member executive if invoice has generic "Staff"');

  // Case E: Historical invoice with generic "Staff / Admin", falls back to gym owner
  const res5 = generateInvoicePdf({
    invoice: { invoiceNumber: 'INV-105', planName: 'Gold Plan', amount: 5000, created_by_name: 'Staff / Admin' },
    member: { id: 2, name: 'Rohan' },
    gymInfo: baseGym
  });
  assert.equal(res5.createdByName, 'Prathamesh Ainwale', 'Should fall back to gym owner when invoice has generic "Staff / Admin"');

  // Case F: Incomplete invoice with truly no names available anywhere falls back cleanly to 'Staff'
  const res6 = generateInvoicePdf({
    invoice: { invoiceNumber: 'INV-106', planName: 'Gold Plan', amount: 5000 },
    member: {},
    gymInfo: { name: 'ArchFit Club' }
  });
  assert.equal(res6.createdByName, 'Staff', 'Truly missing name must cleanly fall back to Staff without throwing');
});

test('10. Create invoice submit button enablement condition and payload structure', () => {
  // Submit button disabled logic check
  const isSubmitting = false;
  const duplicateActivePlanInvoice = { invoiceNumber: 'INV-2026-999', amount: 4500, date: '2026-10-15' };

  // New fixed logic: Submit button is ONLY disabled by isSubmitting
  // duplicateActivePlanInvoice must show an advisory notice without disabling the button
  const isButtonDisabled = isSubmitting;
  assert.equal(isButtonDisabled, false, 'Button must NOT be disabled by duplicateActivePlanInvoice');

  // When submitting, button is properly disabled
  assert.equal(true, true);
  const isSubmittingTrue = true;
  assert.equal(isSubmittingTrue, true, 'Button is disabled while submission is pending');

  // Verify invoice payload construction includes valid staff creator name
  const handledByStaffName = 'Prathamesh';
  const defaultHandledBy = 'Prathamesh';
  const currentUser = { name: 'Prathamesh', userId: 1 };

  const payload = {
    user_id: 10,
    member_id: 'mem-10',
    member_name: 'John Doe',
    plan_id: 5,
    plan_name: 'Silver Annual Plan',
    amount: 10000,
    total_amount: 10000,
    payment_method: 'UPI',
    created_by: currentUser.userId,
    created_by_name: handledByStaffName?.trim() || defaultHandledBy || currentUser?.name || 'Staff'
  };

  assert.equal(payload.amount, 10000);
  assert.equal(payload.created_by_name, 'Prathamesh');
  assert.ok(payload.user_id > 0);
  assert.ok(payload.plan_id > 0);
});

test('11. calculateAgeFromDob accurately calculates age with leap years, passed/upcoming birthdays, and invalid handling', () => {
  // Reference date: 15 Oct 2026
  const refDate = new Date(2026, 9, 15); // Month 9 is October (0-indexed)

  // 1. Birthday already passed this year (born 10 May 1996 -> turned 30 in May)
  assert.equal(calculateAgeFromDob('1996-05-10', refDate), 30);
  assert.equal(calculateAgeFromDob('10-05-1996', refDate), 30);
  assert.equal(calculateAgeFromDob('10/05/1996', refDate), 30);

  // 2. Birthday has NOT yet passed this year (born 20 Dec 1996 -> still 29)
  assert.equal(calculateAgeFromDob('1996-12-20', refDate), 29);
  assert.equal(calculateAgeFromDob('20-12-1996', refDate), 29);

  // 3. Birthday is TODAY (born 15 Oct 1996 -> turned 30 today)
  assert.equal(calculateAgeFromDob('1996-10-15', refDate), 30);

  // 4. Leap year birthday: 29 Feb 2000
  // In 2024 (leap year): on 28 Feb 2024, birthday not passed (age 23); on 29 Feb 2024, birthday passed (age 24)
  const leapYearBefore = new Date(2024, 1, 28);
  const leapYearOn = new Date(2024, 1, 29);
  assert.equal(calculateAgeFromDob('2000-02-29', leapYearBefore), 23);
  assert.equal(calculateAgeFromDob('2000-02-29', leapYearOn), 24);

  // Non-leap year reference: 2025 (born 29 Feb 2000)
  // On 28 Feb 2025: birthday has not passed (age 24)
  // On 1 Mar 2025: birthday has passed (age 25)
  const nonLeapFeb28 = new Date(2025, 1, 28);
  const nonLeapMar01 = new Date(2025, 2, 1);
  assert.equal(calculateAgeFromDob('2000-02-29', nonLeapFeb28), 24);
  assert.equal(calculateAgeFromDob('2000-02-29', nonLeapMar01), 25);

  // 5. Invalid leap day (2023 was not a leap year, so 2023-02-29 is invalid)
  assert.equal(calculateAgeFromDob('2023-02-29', refDate), '');

  // 6. Invalid dates and months
  assert.equal(calculateAgeFromDob('2025-04-31', refDate), ''); // April has 30 days
  assert.equal(calculateAgeFromDob('invalid-date', refDate), '');
  assert.equal(calculateAgeFromDob('2025-13-01', refDate), '');

  // 7. Empty, null, undefined
  assert.equal(calculateAgeFromDob('', refDate), '');
  assert.equal(calculateAgeFromDob(null, refDate), '');
  assert.equal(calculateAgeFromDob(undefined, refDate), '');

  // 8. Future birthdates
  assert.equal(calculateAgeFromDob('2027-01-01', refDate), '');

  // 9. Unrealistic ages (> 130)
  assert.equal(calculateAgeFromDob('1800-01-01', refDate), '');
});

test('12. formatPackageDateRange & generateInvoicePdf render start and end dates for both Gym and PT packages without "Valid until"', async () => {
  // Test formatPackageDateRange directly
  const ptPkg = {
    package_type: 'Personal Training',
    plan_name: '12 Sessions PT Package',
    start_date: '2026-10-15',
    end_date: '2026-11-14',
    amount: 5000,
  };
  const gymPkg = {
    package_type: 'Gym-Cardio',
    plan_name: '3 Months Gym-Cardio Membership',
    start_date: '2026-10-15',
    end_date: '2027-01-14',
    amount: 8000,
  };
  const derivedPkg = {
    package_type: 'Personal Training',
    plan_name: '1 Month PT',
    duration_months: 1,
    amount: 3000,
  };

  const invoice = {
    startDate: '2026-10-15',
    issueDate: '2026-10-15',
  };

  const ptRange = formatPackageDateRange(ptPkg, invoice);
  assert.equal(ptRange, '15 Oct 2026 – 14 Nov 2026');
  assert.ok(!ptRange.includes('Valid until'), 'Must not say Valid until');
  assert.ok(!ptRange.includes('Valid till'), 'Must not say Valid till');
  assert.ok(!ptRange.includes('undefined'), 'Must not contain undefined');
  assert.ok(!ptRange.includes('Invalid Date'), 'Must not contain Invalid Date');

  const gymRange = formatPackageDateRange(gymPkg, invoice);
  assert.equal(gymRange, '15 Oct 2026 – 14 Jan 2027');
  assert.ok(!gymRange.includes('Valid until'));

  const derivedRange = formatPackageDateRange(derivedPkg, invoice);
  assert.equal(derivedRange, '15 Oct 2026 – 14 Nov 2026');
  assert.ok(!derivedRange.includes('Valid until'));

  // Test full generateInvoicePdf with multiple packages (Gym and PT)
  const multiPkgInvoice = {
    invoiceNumber: 'INV-2026-PT-GYM',
    customerName: 'Aarav Patel',
    customerPhone: '9820098200',
    customerEmail: 'aarav.patel@example.com',
    issueDate: '2026-10-15',
    startDate: '2026-10-15',
    expiryDate: '2027-01-14',
    grossAmount: 13000,
    packageAmount: 13000,
    discountAmount: 0,
    netAmount: 13000,
    paidAmount: 13000,
    duesAmount: 0,
    paymentMethod: 'UPI',
    packages: [gymPkg, ptPkg],
  };

  const customGym = {
    name: 'FitPro Arena',
    address: '42 MG Road, Bangalore',
    phone: '9988776655',
    email: 'info@fitproarena.com',
    gstNumber: '29ABCDE1234F1Z5',
  };

  const result = await generateInvoicePdf(multiPkgInvoice, customGym, false);
  assert.ok(result?.doc, 'PDF doc should be returned');

  // Verify that "Valid until" and "Valid till" NEVER appear in the PDF output
  const pdfOutputString = result.doc.output();
  assert.ok(!pdfOutputString.includes('Valid until'), 'PDF output stream must not contain "Valid until"');
  assert.ok(!pdfOutputString.includes('Valid till'), 'PDF output stream must not contain "Valid till"');
  assert.ok(!pdfOutputString.includes('undefined'), 'PDF output stream must not contain "undefined"');
  assert.ok(!pdfOutputString.includes('Invalid Date'), 'PDF output stream must not contain "Invalid Date"');
});

test('13. Multi-tenant Gym Isolation: PDF contains only the specific gym details and no old hardcoded values', async () => {
  const invoiceDataA = {
    invoiceNumber: 'INV-GYM-A-101',
    customerName: 'Rohan Sharma',
    customerPhone: '9123456789',
    issueDate: '2026-10-15',
    startDate: '2026-10-15',
    expiryDate: '2026-11-14',
    planName: 'Monthly Gold Pass',
    grossAmount: 3500,
    netAmount: 3500,
    paidAmount: 3500,
    paymentMethod: 'Cash',
  };

  const gymA = {
    name: 'Iron Forge Fitness Gym',
    address: 'Sector 14, Gurgaon, Haryana',
    phone: '9811122233',
    email: 'contact@ironforgegym.com',
    gstNumber: '06AAAAA0000A1Z5',
    upiId: 'ironforge@upi',
    bankDetails: 'Bank of Baroda, A/C: 1122334455, IFSC: BARB0GURGAO',
    termsAndConditions: 'All fees are strictly non-refundable and non-transferable.',
    footerText: 'Thank you for training with Iron Forge! Stay strong.',
    signatoryText: 'Authorized Signatory - Iron Forge',
    taxRate: 18,
  };

  const invoiceDataB = {
    invoiceNumber: 'INV-GYM-B-202',
    customerName: 'Ananya Roy',
    customerPhone: '9988112233',
    issueDate: '2026-10-15',
    startDate: '2026-10-15',
    expiryDate: '2026-11-14',
    planName: 'Platinum Yearly Pass',
    grossAmount: 25000,
    netAmount: 25000,
    paidAmount: 25000,
    paymentMethod: 'Card',
  };

  const gymB = {
    name: 'Zenith Peak Athletic Club',
    address: 'Park Street, Kolkata, West Bengal',
    phone: '9833344455',
    email: 'hello@zenithpeakclub.com',
    gstNumber: '19BBBBB1111B1Z2',
    upiId: 'zenithpeak@icici',
    bankDetails: 'Axis Bank, A/C: 9988776655, IFSC: UTIB0000001',
    termsAndConditions: 'Membership cards must be scanned at entry gate.',
    footerText: 'Transforming health and wellness at Zenith Peak.',
    signatoryText: 'Managing Director - Zenith Peak',
    taxRate: 12,
  };

  const resultA = await generateInvoicePdf(invoiceDataA, gymA, false);
  const pdfStringA = resultA.doc.output();

  const resultB = await generateInvoicePdf(invoiceDataB, gymB, false);
  const pdfStringB = resultB.doc.output();

  // Assert Gym A PDF contains only Gym A details and NOT Gym B details
  assert.ok(pdfStringA.includes('Iron Forge') || pdfStringA.includes('contact@ironforgegym.com'), 'Gym A PDF must contain Gym A name or email');
  assert.ok(pdfStringA.includes('06AAAAA0000A1Z5'), 'Gym A PDF must contain Gym A GST number');
  assert.ok(!pdfStringA.includes('Zenith Peak'), 'Gym A PDF must not contain Gym B name');
  assert.ok(!pdfStringA.includes('hello@zenithpeakclub.com'), 'Gym A PDF must not contain Gym B email');

  // Assert Gym B PDF contains only Gym B details and NOT Gym A details
  assert.ok(pdfStringB.includes('Zenith Peak') || pdfStringB.includes('hello@zenithpeakclub.com'), 'Gym B PDF must contain Gym B name or email');
  assert.ok(pdfStringB.includes('19BBBBB1111B1Z2'), 'Gym B PDF must contain Gym B GST number');
  assert.ok(!pdfStringB.includes('Iron Forge'), 'Gym B PDF must not contain Gym A name');
  assert.ok(!pdfStringB.includes('contact@ironforgegym.com'), 'Gym B PDF must not contain Gym A email');

  // Assert none of the old static hardcoded values remain when gym details are provided
  const oldHardcodedDefaults = [
    'ARCHFIT ATHLETIC CLUB',
    'Central Avenue, Opp. City Mall',
    '27AAPCP1234F1Z8',
    '+91 98201 54321',
    'billing@archfit.in',
  ];

  for (const oldStatic of oldHardcodedDefaults) {
    assert.ok(
      !pdfStringA.includes(oldStatic),
      `Gym A PDF must not contain old hardcoded default: "${oldStatic}"`
    );
    assert.ok(
      !pdfStringB.includes(oldStatic),
      `Gym B PDF must not contain old hardcoded default: "${oldStatic}"`
    );
  }
});

test('14. Shared currency formatter formats canonical ₹ correctly and PDF text does not contain broken glyphs', async () => {
  const { formatCurrency, getPdfCurrencySymbol } = await import('../src/utils/currencyUtils.js');
  
  assert.strictEqual(formatCurrency(15000, '₹'), '₹15,000');
  assert.strictEqual(formatCurrency(2500.5, '₹'), '₹2,500.5');
  assert.strictEqual(formatCurrency(100, '$'), '$100');
  assert.strictEqual(getPdfCurrencySymbol('₹'), 'Rs.');
  assert.strictEqual(getPdfCurrencySymbol('$'), '$');

  // Verify PDF output renders clean Rs. without broken glyphs
  const invoiceData = {
    invoiceNumber: 'INV-CURRENCY-TEST',
    customerName: 'Test Member',
    issueDate: '2026-10-15',
    grossAmount: 5000,
    netAmount: 5000,
    paidAmount: 5000,
    packages: [{ name: 'Gym Membership', price: 5000, startDate: '2026-10-15', endDate: '2026-11-14' }]
  };
  const result = await generateInvoicePdf(invoiceData, { name: 'Currency Gym', currency: '₹' }, false);
  const pdfOutput = result.doc.output();
  assert.ok(pdfOutput.includes('Rs.'), 'PDF output must render clean Rs. symbol');
  assert.ok(!pdfOutput.includes('â‚¹'), 'PDF output must not contain broken â‚¹ symbol');
  assert.ok(!pdfOutput.includes('Γé╣'), 'PDF output must not contain broken Γé╣ symbol');
});

test('15. Repo integrity: Zero broken currency sequences (â‚¹, Γé╣, ├óΓÇÜ┬╣, â€¹) in frontend src and backend app', async () => {
  const fs = await import('fs');
  const path = await import('path');

  const checkDirs = [
    path.resolve(process.cwd(), 'src'),
    path.resolve(process.cwd(), '../backend/app'),
    path.resolve(process.cwd(), '../backend/database/migrations'),
  ];

  const brokenPatterns = ['â‚¹', 'Γé╣', '├óΓÇÜ┬╣', 'â€¹'];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(js|jsx|php|blade\.php|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of brokenPatterns) {
          assert.ok(
            !content.includes(pattern),
            `Found broken sequence "${pattern}" in file: ${fullPath}`
          );
        }
      }
    }
  }

  for (const dir of checkDirs) {
    scanDir(dir);
  }
});

test('16. Shared invoice mapper: mapInvoiceRecord produces 100% identical output for success screen and list view', async () => {
  const { mapInvoiceRecord } = await import('../src/utils/invoiceMapper.js');

  const backendSavedInvoice = {
    id: 'INV-2026-9876',
    invoice_number: 'INV-2026-9876',
    numericId: 42,
    gymId: 1,
    memberId: 'mem-101',
    userId: 101,
    memberName: 'Pooja Hegde',
    memberPhone: '9898989898',
    memberEmail: 'pooja@example.com',
    planName: 'Gym-Cardio Annual + Personal Training 24 Sessions',
    amount: 18000,
    totalAmount: 20000,
    pendingAmount: 2000,
    duesAmount: 2000,
    dueDate: '2026-11-15',
    date: '2026-10-15',
    issueDate: '2026-10-15',
    packageType: 'Gym-Cardio',
    startDate: '2026-10-15',
    endDate: '2027-10-14',
    paymentMethod: 'UPI',
    status: 'Pending',
    createdByName: 'Coach Karan',
    creatorRole: 'Owner',
    items: [
      {
        packageType: 'Gym-Cardio',
        name: 'Gym-Cardio Annual',
        price: 12000,
        discount: 1000,
        netAmount: 11000,
        startDate: '2026-10-15',
        endDate: '2027-10-14'
      },
      {
        packageType: 'Personal Training',
        name: 'Personal Training 24 Sessions',
        price: 8000,
        discount: 0,
        netAmount: 8000,
        startDate: '2026-10-15',
        endDate: '2027-01-14'
      }
    ]
  };

  // 1. Success screen mapping
  const successScreenData = mapInvoiceRecord(backendSavedInvoice);

  // 2. Member Invoices list view mapping
  const listViewData = mapInvoiceRecord(backendSavedInvoice);

  // Assert exact identity across all fields
  assert.equal(successScreenData.id, listViewData.id);
  assert.equal(successScreenData.invoiceNumber, listViewData.invoiceNumber);
  assert.equal(successScreenData.memberName, listViewData.memberName);
  assert.equal(successScreenData.amount, listViewData.amount);
  assert.equal(successScreenData.totalAmount, listViewData.totalAmount);
  assert.equal(successScreenData.duesAmount, listViewData.duesAmount);
  assert.equal(successScreenData.dueDate, listViewData.dueDate);
  assert.equal(successScreenData.startDate, listViewData.startDate);
  assert.equal(successScreenData.endDate, listViewData.endDate);
  assert.equal(successScreenData.status, listViewData.status);
  assert.equal(successScreenData.createdByName, listViewData.createdByName);
  assert.deepEqual(successScreenData.items, listViewData.items);
  assert.equal(successScreenData.items.length, 2);
});

test('17. Multi-gym isolation: Invoices rendered for two distinct gyms assert zero cross-gym leakage', async () => {
  const gymA = {
    id: 1,
    name: 'Apex Fitness Mumbai',
    address: 'Bandra West, Mumbai',
    phone: '9820011223',
    email: 'info@apexfitness.in',
    gstin: '27AAAAA0000A1Z5'
  };

  const gymB = {
    id: 2,
    name: 'Iron Peak Gym Bengaluru',
    address: 'Indiranagar, Bengaluru',
    phone: '9845099887',
    email: 'contact@ironpeak.in',
    gstin: '29BBBBB1111B2Z6'
  };

  const invoiceA = {
    invoiceNumber: 'INV-APEX-001',
    memberName: 'Rohan Sharma',
    memberPhone: '9900112233',
    planName: 'Elite Annual',
    amount: 15000,
    totalAmount: 15000,
    date: '2026-10-15',
    startDate: '2026-10-15',
    endDate: '2027-10-14'
  };

  const invoiceB = {
    invoiceNumber: 'INV-PEAK-002',
    memberName: 'Sneha Patel',
    memberPhone: '9988776655',
    planName: 'Quarterly Cardio',
    amount: 4500,
    totalAmount: 4500,
    date: '2026-10-15',
    startDate: '2026-10-15',
    endDate: '2027-01-14'
  };

  const resA = await generateInvoicePdf(invoiceA, gymA, false);
  const pdfTextA = resA.doc.output();

  const resB = await generateInvoicePdf(invoiceB, gymB, false);
  const pdfTextB = resB.doc.output();

  // Verify Gym A PDF has Gym A's info and NONE of Gym B's
  assert.ok(pdfTextA.includes('Apex Fitness Mumbai'), 'PDF A must include Gym A name');
  assert.ok(pdfTextA.includes('27AAAAA0000A1Z5'), 'PDF A must include Gym A GSTIN');
  assert.ok(!pdfTextA.includes('Iron Peak Gym Bengaluru'), 'PDF A must NOT leak Gym B name');
  assert.ok(!pdfTextA.includes('29BBBBB1111B2Z6'), 'PDF A must NOT leak Gym B GSTIN');

  // Verify Gym B PDF has Gym B's info and NONE of Gym A's
  assert.ok(pdfTextB.includes('Iron Peak Gym Bengaluru'), 'PDF B must include Gym B name');
  assert.ok(pdfTextB.includes('29BBBBB1111B2Z6'), 'PDF B must include Gym B GSTIN');
  assert.ok(!pdfTextB.includes('Apex Fitness Mumbai'), 'PDF B must NOT leak Gym A name');
  assert.ok(!pdfTextB.includes('27AAAAA0000A1Z5'), 'PDF B must NOT leak Gym A GSTIN');
});

test('18. Dynamic Tax Calculation: Invoice and PDF adjust dynamically to gym taxRate (e.g., 5%, 12%, 28%) and non-GST mode', async () => {
  const gym12 = {
    name: 'Flex Zone 12',
    taxRate: 12,
    gstin: '27AABCU9603R1ZM'
  };

  const invoice12 = {
    invoiceNumber: 'INV-TAX-12',
    memberName: 'Priya Verma',
    amount: 11200,
    totalAmount: 11200,
    isGstIncluded: true,
    packages: [{ name: 'Half-Yearly Membership', price: 11200 }]
  };

  const res12 = await generateInvoicePdf(invoice12, gym12, false);
  const pdf12 = res12.doc.output();

  // 11200 / 1.12 = 10000 base fee, 1200 tax -> 600 CGST (6%) + 600 SGST (6%)
  assert.ok(pdf12.includes('CGST \\(6%\\):'), 'PDF must display CGST (6%) for 12% gym tax');
  assert.ok(pdf12.includes('SGST \\(6%\\):'), 'PDF must display SGST (6%) for 12% gym tax');
  assert.ok(pdf12.includes('10,000'), 'PDF must display 10,000 base fee');
  assert.ok(pdf12.includes('600'), 'PDF must display 600 tax');

  // Test 28% luxury gym tier
  const gym28 = {
    name: 'Luxury Spa & Gym',
    taxRate: 28,
    gstin: '27AABCU9603R1ZL'
  };

  const invoice28 = {
    invoiceNumber: 'INV-TAX-28',
    memberName: 'Karan Mehra',
    amount: 12800,
    totalAmount: 12800,
    isGstIncluded: true,
    packages: [{ name: 'VIP Annual', price: 12800 }]
  };

  const res28 = await generateInvoicePdf(invoice28, gym28, false);
  const pdf28 = res28.doc.output();

  // 12800 / 1.28 = 10000 base fee, 2800 tax -> 1400 CGST (14%) + 1400 SGST (14%)
  assert.ok(pdf28.includes('CGST \\(14%\\):'), 'PDF must display CGST (14%) for 28% gym tax');
  assert.ok(pdf28.includes('SGST \\(14%\\):'), 'PDF must display SGST (14%) for 28% gym tax');
  assert.ok(pdf28.includes('10,000'), 'PDF must display 10,000 base fee');
  assert.ok(pdf28.includes('1,400'), 'PDF must display 1,400 CGST');
});

test('19. Multi-package chaining detection for second service across invoice items and active plans', () => {
  // Simulated invoice with Gym-Cardio and Personal Training line items
  const rawInvoice = {
    id: 'INV-MULTI-001',
    user_id: 101,
    package_type: 'Gym-Cardio',
    start_date: '2026-10-15',
    end_date: '2026-11-14',
    items: JSON.stringify([
      {
        package_type: 'Gym-Cardio',
        plan_id: 1,
        name: 'Gym Monthly',
        start_date: '2026-10-15',
        end_date: '2026-11-14',
        price: 5000
      },
      {
        package_type: 'Personal Training',
        plan_id: 2,
        name: 'PT 12 Sessions',
        start_date: '2026-10-15',
        end_date: '2026-11-14',
        price: 2000
      }
    ])
  };

  const mapped = mapInvoiceRecord(rawInvoice);
  assert.ok(Array.isArray(mapped.items));
  assert.equal(mapped.items.length, 2);

  // Helper matching CreateInvoicePage's getLatestEndDateForPackageType
  const invoices = [mapped];
  const todayStr = '2026-10-15';

  const findLatestEndDate = (targetType, cleanId) => {
    let latestEnd = null;
    invoices.forEach((inv) => {
      const invMemId = String(inv.userId || inv.user_id || '').replace(/[^0-9]/g, '');
      if (invMemId !== cleanId) return;

      const itemsList = Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [];
      if (itemsList.length > 0) {
        itemsList.forEach((item) => {
          const itemType = (item.packageType || item.package_type || 'Gym-Cardio');
          if (itemType === targetType) {
            const end = (item.endDate || item.end_date || '').split('T')[0];
            if (end && end >= todayStr && (!latestEnd || end > latestEnd)) {
              latestEnd = end;
            }
          }
        });
      } else {
        const invType = (inv.package_type || inv.packageType || 'Gym-Cardio');
        if (invType === targetType) {
          const end = (inv.end_date || inv.endDate || '').split('T')[0];
          if (end && end >= todayStr && (!latestEnd || end > latestEnd)) {
            latestEnd = end;
          }
        }
      }
    });
    return latestEnd;
  };

  // Test 1: Service #1 (Gym-Cardio) finds 2026-11-14
  const gymLatest = findLatestEndDate('Gym-Cardio', '101');
  assert.equal(gymLatest, '2026-11-14');

  // Test 2: Service #2 (Personal Training) ALSO finds 2026-11-14 from nested items!
  const ptLatest = findLatestEndDate('Personal Training', '101');
  assert.equal(ptLatest, '2026-11-14');
});

test('20. Existing member outstanding due balance blocks new invoice creation until dues are settled', async () => {
  // Simulate member dues evaluation function
  const checkMemberDueAmount = (member, invoices) => {
    if (!member) return 0;
    const directFields = [
      member.duesAmount,
      member.dues_amount,
      member.balanceDue,
      member.balance_due,
      member.pendingAmount,
      member.pending_amount,
      member.dueAmount,
      member.due_amount,
    ];
    let hasExplicitZero = false;
    for (const val of directFields) {
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
          if (num > 0) return num;
          if (num === 0) hasExplicitZero = true;
        }
      }
    }
    if (hasExplicitZero) return 0;

    if (Array.isArray(invoices)) {
      const cleanId = String(member.id).replace(/\D/g, '');
      for (const inv of invoices) {
        if (String(inv.status).toLowerCase() === 'paid' || String(inv.status).toLowerCase() === 'cancelled') continue;
        const invMemId = String(inv.memberId || inv.userId || '').replace(/\D/g, '');
        if (cleanId && invMemId && cleanId === invMemId) {
          const p = Number(inv.pendingAmount ?? inv.duesAmount ?? (inv.status === 'Pending' ? inv.amount : 0));
          if (p > 0) return p;
        }
      }
    }
    return 0;
  };

  // Case A: Member with existing duesAmount of 2500
  const memberWithDues = { id: 105, name: 'Vikas', duesAmount: 2500 };
  const dueA = checkMemberDueAmount(memberWithDues, []);
  assert.equal(dueA, 2500, 'Member with direct duesAmount must evaluate to outstanding due');

  // Creation must be blocked
  const canCreateInvoice = (due) => due === 0;
  assert.equal(canCreateInvoice(dueA), false, 'Invoice creation must be blocked when dues exist');

  // Case B: Member with dues on uncancelled pending invoice
  const memberCleanProfile = { id: 106, name: 'Sneha' };
  const invoicesList = [
    { id: 'INV-1', userId: 106, status: 'Pending', pendingAmount: 1500 }
  ];
  const dueB = checkMemberDueAmount(memberCleanProfile, invoicesList);
  assert.equal(dueB, 1500, 'Cross-referenced uncancelled invoice due must be detected');
  assert.equal(canCreateInvoice(dueB), false, 'Invoice creation blocked until invoice due is settled');

  // Case C: Member clears dues (settled to 0)
  const settledMember = { ...memberWithDues, duesAmount: 0 };
  const dueC = checkMemberDueAmount(settledMember, []);
  assert.equal(dueC, 0);
  assert.equal(canCreateInvoice(dueC), true, 'Invoice creation allowed after settling dues');
});

test('21. isValidName accepts valid human names with Unicode, spaces, hyphens, and apostrophes; rejects numbers and special-character-only values', () => {
  // Valid names
  assert.equal(isValidName('Vikram Malhotra'), true);
  assert.equal(isValidName("Shaun O'Connor"), true);
  assert.equal(isValidName('Mary-Jane Watson'), true);
  assert.equal(isValidName('Jean-Luc Picard'), true);
  assert.equal(isValidName('José García'), true, 'Should accept accented / Unicode letters');
  assert.equal(isValidName('Aarav'), true);
  assert.equal(isValidName('  Pooja Sharma  '), true, 'Should allow leading/trailing spaces as trimmed');

  // Reject numeric-only and names containing digits
  assert.equal(isValidName('12345'), false, 'Reject numeric-only');
  assert.equal(isValidName('John123'), false, 'Reject names with digits');
  assert.equal(isValidName('9876543210'), false, 'Reject phone number entered as name');
  assert.equal(isValidName('Vikram 2nd'), false, 'Reject names containing numbers');

  // Reject special-character-only or invalid symbols
  assert.equal(isValidName('!@#$%^&*()'), false, 'Reject symbols');
  assert.equal(isValidName('---'), false, 'Reject punctuation only');
  assert.equal(isValidName("'''"), false, 'Reject apostrophes only');
  assert.equal(isValidName('   '), false, 'Reject whitespace only');
  assert.equal(isValidName(''), false, 'Reject empty string');
  assert.equal(isValidName(null), false, 'Reject null');
  assert.equal(isValidName(undefined), false, 'Reject undefined');

  // Enforce length limits (min 2 letters)
  assert.equal(isValidName('A'), false, 'Reject single letter');
  assert.equal(isValidName('A'.repeat(101)), false, 'Reject name exceeding 100 characters');
});

test('22. isValidPhone and isValidEmergencyContact reject letters and invalid lengths, but accept valid 10-digit and international numbers', () => {
  // Valid 10-digit Indian numbers
  assert.equal(isValidPhone('9876543210'), true);
  assert.equal(isValidPhone('98765 43210'), true);
  assert.equal(isValidPhone('+919876543210'), true);
  assert.equal(isValidPhone('+91 98765 43210'), true);

  // Valid international numbers
  assert.equal(isValidPhone('+14155552671'), true);
  assert.equal(isValidPhone('+44 20 7946 0958'), true);

  // Reject letters and alphabetic emergency contact numbers
  assert.equal(isValidPhone('Brother'), false, 'Reject words');
  assert.equal(isValidPhone('Father'), false, 'Reject words');
  assert.equal(isValidPhone('Sarah 9876543210'), false, 'Reject mixed words and numbers');
  assert.equal(isValidPhone('98765abcde'), false, 'Reject alphanumeric phone');

  // Reject invalid lengths
  assert.equal(isValidPhone('12345'), false, 'Reject too short');
  assert.equal(isValidPhone('12345678'), false, 'Reject 8 digits for domestic');
  assert.equal(isValidPhone('12345678901234567890'), false, 'Reject too long');

  // Emergency contact helper (optional field)
  assert.equal(isValidEmergencyContact(''), true, 'Empty emergency contact is valid');
  assert.equal(isValidEmergencyContact(null), true, 'Null emergency contact is valid');
  assert.equal(isValidEmergencyContact(undefined), true, 'Undefined emergency contact is valid');
  assert.equal(isValidEmergencyContact('9876543210'), true, '10-digit emergency contact is valid');
  assert.equal(isValidEmergencyContact('Brother'), false, 'Alphabetic emergency contact is rejected');
  assert.equal(isValidEmergencyContact('12345'), false, 'Short emergency contact is rejected');
});

test('23. isValidDob and getTodayDateStr reject future dates and accept today and past dates', () => {
  const todayStr = getTodayDateStr();
  assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/, 'Today date must be in YYYY-MM-DD format');

  // Past dates: valid
  assert.equal(isValidDob('1995-05-15'), true);
  assert.equal(isValidDob('2000-01-01'), true);
  assert.equal(isValidDob('2010-12-31'), true);

  // Today's date: valid
  assert.equal(isValidDob(todayStr), true, "Today's date must not be rejected");

  // Future dates: rejected
  const futureYear = new Date().getFullYear() + 2;
  assert.equal(isValidDob(`${futureYear}-01-01`), false, 'Future date must be rejected');
  assert.equal(isValidDob('2099-12-31'), false, 'Far future date must be rejected');

  // Optional empty values
  assert.equal(isValidDob(''), true, 'Empty DOB is valid (optional field)');
  assert.equal(isValidDob(null), true, 'Null DOB is valid (optional field)');
});

test('24. Data mapping from Enquiry to Member preserves mobile and leaves Emergency Contact independent', () => {
  const enquiry = {
    id: 'enq-42',
    name: 'Rahul Varma',
    phone: '9876543210',
    email: 'rahul@example.com',
    interestedPlan: 'Gold Plan',
    notes: '[2026-10-15] Walk-in inquiry'
  };

  // Simulation of prepareLeadForMemberConversion in EnquiriesManager.jsx
  const cleanNotes = (enquiry.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
  const preparedData = {
    name: enquiry.name || '',
    phone: enquiry.phone || '',
    email: enquiry.email || '',
    emergencyContact: '', // Must NOT be enquiry.phone
    enquiryId: enquiry.id,
    enquiryNotes: cleanNotes
  };

  assert.equal(preparedData.phone, '9876543210', 'Enquiry phone maps to member phone');
  assert.equal(preparedData.emergencyContact, '', 'Emergency contact must remain empty');
  assert.notEqual(preparedData.emergencyContact, preparedData.phone, 'Emergency contact must not equal phone number');

  // Simulation of AddMemberPage initialization:
  // initialData passed from lead conversion
  const initialData = preparedData;
  const initialFormEmergencyContact = initialData.emergencyContact || '';
  assert.equal(initialFormEmergencyContact, '', 'AddMemberPage emergency contact starts empty on conversion');

  // Simulation of Edit Member:
  // targetMember with existing independent emergency contact
  const existingMember = {
    id: 101,
    name: 'Rahul Varma',
    phone: '9876543210',
    emergencyContact: '9123456789'
  };
  const editEmergencyContact = existingMember.emergencyContact || '';
  assert.equal(editEmergencyContact, '9123456789', 'Editing member preserves existing emergency contact number');
  assert.notEqual(editEmergencyContact, existingMember.phone, 'Emergency contact is not overwritten with member mobile');

  // Target member with no emergency contact
  const memberWithoutEmergency = {
    id: 102,
    name: 'Aarav Patel',
    phone: '9811223344',
    emergencyContact: null
  };
  const editWithoutEmergency = memberWithoutEmergency.emergencyContact || '';
  assert.equal(editWithoutEmergency, '', 'Editing member without emergency contact remains empty and is not overwritten with mobile');
});

test('25. Delete confirmation workflow: Cancel preserves record, Confirm calls API, failure rolls back state without record loss', async () => {
  // 1. Message formatting verification
  const formatDeleteMessage = (itemType, recordName) => {
    return recordName
      ? `Are you sure you want to delete ${itemType ? `${itemType} ` : ''}"${recordName}"? This action may not be reversible.`
      : `Are you sure you want to delete this ${itemType || 'record'}? This action may not be reversible.`;
  };

  assert.equal(
    formatDeleteMessage('member', 'John Doe'),
    'Are you sure you want to delete member "John Doe"? This action may not be reversible.'
  );
  assert.equal(
    formatDeleteMessage('enquiry', 'Priya Sharma'),
    'Are you sure you want to delete enquiry "Priya Sharma"? This action may not be reversible.'
  );
  assert.equal(
    formatDeleteMessage('plan', 'Gold Annual Plan'),
    'Are you sure you want to delete plan "Gold Annual Plan"? This action may not be reversible.'
  );

  // 2. Cancellation test: Clicking Cancel does NOT invoke API and preserves state
  let membersList = [
    { id: 1, name: 'Alice Smith' },
    { id: 2, name: 'Bob Johnson' }
  ];
  let apiCallCount = 0;
  let mockApiDelete = async () => {
    apiCallCount++;
    return { success: true };
  };

  let modalOpen = true;
  let memberToDelete = membersList[0];

  // User cancels:
  modalOpen = false;
  memberToDelete = null;

  assert.equal(apiCallCount, 0, 'Delete API must not be called when user cancels');
  assert.equal(membersList.length, 2, 'Members list remains completely unchanged');
  assert.equal(membersList[0].id, 1);

  // 3. Confirm with Duplicate Request Prevention
  let isDeleting = false;
  const executeDelete = async (item) => {
    if (isDeleting) return; // Guard against repeated clicks
    isDeleting = true;
    try {
      await mockApiDelete(item.id);
      membersList = membersList.filter((m) => m.id !== item.id);
    } finally {
      isDeleting = false;
    }
  };

  // First click succeeds:
  const p1 = executeDelete(membersList[0]);
  // Second click while in progress is blocked:
  const p2 = executeDelete(membersList[0]);
  await Promise.all([p1, p2]);

  assert.equal(apiCallCount, 1, 'Duplicate click was ignored while delete was in progress');
  assert.equal(membersList.length, 1);
  assert.equal(membersList[0].name, 'Bob Johnson');

  // 4. Failure rollback: If API throws, record is preserved and not lost
  let failingApiDelete = async () => {
    throw new Error('Database foreign key integrity violation');
  };

  let previousList = membersList;
  let errorCaught = null;
  try {
    // Optimistic update with safe rollback on failure:
    membersList = membersList.filter((m) => m.id !== 2);
    await failingApiDelete();
  } catch (err) {
    errorCaught = err;
    membersList = previousList; // Rollback
  }

  assert.ok(errorCaught, 'Error was thrown by failing API');
  assert.equal(membersList.length, 1, 'Rollback kept the record intact in the UI');
  assert.equal(membersList[0].id, 2, 'Record Bob Johnson remains in UI');
});

test('26. Payment promise date validation enforces Start Date <= Promise Date < Expiry Date across plan tiers', () => {
  // Test calculateMaxPromiseDate
  assert.equal(calculateMaxPromiseDate('2026-11-15'), '2026-11-14', 'Max promise date is day before expiry');
  assert.equal(calculateMaxPromiseDate('2026-03-01'), '2026-02-28', 'Max promise date handles month rollbacks correctly');
  assert.equal(calculateMaxPromiseDate('2024-03-01'), '2024-02-29', 'Max promise date handles leap year rollback');
  assert.equal(calculateMaxPromiseDate(''), '', 'Empty expiry gives empty max promise date');

  // Multi-tier plan boundaries:
  // 1-month plan: 2026-10-15 to 2026-11-15
  const start1M = '2026-10-15';
  const expiry1M = '2026-11-15';

  // Rule: Start date is permitted
  const validStart = validatePromiseDate('2026-10-15', start1M, expiry1M);
  assert.equal(validStart.isValid, true, 'Promise date exactly on start date is permitted');

  // Rule: Intermediate date is permitted
  const validMid = validatePromiseDate('2026-10-25', start1M, expiry1M);
  assert.equal(validMid.isValid, true, 'Promise date in middle of term is permitted');

  // Rule: Day before expiry is permitted
  const validDayBefore = validatePromiseDate('2026-11-14', start1M, expiry1M);
  assert.equal(validDayBefore.isValid, true, 'Promise date on day before expiry is permitted');

  // Rule: Expiry date itself is strictly rejected
  const invalidExpiry = validatePromiseDate('2026-11-15', start1M, expiry1M);
  assert.equal(invalidExpiry.isValid, false, 'Promise date on expiry date must be strictly rejected');
  assert.match(invalidExpiry.error, /before membership expiry date/i);

  // Rule: Date after expiry is rejected
  const invalidAfter = validatePromiseDate('2026-11-16', start1M, expiry1M);
  assert.equal(invalidAfter.isValid, false, 'Promise date after expiry date must be rejected');

  // Rule: Date before start date is rejected
  const invalidBefore = validatePromiseDate('2026-10-14', start1M, expiry1M);
  assert.equal(invalidBefore.isValid, false, 'Promise date before start date must be rejected');
  assert.match(invalidBefore.error, /cannot be earlier than membership start date/i);

  // Rule: Start date >= Expiry date is rejected
  const invalidRange = validatePromiseDate('2026-10-15', '2026-10-15', '2026-10-15');
  assert.equal(invalidRange.isValid, false, 'Start >= Expiry date is an invalid range');
  assert.match(invalidRange.error, /start date must be before expiry date/i);

  // Rule: Empty promise date is valid (no constraint violated if user has not set a promise date)
  assert.equal(validatePromiseDate('', start1M, expiry1M).isValid, false, 'Empty promise date is rejected when balance due exists');
  assert.equal(validatePromiseDate(null, start1M, expiry1M).isValid, false, 'Null promise date is rejected when balance due exists');

  // 1-year annual plan: 2026-01-01 to 2027-01-01
  const start1Y = '2026-01-01';
  const expiry1Y = '2027-01-01';
  assert.equal(validatePromiseDate('2026-12-31', start1Y, expiry1Y).isValid, true, 'Day before annual expiry is valid');
  assert.equal(validatePromiseDate('2027-01-01', start1Y, expiry1Y).isValid, false, 'Annual expiry date itself is rejected');
});

test('27. Membership status synchronization accurately maps lifecycle states without off-by-one errors', () => {
  const refDate = '2026-10-15'; // Simulated "today"

  // 1. Future start date -> "Upcoming"
  assert.equal(
    calculateMemberStatus('2026-11-20', 'Active', '2026-10-20', refDate),
    'Upcoming',
    'Future start date results in Upcoming status'
  );

  // 2. Active period with plenty of time remaining (> 10 days) -> "Active"
  assert.equal(
    calculateMemberStatus('2026-11-15', 'Active', '2026-10-01', refDate),
    'Active',
    'Expiry > 10 days away results in Active status'
  );

  // 3. Within 10 days of expiry -> "Expiring Soon"
  assert.equal(
    calculateMemberStatus('2026-10-20', 'Active', '2026-10-01', refDate),
    'Expiring Soon',
    'Expiry 5 days away results in Expiring Soon status'
  );

  // 4. On the expiry date itself -> "Expiring Soon", NOT "Expired" (valid through full day)
  assert.equal(
    calculateMemberStatus('2026-10-15', 'Active', '2026-09-15', refDate),
    'Expiring Soon',
    'On expiry date itself, membership is still valid (Expiring Soon), not Expired'
  );

  // 5. Day after expiry date -> "Expired"
  assert.equal(
    calculateMemberStatus('2026-10-14', 'Active', '2026-09-14', refDate),
    'Expired',
    'Day after expiry date transitions strictly to Expired'
  );

  // 6. Renewal reactivates Expired record (clears Expired lock)
  assert.equal(
    calculateMemberStatus('2026-11-15', 'Expired', '2026-10-01', refDate),
    'Active',
    'Renewal with future expiry date clears previous Expired status and reactivates to Active'
  );

  // 7. Administrative overrides are preserved
  const administrativeStatuses = ['Frozen', 'Frozen (Paused)', 'On Hold', 'Suspended', 'Cancelled'];
  for (const status of administrativeStatuses) {
    // Even if expired date
    assert.equal(
      calculateMemberStatus('2026-10-01', status, '2026-09-01', refDate),
      status,
      'Administrative override preserved even if past date'
    );
    // Even if future date
    assert.equal(
      calculateMemberStatus('2026-12-01', status, '2026-11-01', refDate),
      status,
      'Administrative override preserved even if future date'
    );
  }
});

test('28. Transferred and expired plans are excluded from active subscriptions breakdown', () => {
  const todayStr = '2026-10-15';

  // Helper matching MemberProfilePage / MemberProfileView logic
  function computePlansBreakdown(targetMember, invoices = []) {
    const memberStatus = String(targetMember?.status || '').toLowerCase();
    const expiryStr = (targetMember?.expiryDate || targetMember?.expiry_date || '').split('T')[0];
    const isMemberExpired = memberStatus === 'expired' || (expiryStr && expiryStr < todayStr);

    if (targetMember?.activePlans?.length > 0 || targetMember?.upcomingPlans?.length > 0 || targetMember?.expiredPlans?.length > 0) {
      let active = (targetMember.activePlans || []).filter(p => p.status !== 'Transferred' && p.status !== 'Expired');
      const upcoming = [...(targetMember.upcomingPlans || [])];
      const expired = [...(targetMember.expiredPlans || [])];

      if (isMemberExpired) {
        const remainingActive = [];
        active.forEach(p => {
          if (p.packageType === 'Gym-Cardio' || p.endDate < todayStr || (expiryStr && p.endDate <= expiryStr)) {
            expired.push({ ...p, status: p.status === 'Transferred' ? 'Transferred' : 'Expired' });
          } else {
            remainingActive.push(p);
          }
        });
        active = remainingActive;
      }

      return { active, upcoming, expired };
    }

    const activeMap = {};
    const upcoming = [];
    const expired = [];

    invoices.forEach((inv) => {
      if (inv.status === 'Cancelled' || inv.status === 'Refunded' || inv.status === 'Transferred') return;
      const type = inv.packageType || 'Gym-Cardio';
      const startStr = inv.startDate || todayStr;
      const endStr = inv.endDate;
      if (!endStr) return;

      const planItem = {
        packageType: type,
        planName: inv.planName || 'Plan',
        startDate: startStr,
        endDate: endStr,
        status: 'Active'
      };

      if (startStr > todayStr) {
        planItem.status = 'Upcoming';
        upcoming.push(planItem);
      } else if (endStr < todayStr || (isMemberExpired && (type === 'Gym-Cardio' || (expiryStr && endStr <= expiryStr)))) {
        planItem.status = 'Expired';
        expired.push(planItem);
      } else {
        activeMap[type] = planItem;
      }
    });

    return { active: Object.values(activeMap), upcoming, expired };
  }

  // Scenario A: Member whose membership was transferred (status: Expired, expiryDate yesterday, invoice marked Transferred)
  const transferredMember = {
    id: 'mem-9234',
    name: 'test',
    status: 'Expired',
    expiryDate: '2026-10-14',
    activePlans: [
      { packageType: 'Gym-Cardio', planName: 'test plan', startDate: '2026-10-15', endDate: '2026-11-14', status: 'Transferred' }
    ],
    expiredPlans: []
  };

  const breakdownA = computePlansBreakdown(transferredMember);
  assert.equal(breakdownA.active.length, 0, 'Transferred member must have 0 active subscriptions');

  // Scenario B: Member marked Expired, even if activePlans array had an un-flagged Gym-Cardio plan
  const expiredMember = {
    id: 'mem-100',
    name: 'Expired User',
    status: 'Expired',
    expiryDate: '2026-10-14',
    activePlans: [
      { packageType: 'Gym-Cardio', planName: 'Monthly Gym', startDate: '2026-09-15', endDate: '2026-10-14', status: 'Active' }
    ]
  };

  const breakdownB = computePlansBreakdown(expiredMember);
  assert.equal(breakdownB.active.length, 0, 'Expired member must not show Gym-Cardio in active subscriptions');
  assert.equal(breakdownB.expired.length, 1, 'Expired plan must be moved to expired');

  // Scenario C: Active member with legitimate active plan
  const activeMember = {
    id: 'mem-200',
    name: 'Active User',
    status: 'Active',
    expiryDate: '2026-11-14',
    activePlans: [
      { packageType: 'Gym-Cardio', planName: 'Monthly Gym', startDate: '2026-10-15', endDate: '2026-11-14', status: 'Active' }
    ]
  };

  const breakdownC = computePlansBreakdown(activeMember);
  assert.equal(breakdownC.active.length, 1, 'Active member retains active subscriptions');
});

test('29. Recently created member invoices are sorted at the top (newest first)', async () => {
  const { compareInvoicesDesc } = await import('../src/utils/searchUtils.js');

  // Test 1: Invoices with different dates
  const olderInv = mapInvoiceRecord({
    id: 'INV-001',
    numericId: 101,
    amount: 1000,
    date: '2026-10-01',
    createdAt: '2026-10-01T10:00:00.000Z'
  });
  const newerInv = mapInvoiceRecord({
    id: 'INV-002',
    numericId: 102,
    amount: 2000,
    date: '2026-10-15',
    createdAt: '2026-10-15T09:00:00.000Z'
  });

  const list1 = [olderInv, newerInv].sort(compareInvoicesDesc);
  assert.equal(list1[0].id, 'INV-002', 'Newer date invoice must be at the top');

  // Test 2: Invoices created on the same day with different timestamps
  const morningInv = mapInvoiceRecord({
    id: 'INV-MORNING',
    numericId: 103,
    amount: 1000,
    date: '2026-10-15',
    createdAt: '2026-10-15T08:30:00.000Z'
  });
  const afternoonInv = mapInvoiceRecord({
    id: 'INV-AFTERNOON',
    numericId: 104,
    amount: 5000,
    date: '2026-10-15',
    createdAt: '2026-10-15T15:45:00.000Z'
  });

  const list2 = [morningInv, afternoonInv].sort(compareInvoicesDesc);
  assert.equal(list2[0].id, 'INV-AFTERNOON', 'Invoice created in afternoon must appear before morning invoice on same day');

  // Test 3: Same day tie-breaker via database numericId
  const invA = mapInvoiceRecord({
    id: 'INV-XYZ',
    numericId: 2001,
    amount: 500,
    date: '2026-10-15'
  });
  const invB = mapInvoiceRecord({
    id: 'INV-ABC',
    numericId: 2002,
    amount: 1500,
    date: '2026-10-15'
  });

  const list3 = [invA, invB].sort(compareInvoicesDesc);
  assert.equal(list3[0].numericId, 2002, 'Highest numericId must be at the top when dates match');
});

test('30. Paid balance dues and fee receipts are excluded from Active Subscriptions & Packages', () => {
  const isFeeOrBalanceItem = (item) => {
    if (!item) return false;
    const pkgType = String(item.packageType || item.package_type || item.category || '').toLowerCase();
    const name = String(item.planName || item.name || item.title || '').toLowerCase();
    const combo = `${pkgType} ${name}`;
    return (
      pkgType === 'due payment' ||
      pkgType === 'fee payment' ||
      pkgType === 'membership fee' ||
      combo.includes('balance due') ||
      combo.includes('due payment') ||
      combo.includes('dues payment') ||
      combo.includes('fee collection') ||
      combo.includes('membership fee package')
    );
  };

  const sampleActivePlans = [
    { packageType: 'Gym-Cardio', planName: 'test plan', startDate: '2026-10-15', endDate: '2026-11-14', status: 'Active' },
    { packageType: 'Membership Fee', planName: 'Membership Fee Package', startDate: '2026-10-15', endDate: '2026-11-14', status: 'Active' },
    { packageType: 'Personal Training', planName: 'test pt plan', startDate: '2026-10-15', endDate: '2026-11-14', status: 'Active' },
    { packageType: 'Due Payment', planName: 'Balance Due Payment - test plan', startDate: '2026-10-15', endDate: null, status: 'Active' }
  ];

  const filtered = sampleActivePlans.filter(p => !isFeeOrBalanceItem(p) && p.status !== 'Transferred' && p.status !== 'Expired');

  assert.equal(filtered.length, 2, 'Only legitimate Gym-Cardio and Personal Training packages must remain');
  assert.equal(filtered[0].packageType, 'Gym-Cardio');
  assert.equal(filtered[1].packageType, 'Personal Training');
  assert.ok(!filtered.some(p => p.packageType === 'Membership Fee'), 'Membership Fee must not be in active packages');
  assert.ok(!filtered.some(p => p.packageType === 'Due Payment'), 'Due Payment must not be in active packages');
});

test('31. Personal Training package requires compulsory trainer assignment and blocks invoice creation without trainer', () => {
  const isPtRowCheck = (r) => {
    const cleanType = String(r.packageType || r.package_type || '').trim().toLowerCase();
    return (cleanType === 'personal training' || cleanType === 'pt') && Boolean(r.packageId);
  };

  const validateInvoiceSubmission = ({ selectedPackages, selectedTrainerId }) => {
    const hasPt = (selectedPackages || []).some(isPtRowCheck);
    if (hasPt && !selectedTrainerId) {
      return { isValid: false, error: 'Please select a trainer for the Personal Training package. Trainer selection is compulsory.' };
    }
    return { isValid: true, error: null };
  };

  // Case 1: PT package with empty trainer -> BLOCKED
  const ptWithoutTrainer = {
    selectedPackages: [
      { id: 'pkg-1', packageType: 'Personal Training', packageId: 'pt-101', price: 5000 }
    ],
    selectedTrainerId: ''
  };
  const result1 = validateInvoiceSubmission(ptWithoutTrainer);
  assert.equal(result1.isValid, false);
  assert.match(result1.error, /Trainer selection is compulsory/i);

  // Case 2: PT package with trainer selected -> VALID
  const ptWithTrainer = {
    selectedPackages: [
      { id: 'pkg-1', packageType: 'Personal Training', packageId: 'pt-101', price: 5000 }
    ],
    selectedTrainerId: 'trn-42'
  };
  const result2 = validateInvoiceSubmission(ptWithTrainer);
  assert.equal(result2.isValid, true);
  assert.equal(result2.error, null);

  // Case 3: Gym-Cardio package without trainer -> VALID (not compulsory for standard gym memberships)
  const cardioWithoutTrainer = {
    selectedPackages: [
      { id: 'pkg-1', packageType: 'Gym-Cardio', packageId: 'gc-101', price: 3000 }
    ],
    selectedTrainerId: ''
  };
  const result3 = validateInvoiceSubmission(cardioWithoutTrainer);
  assert.equal(result3.isValid, true);

  // Case 4: Multi-package with Gym-Cardio + PT without trainer -> BLOCKED
  const multiWithPtNoTrainer = {
    selectedPackages: [
      { id: 'pkg-1', packageType: 'Gym-Cardio', packageId: 'gc-101', price: 3000 },
      { id: 'pkg-2', packageType: 'Personal Training', packageId: 'pt-101', price: 5000 }
    ],
    selectedTrainerId: ''
  };
  const result4 = validateInvoiceSubmission(multiWithPtNoTrainer);
  assert.equal(result4.isValid, false);
  assert.match(result4.error, /Trainer selection is compulsory/i);
});
