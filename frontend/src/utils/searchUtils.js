/**
 * Universal Search Utilities
 * Multi-criteria, multi-token indexing for gym members, enquiries, and records.
 */

const MONTH_NAMES_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTH_SHORTS_EN = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

/**
 * Extracts comprehensive searchable date variations from a date string or timestamp.
 * Covers: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, D-M-YYYY, D/M/YYYY,
 * Month names (Oct, October), Day (08, 8), Year (2026), and combinations.
 */
export const extractDateKeywords = (dateVal) => {
  if (!dateVal) return [];
  const results = [];
  const raw = String(dateVal).trim().toLowerCase();
  results.push(raw);

  if (raw.includes('t')) {
    results.push(raw.split('t')[0]);
  }

  let d = null;
  const directDate = new Date(dateVal);
  if (!isNaN(directDate.getTime())) {
    d = directDate;
  } else if (typeof dateVal === 'string') {
    const parts = dateVal.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const d1 = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        if (!isNaN(d1.getTime())) d = d1;
      } else if (parts[0].length === 4) {
        const d2 = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d2.getTime())) d = d2;
      }
    }
  }

  if (d && !isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mNum = d.getMonth() + 1;
    const day = d.getDate();
    const mm = String(mNum).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yyyy = String(y);

    const mName = MONTH_NAMES_EN[mNum - 1];
    const mShort = MONTH_SHORTS_EN[mNum - 1];

    results.push(
      yyyy,
      mName,
      mShort,
      `${dd}-${mm}-${yyyy}`,
      `${dd}/${mm}/${yyyy}`,
      `${day}-${mNum}-${yyyy}`,
      `${day}/${mNum}/${yyyy}`,
      `${yyyy}-${mm}-${dd}`,
      `${yyyy}/${mm}/${dd}`,
      `${mm}/${dd}/${yyyy}`,
      `${dd}-${mm}`,
      `${dd}/${mm}`,
      `${day}/${mNum}`,
      `${day}-${mNum}`,
      `${mm}-${yyyy}`,
      `${mm}/${yyyy}`,
      `${yyyy}-${mm}`,
      `${yyyy}/${mm}`,
      `${dd} ${mShort} ${yyyy}`,
      `${day} ${mShort} ${yyyy}`,
      `${dd} ${mName} ${yyyy}`,
      `${day} ${mName} ${yyyy}`,
      `${mShort} ${yyyy}`,
      `${mName} ${yyyy}`,
      `${dd} ${mShort}`,
      `${day} ${mShort}`,
      `${mShort} ${dd}`,
      `${mShort} ${day}`,
      `${dd} ${mName}`,
      `${day} ${mName}`,
      `${mName} ${dd}`,
      `${mName} ${day}`
    );
  }

  return results;
};

/**
 * Universal matcher for members.
 * Matches across Name, Phone, Email, Dates, Plan, Coach, Status, Dues, ID, KYC, Goals, Notes.
 * Supports multi-token search terms (every word in query must match).
 */
