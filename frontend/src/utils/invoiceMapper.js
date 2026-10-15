/**
 * Shared Single-Source-of-Truth Invoice Mapper
 *
 * Ensures that AddMemberPage (success screen), MemberInvoices, InvoicesPage,
 * MemberProfilePage, and PDF generation all render identical data shapes
 * directly from the backend's saved invoice record.
 */

export const mapInvoiceRecord = (raw) => {
  if (!raw) return null;

  const invNum = raw.invoiceNumber || raw.invoice_number || raw.id || null;
  let rawItems = [];
  try {
    if (Array.isArray(raw.items)) rawItems = raw.items;
    else if (typeof raw.items === 'string') rawItems = JSON.parse(raw.items);
    else if (Array.isArray(raw.packages)) rawItems = raw.packages;
    else if (typeof raw.packages === 'string') rawItems = JSON.parse(raw.packages);
  } catch (_) {
    rawItems = [];
  }
  if (!Array.isArray(rawItems)) rawItems = [];

  const items = rawItems.map((item) => ({
    packageType: item.packageType || item.package_type || 'Gym-Cardio',
    name: item.name || item.planName || item.plan_name || 'Membership Plan',
    planId: item.planId ?? item.plan_id ?? null,
    price: Number(item.price ?? item.amount ?? 0),
    discount: Number(item.discount ?? 0),
    netAmount: Number(item.net_amount ?? item.netAmount ?? ((item.price || 0) - (item.discount || 0))),
    startDate: item.startDate || item.start_date || null,
    endDate: item.endDate || item.end_date || item.expiryDate || item.expiry_date || null,
    trainerId: item.trainerId || item.trainer_id || null,
    ptSessions: Number(item.ptSessions ?? item.pt_sessions ?? 0),
  }));

  const paidAmount = Number(raw.paidAmount ?? raw.amount ?? raw.paid_amount ?? 0);
  const duesAmount = Number(raw.duesAmount ?? raw.pendingAmount ?? raw.dues_amount ?? raw.pending_amount ?? 0);
  const totalAmount = Number(raw.totalAmount ?? raw.total_amount ?? (paidAmount + duesAmount));
  const discountAmount = Number(raw.discountAmount ?? raw.discount_amount ?? raw.discount ?? 0);
  const grossAmount = Number(raw.grossAmount ?? raw.packageAmount ?? (totalAmount + discountAmount));

  const status = duesAmount > 0 ? 'Pending' : (raw.status || 'Paid');
  const issueDate = raw.issueDate || raw.date || raw.issue_date || new Date().toISOString().split('T')[0];
  const startDate = raw.startDate || raw.start_date || issueDate;
  const endDate = raw.endDate || raw.expiryDate || raw.end_date || raw.expiry_date || null;

  const createdByName = (raw.createdByName || raw.created_by_name || raw.executive || 'Staff').trim();

  return {
    id: invNum,
    invoiceNumber: invNum,
    invoice_number: invNum,
    numericId: raw.numericId ?? raw.numeric_id ?? raw.id ?? null,
    gymId: raw.gymId ?? raw.gym_id ?? null,
    memberId: raw.memberId || (raw.userId ? `mem-${raw.userId}` : (raw.user_id ? `mem-${raw.user_id}` : null)),
    userId: raw.userId ?? raw.user_id ?? (raw.memberId ? Number(String(raw.memberId).replace(/\D/g, '')) : null),
    memberName: raw.memberName || raw.member_name || raw.name || 'Member',
    memberPhone: raw.memberPhone || raw.member_phone || raw.phone || '',
    memberEmail: raw.memberEmail || raw.member_email || raw.email || '',
    planId: raw.planId || (raw.plan_id ? `plan-${raw.plan_id}` : null),
    planName: raw.planName || raw.plan_name || (items.length > 0 ? items.map((i) => i.name).join(' + ') : 'Membership Plan'),
    packageType: raw.packageType || raw.package_type || (items[0]?.packageType || 'Gym-Cardio'),
    items,
    packages: items,
    amount: paidAmount,
    paidAmount,
    paid_amount: paidAmount,
    totalAmount,
    total_amount: totalAmount,
    grossAmount,
    packageAmount: grossAmount,
    discountAmount,
    discount_amount: discountAmount,
    pendingAmount: duesAmount,
    duesAmount,
    dues_amount: duesAmount,
    dueDate: raw.dueDate || raw.due_date || null,
    due_date: raw.dueDate || raw.due_date || null,
    date: issueDate,
    issueDate,
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    expiryDate: endDate,
    expiry_date: endDate,
    paymentMethod: raw.paymentMethod || raw.payment_method || 'UPI',
    payment_method: raw.paymentMethod || raw.payment_method || 'UPI',
    status,
    invoiceUrl: raw.invoiceUrl || raw.invoice_url || '#',
    createdBy: raw.createdBy || raw.created_by || null,
    created_by: raw.createdBy || raw.created_by || null,
    createdByName,
    created_by_name: createdByName,
    executive: createdByName,
    creatorRole: raw.creatorRole || 'Staff',
    isGstIncluded: Boolean(raw.isGstIncluded ?? raw.gst_included ?? false),
    hasGst: Boolean(raw.hasGst ?? raw.isGstIncluded ?? raw.gst_included ?? false),
    taxableAmount: Number(raw.taxableAmount ?? raw.taxable_amount ?? 0),
    gstAmount: Number(raw.gstAmount ?? raw.gst_amount ?? 0),
    createdAt: raw.createdAt || raw.created_at || raw.timestamp || raw.date || null,
    created_at: raw.createdAt || raw.created_at || raw.timestamp || raw.date || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,
    updated_at: raw.updatedAt || raw.updated_at || null,
  };
};

export default mapInvoiceRecord;
