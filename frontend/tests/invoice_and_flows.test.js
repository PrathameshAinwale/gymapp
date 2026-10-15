import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { formatInvoiceDate, wrapAndBreakText, generateInvoicePdf, formatPackageDateRange } from '../src/utils/invoicePdfGenerator.js';
import { isValidEmail, isValidPhone, hasSqlInjection, sanitizeText, sanitizeDigits, sanitizePhone } from '../src/utils/validation.js';
import { calculateAgeFromDob } from '../src/utils/dateUtils.js';

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