export const matchesMemberUniversal = (m, query, { plans = [], trainers = [], invoices = [], calculateMemberStatus } = {}) => {
  if (!m) return false;
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim().toLowerCase();
  const tokens = rawQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const textPool = [];
  const phoneDigitsList = [];

  // 1. Names
  if (m.name) textPool.push(m.name);
  if (m.fullName) textPool.push(m.fullName);
  if (m.full_name) textPool.push(m.full_name);
  if (m.firstName) textPool.push(m.firstName);
  if (m.lastName) textPool.push(m.lastName);

  // 2. Mobile & Phones
  const phoneList = [
    m.phone, m.mobile, m.phoneNumber, m.contactNumber, m.contact,
    m.emergencyContact, m.emergencyPhone, m.emergency_contact, m.guardianPhone
  ];
  phoneList.forEach((p) => {
    if (p) {
      const pStr = String(p);
      textPool.push(pStr);
      const digits = pStr.replace(/\D/g, '');
      if (digits) {
        textPool.push(digits);
        phoneDigitsList.push(digits);
      }
    }
  });

  // 3. Email & Username
  if (m.email) textPool.push(m.email);
  if (m.username) textPool.push(m.username);

  // 4. IDs & Codes
  if (m.id !== undefined && m.id !== null) textPool.push(String(m.id));
  if (m.memberId) textPool.push(String(m.memberId));
  if (m.member_id) textPool.push(String(m.member_id));
  if (m.qrPassCode) textPool.push(String(m.qrPassCode));
  if (m.qrCode) textPool.push(String(m.qrCode));
  if (m.barcode) textPool.push(String(m.barcode));
  if (m.admissionNo) textPool.push(String(m.admissionNo));

  // 5. Plan / Package
  if (m.planName) textPool.push(m.planName);
  if (m.plan_name) textPool.push(m.plan_name);
  if (m.packageName) textPool.push(m.packageName);
  if (m.package_name) textPool.push(m.package_name);
  if (m.packageType) textPool.push(m.packageType);
  if (m.package_type) textPool.push(m.package_type);
  if (m.duration) textPool.push(String(m.duration));
  if (m.billingCycle) textPool.push(m.billingCycle);
  if (m.membershipType) textPool.push(m.membershipType);

  if (plans && plans.length > 0) {
    const matchedPlan = plans.find(p => String(p.id) === String(m.planId || m.plan_id));
    if (matchedPlan) {
      if (matchedPlan.name) textPool.push(matchedPlan.name);
      if (matchedPlan.type) textPool.push(matchedPlan.type);
      if (matchedPlan.category) textPool.push(matchedPlan.category);
      if (matchedPlan.duration) textPool.push(String(matchedPlan.duration));
      if (matchedPlan.billingCycle) textPool.push(matchedPlan.billingCycle);
    }
  }

  // 6. Coach / Trainer
  if (m.trainerName) textPool.push(m.trainerName);
  if (m.trainer_name) textPool.push(m.trainer_name);
  if (m.trainer) textPool.push(m.trainer);
  if (m.coach) textPool.push(m.coach);
  if (m.coachName) textPool.push(m.coachName);

  if (trainers && trainers.length > 0) {
    const matchedTrainer = trainers.find(t => String(t.id) === String(m.trainerId || m.trainer_id));
    if (matchedTrainer) {
      if (matchedTrainer.name) textPool.push(matchedTrainer.name);
      if (matchedTrainer.specialty) textPool.push(matchedTrainer.specialty);
    }
  }

  // 7. Status & Dues
  const effStatus = calculateMemberStatus ? calculateMemberStatus(m.expiryDate, m.status) : m.status;
  if (effStatus) textPool.push(effStatus);
  if (m.status) textPool.push(m.status);
  if (m.paymentStatus) textPool.push(m.paymentStatus);
  if (m.payment_status) textPool.push(m.payment_status);
  const dueAmt = Number(m.dueAmount ?? m.due_amount ?? m.balance ?? 0);
  if (dueAmt > 0) {
    textPool.push('due', 'unpaid', 'pending', `₹${dueAmt}`, String(dueAmt));
  } else {
    textPool.push('paid');
  }

  // 8. Dates (Joining, Expiry, DOB, Due Date, Created)
  const dateFields = [
    m.joinDate, m.join_date, m.joiningDate, m.joining_date, m.startDate, m.start_date,
    m.expiryDate, m.expiry_date, m.endDate, m.end_date,
    m.dob, m.dateOfBirth, m.date_of_birth, m.birthDate,
    m.dueDate, m.due_date, m.nextDueDate,
    m.createdAt, m.created_at
  ];
  dateFields.forEach((d) => {
    if (d) {
      const kw = extractDateKeywords(d);
      kw.forEach(k => textPool.push(k));
    }
  });

  // 9. KYC
  if (m.kycDocType) textPool.push(m.kycDocType);
  if (m.kyc_doc_type) textPool.push(m.kyc_doc_type);
  if (m.kycDocNumber) textPool.push(String(m.kycDocNumber));
  if (m.kyc_doc_number) textPool.push(String(m.kyc_doc_number));
  if (m.aadhar) textPool.push(String(m.aadhar));
  if (m.pan) textPool.push(String(m.pan));

  // 10. Demographics, Goals, Notes, Staff
  if (m.gender) textPool.push(m.gender);
  if (m.bloodGroup) textPool.push(m.bloodGroup);
  if (m.blood_group) textPool.push(m.blood_group);
  if (m.city) textPool.push(m.city);
  if (m.state) textPool.push(m.state);
  if (m.address) textPool.push(m.address);
  if (m.pincode) textPool.push(String(m.pincode));
  if (m.goal) textPool.push(m.goal);
  if (m.fitnessGoal) textPool.push(m.fitnessGoal);
  if (m.medicalNotes) textPool.push(m.medicalNotes);
  if (m.notes) textPool.push(m.notes);
  if (m.remarks) textPool.push(m.remarks);
  if (m.executive) textPool.push(m.executive);
  if (m.created_by_name) textPool.push(m.created_by_name);

  // 11. Invoices
  if (invoices && invoices.length > 0) {
    const memberInvoices = invoices.filter(inv => String(inv.memberId) === String(m.id));
    memberInvoices.forEach((inv) => {
      if (inv.invoiceNumber) textPool.push(inv.invoiceNumber);
      if (inv.receiptNumber) textPool.push(inv.receiptNumber);
      if (inv.paymentMethod) textPool.push(inv.paymentMethod);
    });
  }

  const combinedSearchStr = textPool.join(' ').toLowerCase();

  return tokens.every((token) => {
    const tokenDigits = token.replace(/\D/g, '');
    if (tokenDigits.length >= 2 && phoneDigitsList.some(pd => pd.includes(tokenDigits))) {
      return true;
    }
    return combinedSearchStr.includes(token);
  });
};

/**
 * Universal matcher for enquiries / leads.
 */
export const matchesEnquiryUniversal = (enq, query) => {
  if (!enq) return false;
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim().toLowerCase();
  const tokens = rawQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const textPool = [];
  const phoneDigitsList = [];

  if (enq.name) textPool.push(enq.name);
  if (enq.fullName) textPool.push(enq.fullName);
  if (enq.email) textPool.push(enq.email);

  const phoneList = [enq.phone, enq.mobile, enq.phoneNumber];
  phoneList.forEach(p => {
    if (p) {
      textPool.push(String(p));
      const digits = String(p).replace(/\D/g, '');
      if (digits) {
        textPool.push(digits);
        phoneDigitsList.push(digits);
      }
    }
  });

  if (enq.planInterested) textPool.push(enq.planInterested);
  if (enq.program) textPool.push(enq.program);
  if (enq.source) textPool.push(enq.source);
  if (enq.status) textPool.push(enq.status);
  if (enq.notes) textPool.push(enq.notes);

  const dateFields = [enq.date, enq.createdAt, enq.created_at, enq.followUpDate, enq.follow_up_date];
  dateFields.forEach(d => {
    if (d) {
      const kw = extractDateKeywords(d);
      kw.forEach(k => textPool.push(k));
    }
  });

  const combinedSearchStr = textPool.join(' ').toLowerCase();

  return tokens.every((token) => {
    const tokenDigits = token.replace(/\D/g, '');
    if (tokenDigits.length >= 2 && phoneDigitsList.some(pd => pd.includes(tokenDigits))) {
      return true;
    }
    return combinedSearchStr.includes(token);
  });
};
