import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';
import { MembershipPlanModal, PACKAGE_TYPES, getPackagesForType, getPackageObjectFromLists, normalizePackageType } from '../common/MembershipPlanModal';
import { api } from '../../services/api';
import { generateInvoicePdf, downloadPdfBlob, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';
import { calculatePlanExpiryDate } from '../../utils/dateUtils';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import { getGymConsentForm } from '../../utils/consentFormConfig';
import {
  isValidEmail,
  isValidPhone,
  hasSqlInjection,
  sanitizeText,
  sanitizePhone,
  sanitizeDigits,
  sanitizeDecimal,
  preventNonNumericKey,
  preventNonPhoneKey
} from '../../utils/validation';
import {
  ArrowLeft,
  Camera,
  Upload,
  KeyRound,
  Sparkles,
  Dumbbell,
  Percent,
  ShieldCheck,
  MailCheck,
  CheckCircle,
  Loader2,
  UserCheck,
  Send,
  CheckCheck,
  Check,
  Copy,
  Plus,
  AlertCircle,
  Zap,
  Lock,
  Download,
  MessageCircle,
  Receipt,
  CreditCard,
  CheckCircle2,
  IndianRupee,
  Calendar,
  Cake,
  Tag,
  Trash2,
  Users,
  UserPlus,
  FileText,
  Shield,
  Activity,
  User,
  Phone,
  Mail,
  Save
} from 'lucide-react';

export const AddMemberPage = ({
  initialData = null,
  isUpgrade = false,
  upgradeMember = null,
  isEdit = false,
  editMember = null,
  isModal = false,
  onBack,
  onNavigateTab,
  onMemberAdded
}) => {
  const { registerAccount, currentUser } = useAuth();
  const {
    members = [],
    trainers = [],
    plans = [],
    ptPlans = [],
    recoveryPlans = [],
    fetchRecoveryPlans,
    fetchPtPlans,
    addMember,
    updateMember,
    calculateMemberStatus,
    addConsentForm,
    addCommissionRecord,
    allocatePTSessions,
    deleteEnquiry,
    fetchPlans,
    fetchTrainers,
    fetchInvoices,
    fetchMembers,
    fetchDashboardStats,
    gymInfo,
    addToast,
    addPlan,
    addRecoveryPlan,
    addPTPlan
  } = useGymData();

  const isEditMode = Boolean(isEdit || editMember || initialData?.isEdit || initialData?.isEditMode);
  const isUpgradeMode = Boolean(!isEditMode && (isUpgrade || upgradeMember || initialData?.isUpgrade));
  const targetMember = editMember || upgradeMember || (isUpgrade || isEdit ? initialData : (initialData?.isUpgrade || initialData?.isEdit ? initialData : null));

  const [isUpgradingBasePlan, setIsUpgradingBasePlan] = useState(false);

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  const calculateAgeFromDob = (dobStr) => {
    if (!dobStr) return '';
    try {
      const parts = String(dobStr).split('-');
      if (parts.length === 3) {
        const birthYear = parseInt(parts[0], 10);
        const birthMonth = parseInt(parts[1], 10) - 1;
        const birthDay = parseInt(parts[2], 10);
        if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return '';

        const today = new Date();
        let age = today.getFullYear() - birthYear;
        const m = today.getMonth() - birthMonth;
        if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
          age--;
        }
        return age >= 0 && age <= 125 ? age : '';
      }

      const birth = new Date(dobStr);
      if (isNaN(birth.getTime())) return '';
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 && age <= 125 ? age : '';
    } catch {
      return '';
    }
  };

  const defaultStaffExecutive = currentUser?.name || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'fit' + Math.floor(1000 + Math.random() * 9000),
    avatar: '',
    joinDate: getTodayDateStr(),
    dob: '',
    age: '',
    gender: 'Male',
    planId: '',
    trainerId: '',
    trainingType: 'self', // 'self' | 'general' | 'pt'
    ptSessionsCount: 12,
    goal: '',
    weight: '',
    targetWeight: '',
    height: '',
    medicalNotes: '',
    emergencyContact: '',
    executive: defaultStaffExecutive,
    kycDocType: 'Aadhaar Card',
    kycDocNumber: '',
    kycStatus: 'Verified'
  });

  // Membership Start and End Date States
  const [membershipStartDate, setMembershipStartDate] = useState(getTodayDateStr());
  const [membershipEndDate, setMembershipEndDate] = useState('');

  // Payment Breakdown States
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isGstIncluded, setIsGstIncluded] = useState(true);

  const [trainingType, setTrainingType] = useState('self');
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [ptCustomSessions, setPtCustomSessions] = useState(12);
  const [selectedPtPlanId, setSelectedPtPlanId] = useState('');
  const [ptPackageFee, setPtPackageFee] = useState(3000);
  const [recoveryPlanId, setRecoveryPlanId] = useState('');
  const [commissionType, setCommissionType] = useState('percent');
  const [ptCommissionPercent, setPtCommissionPercent] = useState();
  const [ptFixedCommission, setPtFixedCommission] = useState(1000);

  // Multi-Package Selection State
  const [selectedPackages, setSelectedPackages] = useState([
    {
      id: 'pkg-1',
      packageType: 'Gym-Cardio',
      packageId: '',
      price: 0,
      discount: ''
    }
  ]);

  const getPackageObject = (type, id) => {
    return getPackageObjectFromLists(type, id, plans, ptPlans, recoveryPlans);
  };

  const handlePackageTypeChange = (rowId, newType) => {
    const isPt = newType === 'Personal Training' || newType === 'pt';
    if (isPt && trainers && trainers.length > 0) {
      setSelectedTrainerId((prev) => prev || trainers[0].id);
      setFormData((prev) => ({ ...prev, trainerId: prev.trainerId || trainers[0].id }));
    }
    const available = getPackagesForType(newType, plans, ptPlans, recoveryPlans);
    const firstPlan = available[0] || null;

    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const newPackageId = firstPlan ? String(firstPlan.id) : '';
        const newPrice = Number(firstPlan?.price) || 0;

        if (firstPlan && membershipStartDate) {
          const calculated = computePlanEndDate(membershipStartDate, firstPlan);
          if (calculated) {
            setMembershipEndDate(calculated);
            setFormData((prevData) => ({
              ...prevData,
              expiryDate: calculated,
              status: calculateMemberStatus ? calculateMemberStatus(calculated, prevData.status) : prevData.status
            }));
          }
        }

        return {
          ...row,
          packageType: newType,
          packageId: newPackageId,
          price: newPrice,
          discount: ''
        };
      })
    );
  };

  const handlePackageIdChange = (rowId, newPackageId) => {
    if (newPackageId === '__ADD_NEW__') {
      const row = selectedPackages.find((r) => r.id === rowId);
      handleOpenQuickAdd(row?.packageType || 'Gym-Cardio', rowId);
      return;
    }
    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const found = getPackageObject(row.packageType, newPackageId);
        const price = Number(found?.price) || 0;
        const isPt = row.packageType === 'Personal Training' || row.packageType === 'pt';

        if (found && membershipStartDate) {
          const calculated = computePlanEndDate(membershipStartDate, found);
          if (calculated) {
            setMembershipEndDate(calculated);
            setFormData((prevData) => ({
              ...prevData,
              expiryDate: calculated,
              status: calculateMemberStatus ? calculateMemberStatus(calculated, prevData.status) : prevData.status
            }));
          }
        } else if (isPt && trainers && trainers.length > 0 && !selectedTrainerId) {
          setSelectedTrainerId(trainers[0].id);
          setFormData((prevData) => ({ ...prevData, trainerId: trainers[0].id }));
        }

        return {
          ...row,
          packageId: newPackageId,
          price: price
        };
      })
    );
  };

  const handlePackageDiscountChange = (rowId, val) => {
    const sanitized = sanitizeDecimal(val);
    setSelectedPackages((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, discount: sanitized } : row))
    );
  };

  const handleAddPackageRow = () => {
    const typesUsed = selectedPackages.map((p) => p.packageType);
    let nextType = PACKAGE_TYPES.find((t) => !typesUsed.includes(t)) || 'Personal Training';

    const available = getPackagesForType(nextType, plans, ptPlans, recoveryPlans);
    const firstPlan = available[0] || null;

    setSelectedPackages((prev) => [
      ...prev,
      {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        packageType: nextType,
        packageId: firstPlan ? String(firstPlan.id) : '',
        price: Number(firstPlan?.price) || 0,
        discount: ''
      }
    ]);
  };

  const handleRemovePackageRow = (rowId) => {
    if (selectedPackages.length <= 1) {
      const defaultType = 'Gym-Cardio';
      const available = getPackagesForType(defaultType, plans, ptPlans, recoveryPlans);
      const first = available[0] || plans[0] || null;
      setSelectedPackages([
        {
          id: `pkg-${Date.now()}`,
          packageType: defaultType,
          packageId: first ? String(first.id) : '',
          price: Number(first?.price) || 0,
          discount: ''
        }
      ]);
      return;
    }
    setSelectedPackages((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Sync first package when plans load
  useEffect(() => {
    if (plans && plans.length > 0) {
      setSelectedPackages((prev) => {
        const first = prev[0];
        if (first && !first.packageId) {
          const available = getPackagesForType(first.packageType, plans, ptPlans, recoveryPlans);
          const p = available[0] || plans[0];
          return prev.map((row, idx) =>
            idx === 0
              ? { ...row, packageType: row.packageType || p.packageType || 'Gym-Cardio', packageId: String(p.id), price: Number(p.price) || 0 }
              : row
          );
        }
        return prev;
      });
    }
  }, [plans, ptPlans, recoveryPlans]);

  // Owner-configured Dynamic Consent Form & Liability Waiver
  const [consentConfig, setConsentConfig] = useState(() => getGymConsentForm(gymInfo?.id));

  useEffect(() => {
    setConsentConfig(getGymConsentForm(gymInfo?.id));
  }, [gymInfo?.id]);

  useEffect(() => {
    const handleConsentUpdated = () => {
      setConsentConfig(getGymConsentForm(gymInfo?.id));
    };
    window.addEventListener('consent_settings_updated', handleConsentUpdated);
    return () => window.removeEventListener('consent_settings_updated', handleConsentUpdated);
  }, [gymInfo?.id]);

  const [consentAgreed, setConsentAgreed] = useState(true);
  const [signedInPerson, setSignedInPerson] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [newlyCreatedCredentials, setNewlyCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Check if a member with the same phone already exists
  const duplicatePhoneMember = useMemo(() => {
    if (isUpgradeMode || isEditMode || !formData.phone) return null;
    const cleanInput = String(formData.phone).replace(/\D/g, '');
    const last10 = cleanInput.length >= 10 ? cleanInput.slice(-10) : cleanInput;
    if (last10.length < 7) return null;

    return (members || []).find((m) => {
      if (!m.phone) return false;
      if (targetMember && (String(m.id) === String(targetMember.id) || String(m.phone) === String(targetMember.phone))) return false;
      const cleanMPhone = String(m.phone).replace(/\D/g, '');
      const mPhoneLast10 = cleanMPhone.length >= 10 ? cleanMPhone.slice(-10) : cleanMPhone;
      return mPhoneLast10 === last10 || cleanMPhone === cleanInput || m.phone === formData.phone;
    }) || null;
  }, [formData.phone, isUpgradeMode, isEditMode, members, targetMember]);

  // Quick Add Plan State
  const [quickAddPlanType, setQuickAddPlanType] = useState(null);
  const [activeQuickAddRowId, setActiveQuickAddRowId] = useState(null);

  const handleOpenQuickAdd = (type, rowId = null) => {
    setActiveQuickAddRowId(rowId);
    setQuickAddPlanType(normalizePackageType(type));
  };

  // Sync initialData or default plan on mount
  useEffect(() => {
    if (!plans || plans.length === 0) fetchPlans?.();
    if (!trainers || trainers.length === 0) fetchTrainers?.();
    fetchRecoveryPlans?.();
    fetchPtPlans?.();

    if (isEditMode && targetMember) {
      const initDob = targetMember.dob || '';
      const computedAge = initDob ? calculateAgeFromDob(initDob) : (targetMember.age ?? '');
      const rawMedNotes = targetMember.medicalNotes || '';
      const safeMedNotes = (rawMedNotes === 'None' || rawMedNotes === 'None reported' || rawMedNotes === targetMember.notes || rawMedNotes === targetMember.enquiryNotes)
        ? ''
        : rawMedNotes;

      setFormData({
        name: targetMember.name || '',
        email: targetMember.email || '',
        phone: targetMember.phone || '',
        password: '',
        avatar: targetMember.avatar || '',
        dob: initDob,
        age: computedAge,
        gender: targetMember.gender || 'Male',
        planId: targetMember.planId || targetMember.plan_id || plans[0]?.id || '',
        trainerId: targetMember.trainerId || targetMember.trainer_id || '',
        trainingType: targetMember.trainingType || targetMember.training_type || 'self',
        ptSessionsCount: targetMember.ptSessions ? Number(targetMember.ptSessions) : 12,
        goal: targetMember.goal || 'General Fitness',
        weight: targetMember.weight !== undefined && targetMember.weight !== null ? targetMember.weight : '',
        targetWeight: targetMember.targetWeight !== undefined && targetMember.targetWeight !== null ? targetMember.targetWeight : '',
        height: targetMember.height !== undefined && targetMember.height !== null ? targetMember.height : '',
        medicalNotes: safeMedNotes,
        emergencyContact: targetMember.emergencyContact || '',
        executive: targetMember.executive || defaultStaffExecutive,
        kycDocType: targetMember.kycDocType || targetMember.kyc_doc_type || 'Aadhaar Card',
        kycDocNumber: targetMember.kycDocNumber || targetMember.kyc_doc_number || '',
        kycStatus: targetMember.kycStatus || targetMember.kyc_status || 'Verified',
        status: targetMember.status || 'Active',
        expiryDate: targetMember.expiryDate || targetMember.expiry_date || targetMember.planExpiry || '',
        joinDate: targetMember.joinDate || targetMember.joining_date || getTodayDateStr()
      });

      setSelectedTrainerId(targetMember.trainerId || targetMember.trainer_id || '');
      setTrainingType(targetMember.trainingType || targetMember.training_type || 'self');
      setMembershipStartDate(targetMember.joinDate || targetMember.joining_date || getTodayDateStr());
      setMembershipEndDate(targetMember.expiryDate || targetMember.expiry_date || targetMember.planExpiry || '');
      setConsentAgreed(true);
      setSignedInPerson(true);
      setOtpVerified(true);
    } else if (isUpgradeMode && targetMember) {
      setFormData({
        name: targetMember.name || '',
        email: targetMember.email || '',
        phone: targetMember.phone || '',
        password: '',
        avatar: targetMember.avatar || '',
        dob: targetMember.dob || '',
        age: targetMember.dob ? calculateAgeFromDob(targetMember.dob) : (targetMember.age ?? ''),
        gender: targetMember.gender || 'Male',
        planId: targetMember.planId || plans[0]?.id || '',
        trainerId: targetMember.trainerId || '',
        trainingType: targetMember.trainingType || 'pt',
        ptSessionsCount: targetMember.ptSessions ? Number(targetMember.ptSessions) : 12,
        goal: targetMember.goal || 'Muscle Gain & Strength',
        weight: targetMember.weight || 70,
        targetWeight: targetMember.targetWeight || 75,
        height: targetMember.height || 175,
        medicalNotes: (targetMember.medicalNotes && targetMember.medicalNotes !== 'None' && targetMember.medicalNotes !== 'None reported') ? targetMember.medicalNotes : '',
        emergencyContact: targetMember.emergencyContact || targetMember.phone || '',
        executive: targetMember.executive || defaultStaffExecutive,
        kycDocType: targetMember.kycDocType || 'Aadhaar Card',
        kycDocNumber: targetMember.kycDocNumber || '',
        kycStatus: targetMember.kycStatus || 'Verified'
      });

      setTrainingType(targetMember.trainingType === 'pt' ? 'pt' : 'pt');
      setSelectedTrainerId(targetMember.trainerId || trainers[0]?.id || '');
      setPtCustomSessions(targetMember.ptSessions ? Number(targetMember.ptSessions) : 12);
      setPtPackageFee(3000);
      setRecoveryPlanId(targetMember.recoveryPlanId || '');
      setIsUpgradingBasePlan(false);
      setConsentAgreed(true);
      setSignedInPerson(true);
      setOtpVerified(true);
      setSelectedPackages([
        {
          id: 'pkg-1',
          packageType: targetMember.trainingType === 'pt' ? 'pt' : 'pt',
          packageId: targetMember.ptPlanId ? String(targetMember.ptPlanId) : (ptPlans[0]?.id ? String(ptPlans[0].id) : ''),
          price: ptPlans[0]?.price ? Number(ptPlans[0].price) : 3000,
          discount: ''
        }
      ]);
    } else if (initialData) {
      const initPlanId = initialData.planId ? String(initialData.planId) : (plans[0]?.id ? String(plans[0].id) : '');
      const matchedPlan = (plans || []).find((p) => String(p.id) === String(initPlanId));

      setFormData((prev) => {
        const initDob = initialData.dob || prev.dob || '';
        const computedAge = initDob ? calculateAgeFromDob(initDob) : (initialData.age ?? prev.age ?? '');
        const rawMedNotes = initialData.medicalNotes || '';
        const safeMedNotes = (rawMedNotes === 'None' || rawMedNotes === 'None reported' || rawMedNotes === initialData.notes || rawMedNotes === initialData.enquiryNotes)
          ? ''
          : rawMedNotes;

        return {
          ...prev,
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          password: 'fit' + Math.floor(1000 + Math.random() * 9000),
          planId: initPlanId,
          goal: initialData.goal || 'Muscle Gain & Strength',
          emergencyContact: initialData.emergencyContact || initialData.phone || '',
          enquiryId: initialData.enquiryId || null,
          executive: initialData.executive || prev.executive || defaultStaffExecutive,
          ...initialData,
          medicalNotes: safeMedNotes,
          dob: initDob,
          age: computedAge
        };
      });

      const matchedPkgType = normalizePackageType(matchedPlan?.packageType || matchedPlan?.package_type || 'Gym-Cardio');
      setSelectedPackages([
        {
          id: 'pkg-1',
          packageType: matchedPkgType,
          packageId: initPlanId,
          price: Number(matchedPlan?.price) || 0,
          discount: ''
        }
      ]);
    } else {
      const defPlanId = plans[0]?.id ? String(plans[0].id) : '';
      const defPlan = plans[0];
      const defPkgType = normalizePackageType(defPlan?.packageType || defPlan?.package_type || 'Gym-Cardio');

      setFormData((prev) => ({
        ...prev,
        planId: prev.planId || defPlanId,
        executive: prev.executive || defaultStaffExecutive
      }));

      setSelectedPackages([
        {
          id: 'pkg-1',
          packageType: defPkgType,
          packageId: defPlanId,
          price: Number(defPlan?.price) || 0,
          discount: ''
        }
      ]);
    }
  }, [plans, initialData, isUpgradeMode, isEditMode, targetMember, defaultStaffExecutive, fetchRecoveryPlans, fetchPtPlans, fetchPlans, fetchTrainers]);

  useEffect(() => {
    if (trainingType === 'pt' && !selectedPtPlanId && ptPlans && ptPlans.length > 0) {
      const defaultPt = ptPlans[0];
      setSelectedPtPlanId(String(defaultPt.id));
      setPtCustomSessions(Number(defaultPt.sessions) || 12);
      setPtPackageFee(Number(defaultPt.price) || 0);
    }
  }, [trainingType, selectedPtPlanId, ptPlans]);

  const isCoachSelected = Boolean(formData.trainerId && formData.trainerId !== 'general');
  const chosenTrainer = isCoachSelected ? trainers.find((t) => t.id === formData.trainerId) : null;

  const isPtRow = (r) => {
    const t = String(r?.packageType || '').toLowerCase();
    return t === 'personal training' || t === 'pt';
  };
  const isRecoveryRow = (r) => {
    const t = String(r?.packageType || '').toLowerCase();
    return t === 'massage' || t === 'activities' || t === 'recovery';
  };
  const isMembershipRow = (r) => !isPtRow(r) && !isRecoveryRow(r);

  const selectedMembershipRow = selectedPackages.find(
    (r) => isMembershipRow(r) && r.packageId
  ) || selectedPackages.find(isMembershipRow) || selectedPackages[0];

  const chosenPlan = selectedMembershipRow
    ? (getPackageObject(selectedMembershipRow.packageType, selectedMembershipRow.packageId) ||
       (plans || []).find((p) => String(p.id) === String(selectedMembershipRow.packageId)) || null)
    : ((plans || []).find((p) => String(p.id) === String(formData.planId)) || null);

  const selectedPtRow = selectedPackages.find(
    (r) => isPtRow(r) && r.packageId
  );
  const chosenPtPlan = selectedPtRow
    ? ((ptPlans || []).find((p) => String(p.id) === String(selectedPtRow.packageId)) || null)
    : ((ptPlans || []).find((p) => String(p.id) === String(selectedPtPlanId)) || null);

  const selectedRecoveryRow = selectedPackages.find(
    (r) => isRecoveryRow(r) && r.packageId
  );
  const chosenRecoveryPlan = selectedRecoveryRow
    ? ((recoveryPlans || []).find((r) => String(r.id) === String(selectedRecoveryRow.packageId)) || null)
    : ((recoveryPlans || []).find((r) => String(r.id) === String(recoveryPlanId)) || null);

  const hasPtPackage = Boolean(selectedPtRow);

  const maxPlanDiscount = chosenPlan ? Number(chosenPlan.maxDiscount ?? chosenPlan.max_discount ?? 0) : 0;

  const totalGrossPackages = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  }, [selectedPackages]);

  const totalDiscountAmount = useMemo(() => {
    return selectedPackages.reduce((sum, r) => sum + Math.max(0, Number(r.discount) || 0), 0);
  }, [selectedPackages]);

  const netPackageAmount = Math.max(0, totalGrossPackages - totalDiscountAmount);
  // Total bill is the net package fee — disabling GST does not increase the bill
  const totalCalculatedAmount = netPackageAmount;

  const parseAmount = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  };
  const numCash = parseAmount(cashAmount);
  const numUpi = parseAmount(upiAmount);
  const numTransfer = parseAmount(accountTransferAmount);
  const isAnyPartialFilled = cashAmount !== '' || upiAmount !== '' || accountTransferAmount !== '';
  const totalEnteredPaid = Math.round((numCash + numUpi + numTransfer) * 100) / 100;
  const isPaymentAmountEntered = isAnyPartialFilled || totalEnteredPaid > 0;
  const effectivePaidAmount = isAnyPartialFilled ? totalEnteredPaid : totalCalculatedAmount;
  const calculatedBalanceDue = Math.max(0, Math.round((totalCalculatedAmount - effectivePaidAmount) * 100) / 100);

  // Live GST breakdown:
  // - If GST is ticked: Base amount + CGST (9%) + SGST (9%) = targetAmount
  // - If GST is disabled: Flat payment without GST, no CGST / SGST bifurcation
  const gstBreakdown = useMemo(() => {
    const targetAmount = effectivePaidAmount > 0 ? effectivePaidAmount : totalCalculatedAmount;
    if (isGstIncluded) {
      const taxable = Math.round(targetAmount / 1.18);
      const totalGst = Math.max(0, targetAmount - taxable);
      const cgst = Math.round(totalGst / 2);
      const sgst = totalGst - cgst;
      return { taxable, totalGst, cgst, sgst, hasGst: true, targetAmount };
    } else {
      return { taxable: targetAmount, totalGst: 0, cgst: 0, sgst: 0, hasGst: false, targetAmount };
    }
  }, [isGstIncluded, effectivePaidAmount, totalCalculatedAmount]);

  const basePrice = selectedPackages
    .filter(isMembershipRow)
    .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const ptPrice = selectedPackages
    .filter(isPtRow)
    .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const recoveryPrice = selectedPackages
    .filter(isRecoveryRow)
    .reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  const calculateEffectivePackagePrice = (filterFn, defaultPrice) => {
    const row = selectedPackages.find((r) => filterFn(r) && r.packageId);
    if (!row) return 0;
    const gross = Number(row.price) || defaultPrice;
    const disc = Math.max(0, Number(row.discount) || 0);
    return Math.max(0, gross - disc);
  };

  const effectiveBasePrice = calculateEffectivePackagePrice(isMembershipRow, basePrice);
  const effectivePtPrice = calculateEffectivePackagePrice(isPtRow, ptPrice);
  const effectiveRecoveryPrice = calculateEffectivePackagePrice(isRecoveryRow, recoveryPrice);

  const numDiscount = totalDiscountAmount;

  const computePlanEndDate = (startDateStr, planObj) => {
    if (!startDateStr || !planObj) return '';
    try {
      const name = (planObj.name || '').toLowerCase();
      const period = (planObj.period || (planObj.validityDays ? `${planObj.validityDays} Days` : '')).toLowerCase();
      let monthsToAdd = Number(planObj.durationMonths || planObj.duration_months) || 1;

      if (name.includes('annual') || name.includes('1 year') || name.includes('12 month') || period.includes('12 month') || period.includes('annual')) {
        monthsToAdd = 12;
      } else if (name.includes('6 month') || period.includes('6 month') || name.includes('half year')) {
        monthsToAdd = 6;
      } else if (name.includes('3 month') || period.includes('3 month') || name.includes('quarter')) {
        monthsToAdd = 3;
      } else if (name.includes('1 month') || period.includes('1 month') || name.includes('monthly')) {
        monthsToAdd = 1;
      }

      const bonusDays = Number(planObj.offerDays || planObj.offer_days) || 0;
      return calculatePlanExpiryDate(startDateStr, monthsToAdd, planObj.period || (planObj.validityDays ? `${planObj.validityDays} Days` : ''), bonusDays);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (membershipStartDate && chosenPlan) {
      const calculated = computePlanEndDate(membershipStartDate, chosenPlan);
      if (calculated) {
        setMembershipEndDate(calculated);
        setFormData((prev) => ({
          ...prev,
          expiryDate: calculated,
          status: calculateMemberStatus ? calculateMemberStatus(calculated, prev.status) : prev.status
        }));
      }
    }
  }, [membershipStartDate, chosenPlan]);

  const getResolvedPaymentMethod = () => {
    const parts = [];
    if (numCash > 0) parts.push(`Cash (₹${numCash.toLocaleString('en-IN')})`);
    if (numUpi > 0) parts.push(`UPI (₹${numUpi.toLocaleString('en-IN')})`);
    if (numTransfer > 0) parts.push(`Bank Transfer (₹${numTransfer.toLocaleString('en-IN')})`);

    if (parts.length > 1) {
      return `Split: ${parts.join(' + ')}`;
    }
    if (numCash > 0) return 'Cash';
    if (numUpi > 0) return 'UPI';
    if (numTransfer > 0) return 'Account Transfer';
    return 'UPI';
  };

  const ptCommissionAmount = useMemo(() => {
    if (!hasPtPackage && trainingType !== 'pt') return 0;
    if (commissionType === 'percent') {
      const pct = Math.max(0, Math.min(100, Number(ptCommissionPercent) || 0));
      return Math.round((effectivePtPrice * pct) / 100);
    }
    return Math.max(0, Number(ptFixedCommission) || 0);
  }, [hasPtPackage, trainingType, commissionType, ptCommissionPercent, ptFixedCommission, effectivePtPrice]);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let pwd = 'fit';
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pwd }));
    addToast('Generated secure initial password!', 'success');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast('Photo size must be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, avatar: reader.result }));
        addToast('Profile photo attached!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendOtp = () => {
    if (!formData.email || !isValidEmail(formData.email)) {
      addToast('Please enter a valid member email address to receive OTP.', 'error');
      return;
    }
    setIsSendingOtp(true);
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpSent(true);
      setIsSendingOtp(false);
      addToast(`Verification OTP sent to ${formData.email}! (Demo code: ${code})`, 'success');
    }, 800);
  };

  const handleVerifyOtp = () => {
    if (!otpValue || otpValue.trim() !== generatedOtp.trim()) {
      addToast('Invalid OTP entered. Please verify code.', 'error');
      return;
    }
    setIsVerifyingOtp(true);
    setTimeout(() => {
      setOtpVerified(true);
      setIsVerifyingOtp(false);
      addToast('Member verified successfully!', 'success');
    }, 600);
  };

  const resetFormState = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: 'fit' + Math.floor(1000 + Math.random() * 9000),
      avatar: '',
      joinDate: getTodayDateStr(),
      dob: '',
      age: '',
      gender: 'Male',
      planId: plans[0]?.id || '',
      trainerId: '',
      trainingType: 'self',
      ptSessionsCount: 12,
      goal: '',
      weight: '',
      targetWeight: '',
      height: '',
      medicalNotes: '',
      emergencyContact: '',
      executive: defaultStaffExecutive,
      kycDocType: 'Aadhaar Card',
      kycDocNumber: '',
      kycStatus: 'Verified'
    });
    setMembershipStartDate(getTodayDateStr());
    setMembershipEndDate('');
    setCashAmount('');
    setUpiAmount('');
    setAccountTransferAmount('');
    setBalanceDueDate('');
    setDiscountAmount('');
    setIsGstIncluded(true);
    setTrainingType('self');
    setSelectedTrainerId('');
    setSelectedPtPlanId('');
    setRecoveryPlanId('');
    setPtPackageFee(3000);
    setPtCustomSessions(12);
    setConsentAgreed(true);
    setSignedInPerson(true);
    setOtpSent(false);
    setOtpValue('');
    setGeneratedOtp('');
    setOtpVerified(false);
    const firstPlanType = normalizePackageType(plans[0]?.packageType || plans[0]?.package_type || 'Gym-Cardio');
    setSelectedPackages([
      {
        id: 'pkg-1',
        packageType: firstPlanType,
        packageId: plans[0]?.id ? String(plans[0].id) : '',
        price: Number(plans[0]?.price) || 0,
        discount: ''
      }
    ]);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode && targetMember) {
      if (!formData.name?.trim()) {
        addToast('Please enter member full name.', 'error');
        return;
      }

      if (
        hasSqlInjection(formData.name) ||
        hasSqlInjection(formData.emergencyContact) ||
        hasSqlInjection(formData.goal) ||
        hasSqlInjection(formData.medicalNotes)
      ) {
        addToast('Security Warning: Disallowed characters or potential SQL injection detected.', 'error');
        return;
      }

      setIsCreatingMember(true);
      try {
        const chosenTrainer = trainers.find((t) => String(t.id) === String(selectedTrainerId || formData.trainerId));
        const effectiveExpiry = formData.expiryDate || membershipEndDate || targetMember.expiryDate;
        const autoStatus = calculateMemberStatus
          ? calculateMemberStatus(effectiveExpiry, formData.status || targetMember.status)
          : (formData.status || targetMember.status || 'Active');

        const payload = {
          ...targetMember,
          ...formData,
          name: formData.name.trim(),
          email: targetMember.email, // locked & preserved
          phone: targetMember.phone, // locked & preserved
          emergencyContact: formData.emergencyContact || '',
          dob: formData.dob || null,
          age: formData.age !== '' && formData.age !== null ? Number(formData.age) : null,
          gender: formData.gender || 'Male',
          weight: formData.weight !== '' && formData.weight !== null ? Number(formData.weight) : null,
          targetWeight: formData.targetWeight !== '' && formData.targetWeight !== null ? Number(formData.targetWeight) : null,
          height: formData.height !== '' && formData.height !== null ? Number(formData.height) : null,
          goal: formData.goal || 'General Fitness',
          medicalNotes: formData.medicalNotes || '',
          executive: formData.executive || '',
          kycDocType: formData.kycDocType || 'Aadhaar Card',
          kycDocNumber: formData.kycDocNumber || '',
          avatar: formData.avatar || targetMember.avatar || '',
          trainerId: chosenTrainer ? chosenTrainer.id : (formData.trainerId || null),
          trainerName: chosenTrainer ? chosenTrainer.name : (formData.trainerId ? targetMember.trainerName : null),
          status: autoStatus,
          expiryDate: effectiveExpiry || null,
        };

        if (updateMember) {
          await updateMember(targetMember.id, payload);
        }
        addToast(`Member "${formData.name}" details updated successfully!`, 'success');
        fetchMembers?.();
        fetchDashboardStats?.();

        if (onMemberAdded) {
          onMemberAdded();
        } else if (onBack) {
          onBack();
        } else if (onNavigateTab) {
          onNavigateTab('members');
        }
      } catch (err) {
        console.error('Failed to update member:', err);
        addToast(err?.message || 'Failed to update member details', 'error');
      } finally {
        setIsCreatingMember(false);
      }
      return;
    }

    if (isUpgradeMode && targetMember) {
      if (totalCalculatedAmount <= 0) {
        addToast('Please select at least one top-up service (PT or Recovery) with price > 0.', 'error');
        return;
      }

      setIsCreatingMember(true);
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        let resolvedTrainer = null;
        let resolvedTrainerName = targetMember.trainerName || 'Dedicated Trainer';
        if (hasPtPackage || trainingType === 'pt') {
          resolvedTrainer = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];
          resolvedTrainerName = resolvedTrainer ? `${resolvedTrainer.name} (PT Coach)` : 'PT Coach';
        }

        const validPackages = selectedPackages.filter((p) => p.packageId);
        const topupNames = [];
        validPackages.forEach((pkgRow) => {
          const obj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
          if (obj?.name) topupNames.push(obj.name);
        });

        const invoiceTitle = topupNames.length > 0
          ? `Top-up: ${topupNames.join(' + ')}`
          : 'Membership Services Top-up';

        const finalPaymentMethod = getResolvedPaymentMethod();

        const updatedPayload = {
          ...targetMember,
          trainingType: hasPtPackage ? 'pt' : (targetMember.trainingType || 'self'),
          trainerId: resolvedTrainer ? resolvedTrainer.id : targetMember.trainerId,
          trainerName: resolvedTrainer ? resolvedTrainer.name : targetMember.trainerName,
          ptPlanId: hasPtPackage ? (chosenPtPlan?.id || 'pt-upgrade') : targetMember.ptPlanId,
          ptPlanName: hasPtPackage ? (chosenPtPlan?.name || `${chosenPtPlan?.sessions || ptCustomSessions} Sessions PT`) : targetMember.ptPlanName,
          ptSessions: hasPtPackage
            ? (Number(targetMember.ptSessions || 0) + (chosenPtPlan?.sessions ? Number(chosenPtPlan.sessions) : Number(ptCustomSessions)))
            : targetMember.ptSessions,
          recoveryPlanId: chosenRecoveryPlan ? chosenRecoveryPlan.id : targetMember.recoveryPlanId,
          recoveryPlanName: chosenRecoveryPlan ? chosenRecoveryPlan.name : targetMember.recoveryPlanName,
          lastUpgradedDate: todayStr
        };

        if (updateMember) {
          await updateMember(targetMember.id, updatedPayload);
        }

        if (hasPtPackage && allocatePTSessions) {
          const sessionCount = chosenPtPlan?.sessions ? Number(chosenPtPlan.sessions) : Number(ptCustomSessions);
          allocatePTSessions({
            memberId: targetMember.id,
            memberName: targetMember.name,
            trainerId: resolvedTrainer?.id,
            trainerName: resolvedTrainer?.name,
            totalSessions: sessionCount,
            planName: chosenPtPlan?.name || 'PT Top-up'
          });
        }

        if (resolvedTrainer && hasPtPackage && ptCommissionAmount > 0 && addCommissionRecord) {
          await addCommissionRecord({
            trainerId: resolvedTrainer.id,
            trainerName: resolvedTrainer.name,
            memberName: targetMember.name,
            planName: chosenPtPlan ? chosenPtPlan.name : 'Personal Training Top-up',
            sessionType: 'Personal Training (PT)',
            serviceType: 'Personal Training (PT)',
            ratePercent: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            amount: effectivePtPrice,
            packageAmount: effectivePtPrice,
            commissionEarned: ptCommissionAmount,
            date: todayStr,
            status: 'Pending'
          });
        }

        addToast(`Top-up applied successfully for ${targetMember.name}!`, 'success');
        fetchMembers?.();
        fetchInvoices?.();
        fetchDashboardStats?.();

        setNewlyCreatedCredentials({
          name: targetMember.name,
          email: targetMember.email,
          phone: targetMember.phone,
          password: '••••••••',
          id: targetMember.id,
          qrPassCode: targetMember.qrPassCode,
          planName: invoiceTitle,
          packageAmount: basePrice + ptPrice + recoveryPrice,
          grossAmount: basePrice + ptPrice + recoveryPrice,
          discountAmount: numDiscount,
          netAmount: totalCalculatedAmount,
          totalAmount: totalCalculatedAmount,
          paidAmount: effectivePaidAmount,
          duesAmount: calculatedBalanceDue,
          dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
          isFullPayment: calculatedBalanceDue === 0,
          paymentMethod: finalPaymentMethod,
          startDate: todayStr,
          expiryDate: targetMember.expiryDate || todayStr,
          joinDate: targetMember.joinDate || todayStr,
          ptName: hasPtPackage ? `${chosenPtPlan?.name || `${ptCustomSessions} PT Sessions`}` : null,
          recoveryName: chosenRecoveryPlan?.name,
          trainerCommission: ptCommissionAmount > 0 ? ptCommissionAmount : null,
          trainerName: resolvedTrainerName,
          isUpgrade: true
        });
      } catch (err) {
        console.error('Upgrade submission error:', err);
        addToast(`Failed to process upgrade: ${err.message}`, 'error');
      } finally {
        setIsCreatingMember(false);
      }
      return;
    }

    if (!formData.name?.trim()) {
      addToast('Please enter member full name.', 'error');
      return;
    }

    if (
      hasSqlInjection(formData.name) ||
      (formData.email && hasSqlInjection(formData.email)) ||
      hasSqlInjection(formData.phone) ||
      hasSqlInjection(formData.password) ||
      hasSqlInjection(formData.medicalNotes) ||
      hasSqlInjection(formData.goal)
    ) {
      addToast('Security Warning: Disallowed characters or potential SQL injection detected.', 'error');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      addToast('Please enter a valid email address (e.g. member@example.com).', 'error');
      return;
    }

    if (!isUpgradeMode && !formData.phone?.trim()) {
      addToast('Mobile number is mandatory to register a member.', 'error');
      return;
    }

    if (!isUpgradeMode && !isValidPhone(formData.phone)) {
      addToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (!isUpgradeMode && duplicatePhoneMember) {
      addToast(`Member already exists with this mobile number (${duplicatePhoneMember.name} - ${duplicatePhoneMember.phone || formData.phone})`, 'error');
      return;
    }

    const validPackages = selectedPackages.filter((p) => p.packageId);
    if (!isUpgradeMode && validPackages.length === 0) {
      addToast('Please select at least one package for the new member.', 'error');
      return;
    }

    // Validate max discount ceiling on selected packages
    for (const pkgRow of selectedPackages) {
      if (pkgRow.packageId) {
        const pObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
        const maxDisc = pObj ? Number(pObj.maxDiscount ?? pObj.max_discount ?? 0) : 0;
        const enteredDisc = Math.max(0, Number(pkgRow.discount) || 0);
        const pkgPrice = Number(pkgRow.price) || (pObj ? Number(pObj.price) : 0);

        if (maxDisc > 0 && enteredDisc > maxDisc) {
          addToast(`Discount ₹${enteredDisc.toLocaleString('en-IN')} on "${pObj?.name || pkgRow.packageType}" exceeds maximum allowed discount of ₹${maxDisc.toLocaleString('en-IN')}.`, 'error');
          return;
        }

        if (enteredDisc > pkgPrice && pkgPrice > 0) {
          addToast(`Discount ₹${enteredDisc.toLocaleString('en-IN')} cannot exceed plan fee of ₹${pkgPrice.toLocaleString('en-IN')}.`, 'error');
          return;
        }
      }
    }

    if (!consentAgreed) {
      addToast('Please review and agree to the Gym Terms & Liability Waiver.', 'error');
      return;
    }

    if (!otpVerified && !signedInPerson) {
      addToast('Please verify the member via Email OTP or check In-Person Physical Form Signed.', 'error');
      return;
    }

    setIsCreatingMember(true);
    try {
      let resolvedTrainer = null;
      let resolvedTrainerName = 'None / Self Guided';
      let finalTrainerId = null;

      if (trainingType === 'general') {
        resolvedTrainer = null;
        resolvedTrainerName = 'General Trainer';
        finalTrainerId = null;
      } else if (hasPtPackage || trainingType === 'pt') {
        resolvedTrainer = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];
        resolvedTrainerName = resolvedTrainer ? `${resolvedTrainer.name} (PT Coach)` : 'PT Coach';
        finalTrainerId = resolvedTrainer?.id;
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const fallbackExpiry = computePlanEndDate(membershipStartDate || todayStr, chosenPlan);

      if (calculatedBalanceDue > 0 && !balanceDueDate) {
        addToast('Please select the date when the remaining balance due will be paid.', 'error');
        setIsCreatingMember(false);
        return;
      }

      const finalPaymentMethod = getResolvedPaymentMethod();
      const finalStartDate = membershipStartDate || todayStr;
      const finalExpiryDate = membershipEndDate || fallbackExpiry || todayStr;
      const finalJoinDate = formData.joinDate || finalStartDate;

      const additions = [];
      validPackages.forEach((pkgRow) => {
        const obj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
        if (obj?.name) additions.push(obj.name);
      });

      const invoiceTitle = additions.length > 0
        ? additions.join(' + ')
        : (chosenPlan?.name || 'Gym Membership');

      const createdMember = await addMember({
        name: sanitizeText(formData.name),
        email: formData.email ? formData.email.trim().toLowerCase() : null,
        phone: formData.phone,
        password: formData.password || 'fit1234',
        avatar: formData.avatar || '',
        dob: formData.dob || null,
        age: formData.age ? Number(formData.age) : (formData.dob ? calculateAgeFromDob(formData.dob) : null),
        gender: formData.gender || 'Male',
        joinDate: finalJoinDate,
        startDate: finalStartDate,
        membershipStartDate: finalStartDate,
        expiryDate: finalExpiryDate,
        membershipEndDate: finalExpiryDate,
        planId: chosenPlan?.id || null,
        planName: chosenPlan?.name || (hasPtPackage ? 'PT Membership' : 'Gym Membership'),
        amount: effectivePaidAmount,
        paid_amount: effectivePaidAmount,
        paidAmount: effectivePaidAmount,
        total_amount: totalCalculatedAmount,
        totalAmount: totalCalculatedAmount,
        discount: numDiscount,
        discount_amount: numDiscount,
        discountAmount: numDiscount,
        dues_amount: calculatedBalanceDue,
        duesAmount: calculatedBalanceDue,
        due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
        dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
        payment_method: finalPaymentMethod,
        paymentMethod: finalPaymentMethod,
        is_gst_included: isGstIncluded,
        gst_included: isGstIncluded,
        gst_rate: 18,
        gstRate: 18,
        gst_amount: gstBreakdown.totalGst,
        gstAmount: gstBreakdown.totalGst,
        taxable_amount: gstBreakdown.taxable,
        taxableAmount: gstBreakdown.taxable,
        invoice_title: invoiceTitle,
        trainerId: finalTrainerId,
        trainerName: resolvedTrainerName,
        trainingType: hasPtPackage ? 'pt' : trainingType,
        ptPlanId: hasPtPackage ? (chosenPtPlan?.id || 'custom-pt') : null,
        ptPlanName: hasPtPackage ? (chosenPtPlan?.name || `${chosenPtPlan?.sessions || ptCustomSessions} Sessions PT`) : null,
        ptSessions: hasPtPackage ? (chosenPtPlan?.sessions ? Number(chosenPtPlan.sessions) : Number(ptCustomSessions)) : 0,
        recoveryPlanId: chosenRecoveryPlan ? chosenRecoveryPlan.id : null,
        recoveryPlanName: chosenRecoveryPlan ? chosenRecoveryPlan.name : null,
        goal: formData.goal,
        weight: formData.weight,
        targetWeight: formData.targetWeight,
        height: formData.height,
        medicalNotes: formData.medicalNotes,
        emergencyContact: formData.emergencyContact,
        executive: formData.executive || '',
        created_by: currentUser?.userId || currentUser?.id,
        created_by_name: formData.executive?.trim() || currentUser?.name || 'Staff',
        kycDocType: formData.kycDocType || 'Aadhaar Card',
        kycDocNumber: formData.kycDocNumber || 'Not provided',
        kycStatus: formData.kycStatus || 'Verified',
        consentSigned: true,
        consentSignedDate: todayStr
      });

      const linkedEnquiryId = initialData?.enquiryId || formData.enquiryId;
      if (linkedEnquiryId && deleteEnquiry) {
        deleteEnquiry(linkedEnquiryId);
      }

      await registerAccount({
        id: createdMember.id,
        name: formData.name,
        email: formData.email || null,
        username: (formData.email ? formData.email.split('@')[0] : formData.phone) || `mem_${createdMember.id}`,
        password: formData.password || 'fit1234',
        role: 'member',
        planName: chosenPlan?.name,
        qrPassCode: createdMember.qrPassCode
      });

      await addConsentForm({
        memberId: createdMember.id,
        memberName: formData.name,
        phone: formData.phone,
        planName: chosenPlan?.name,
        formType: 'General Fitness & Liability Waiver (Integrated OTP Signed)',
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyContact,
        medicalNotes: formData.medicalNotes,
        status: 'Signed',
        signedDate: todayStr
      });

      if (resolvedTrainer && (trainingType === 'pt' || hasPtPackage) && ptCommissionAmount > 0) {
        await addCommissionRecord({
          trainerId: resolvedTrainer.id,
          trainerName: resolvedTrainer.name,
          memberName: formData.name,
          planName: chosenPtPlan ? chosenPtPlan.name : `1-on-1 PT (${chosenPtPlan?.sessions || ptCustomSessions} Sessions)`,
          sessionType: 'Personal Training (PT)',
          serviceType: 'Personal Training (PT)',
          ratePercent: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
          commissionPct: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
          amount: effectivePtPrice,
          packageAmount: effectivePtPrice,
          commissionEarned: ptCommissionAmount,
          date: todayStr,
          status: 'Pending'
        });
      }

      fetchMembers?.();
      fetchInvoices?.();
      fetchDashboardStats?.();
      addToast(`Athlete "${formData.name}" added to Member Directory!`, 'success');

      setNewlyCreatedCredentials({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || 'fit1234',
        id: createdMember.id,
        invoiceNumber: createdMember.invoiceNumber || createdMember.invoice_number || null,
        qrPassCode: createdMember.qrPassCode,
        planName: invoiceTitle,
        packageAmount: basePrice + ptPrice + recoveryPrice,
        grossAmount: basePrice + ptPrice + recoveryPrice,
        discountAmount: numDiscount,
        netAmount: totalCalculatedAmount,
        totalAmount: totalCalculatedAmount,
        paidAmount: effectivePaidAmount,
        duesAmount: calculatedBalanceDue,
        dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
        isFullPayment: calculatedBalanceDue === 0,
        paymentMethod: finalPaymentMethod,
        isGstIncluded,
        gstAmount: gstBreakdown.totalGst,
        taxableAmount: gstBreakdown.taxable,
        startDate: finalStartDate,
        expiryDate: finalExpiryDate,
        joinDate: finalJoinDate,
        ptName: trainingType === 'pt' ? `${ptCustomSessions} 1-on-1 PT Sessions` : null,
        recoveryName: chosenRecoveryPlan?.name,
        trainerCommission: ptCommissionAmount > 0 ? ptCommissionAmount : null,
        trainerName: resolvedTrainerName,
        whatsappWelcome: createdMember?.whatsapp_welcome || null
      });

      resetFormState();
    } catch (err) {
      console.error('Registration submission error:', err);
      addToast(`Failed to register member: ${err.message}`, 'error');
    } finally {
      setIsCreatingMember(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!newlyCreatedCredentials) return;
    const gross = Number(newlyCreatedCredentials.packageAmount || newlyCreatedCredentials.grossAmount || newlyCreatedCredentials.totalAmount || 0);
    const disc = Number(newlyCreatedCredentials.discountAmount || 0);
    const net = Number(newlyCreatedCredentials.netAmount || newlyCreatedCredentials.totalAmount || 0);
    const paid = Number(newlyCreatedCredentials.paidAmount ?? net);
    const dues = Number(newlyCreatedCredentials.duesAmount || 0);
    const isGst = Boolean(newlyCreatedCredentials.isGstIncluded);

    const baseFee = Math.round(paid / 1.18);
    const totalGst = Math.max(0, paid - baseFee);
    const cgst = Math.round(totalGst / 2);
    const sgst = totalGst - cgst;

    const gstSection = isGst
      ? `• Plan Base Fee: ₹${baseFee.toLocaleString('en-IN')}\n` +
        `• CGST (9%): ₹${cgst.toLocaleString('en-IN')}\n` +
        `• SGST (9%): ₹${sgst.toLocaleString('en-IN')}\n`
      : `• Tax Applied: None (Non-GST Payment)\n`;

    const text = `Welcome to ${gymInfo?.name || 'PulseFit Pro'}!\n\n` +
      `Here are your Member Login Credentials:\n` +
      `• Member ID: ${newlyCreatedCredentials.id}\n` +
      `• Password: ${newlyCreatedCredentials.password}\n` +
      (newlyCreatedCredentials.email ? `• Login Email: ${newlyCreatedCredentials.email}\n` : '') +
      `• Membership Plan: ${newlyCreatedCredentials.planName}\n\n` +
      `Bill Breakdown:\n` +
      `• Package Amount: ₹${gross.toLocaleString('en-IN')}\n` +
      (disc > 0 ? `• Discount Offered: -₹${disc.toLocaleString('en-IN')}\n` : '') +
      gstSection +
      `• Total Bill: ₹${net.toLocaleString('en-IN')}\n` +
      `• Amount Paid: ₹${paid.toLocaleString('en-IN')}\n` +
      (dues > 0 ? `• Balance Due: ₹${dues.toLocaleString('en-IN')}${newlyCreatedCredentials.dueDate ? ` (Due: ${newlyCreatedCredentials.dueDate})` : ''}\n` : `• Payment Status: Paid in Full\n`);

    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Credentials and bill breakdown copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyField = (val, fieldKey) => {
    if (!val) return;
    navigator.clipboard.writeText(String(val));
    setCopiedField(fieldKey);
    addToast(`Copied ${fieldKey === 'id' ? 'Member ID' : 'Password'}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShareMemberWhatsApp = () => {
    if (!newlyCreatedCredentials) return;
    const gross = Number(newlyCreatedCredentials.packageAmount || newlyCreatedCredentials.grossAmount || newlyCreatedCredentials.totalAmount || 0);
    const disc = Number(newlyCreatedCredentials.discountAmount || 0);
    const net = Number(newlyCreatedCredentials.netAmount || newlyCreatedCredentials.totalAmount || 0);
    const paid = Number(newlyCreatedCredentials.paidAmount ?? net);
    const dues = Number(newlyCreatedCredentials.duesAmount || 0);
    const isGst = Boolean(newlyCreatedCredentials.isGstIncluded);

    const baseFee = Math.round(paid / 1.18);
    const totalGst = Math.max(0, paid - baseFee);
    const cgst = Math.round(totalGst / 2);
    const sgst = totalGst - cgst;

    const gstSection = isGst
      ? `• Plan Base Fee: ₹${baseFee.toLocaleString('en-IN')}\n` +
        `• CGST (9%): ₹${cgst.toLocaleString('en-IN')}\n` +
        `• SGST (9%): ₹${sgst.toLocaleString('en-IN')}\n`
      : `• Tax Applied: None (Non-GST Payment)\n`;

    const text = `Welcome to *${gymInfo?.name || 'PulseFit Pro'}*!\n\n` +
      `Here are your Member Login Credentials:\n` +
      `• Member ID: *${newlyCreatedCredentials.id}*\n` +
      `• Password: *${newlyCreatedCredentials.password}*\n` +
      (newlyCreatedCredentials.email ? `• Login Email: ${newlyCreatedCredentials.email}\n` : '') +
      `• Membership Plan: ${newlyCreatedCredentials.planName}\n\n` +
      `*Bill Breakdown:*\n` +
      `• Package Amount: ₹${gross.toLocaleString('en-IN')}\n` +
      (disc > 0 ? `• Discount Offered: -₹${disc.toLocaleString('en-IN')}\n` : '') +
      gstSection +
      `• Total Bill: ₹${net.toLocaleString('en-IN')}\n` +
      `• Amount Paid: ₹${paid.toLocaleString('en-IN')}\n` +
      (dues > 0 ? `• Balance Due: ₹${dues.toLocaleString('en-IN')}${newlyCreatedCredentials.dueDate ? ` (Due: ${newlyCreatedCredentials.dueDate})` : ''}\n` : `• Payment Status: Paid in Full\n`);

    const url = getWhatsAppUrl(newlyCreatedCredentials.phone, text);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownloadInvoicePdf = async () => {
    if (!newlyCreatedCredentials) return;
    try {
      const invObj = {
        invoiceNumber: newlyCreatedCredentials.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        id: newlyCreatedCredentials.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        memberName: newlyCreatedCredentials.name,
        name: newlyCreatedCredentials.name,
        memberPhone: newlyCreatedCredentials.phone,
        phone: newlyCreatedCredentials.phone,
        memberEmail: newlyCreatedCredentials.email,
        email: newlyCreatedCredentials.email,
        planName: newlyCreatedCredentials.planName,
        packageAmount: newlyCreatedCredentials.packageAmount || newlyCreatedCredentials.totalAmount,
        discountAmount: newlyCreatedCredentials.discountAmount || 0,
        amount: newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount,
        totalAmount: newlyCreatedCredentials.totalAmount,
        duesAmount: newlyCreatedCredentials.duesAmount || 0,
        pendingAmount: newlyCreatedCredentials.duesAmount || 0,
        dueDate: newlyCreatedCredentials.dueDate,
        paymentMethod: newlyCreatedCredentials.paymentMethod || 'UPI',
        date: newlyCreatedCredentials.startDate || getTodayDateStr(),
        startDate: newlyCreatedCredentials.startDate,
        expiryDate: newlyCreatedCredentials.expiryDate,
        isGstIncluded: Boolean(newlyCreatedCredentials.isGstIncluded),
        hasGst: Boolean(newlyCreatedCredentials.isGstIncluded),
        status: Number(newlyCreatedCredentials.duesAmount || 0) > 0 ? 'Pending' : 'Paid'
      };
      const result = generateInvoicePdf({ invoice: invObj, gymInfo, member: newlyCreatedCredentials });
      if (result && typeof result.download === 'function') {
        result.download();
      } else {
        const fileName = `Invoice_${invObj.invoiceNumber}_${(newlyCreatedCredentials.name || 'Member').replace(/\s+/g, '_')}.pdf`;
        downloadPdfBlob(result?.blob || result, fileName, result?.doc);
      }
      addToast('Invoice PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Invoice PDF generation error:', err);
      addToast('Failed to generate invoice PDF', 'error');
    }
  };

  const handleBackToMemberList = () => {
    if (onMemberAdded) {
      onMemberAdded();
    } else if (onBack) {
      onBack();
    } else if (onNavigateTab) {
      onNavigateTab('members');
    }
  };

  // SUCCESS CONFIRMATION RECEIPT SCREEN (When member is registered)
  if (newlyCreatedCredentials) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 w-full">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                  Enrolled & Added to Directory
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {newlyCreatedCredentials.isUpgrade ? 'Top-up Upgraded Successfully!' : 'Member Registered Successfully!'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Athlete profile and active membership pass are now live in your Member Directory.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBackToMemberList}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>Go to Member Directory</span>
            </button>
          </div>
        </div>

        {/* Automated WhatsApp Welcome Status Banner */}
        {newlyCreatedCredentials?.whatsappWelcome?.sent ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs">WhatsApp Welcome Message Sent Automatically!</h4>
                <p className="text-[11px] text-emerald-700">
                  Directly dispatched to <strong>{newlyCreatedCredentials.phone}</strong> via {newlyCreatedCredentials.whatsappWelcome.provider || 'Gateway'}.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white uppercase tracking-wider shrink-0">
              Auto Sent
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-700">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800">WhatsApp Welcome Notification:</span>{' '}
                <span className="text-slate-500">
                  {newlyCreatedCredentials?.whatsappWelcome?.skipped
                    ? 'Automated welcome is currently paused in WhatsApp Settings.'
                    : 'Direct gateway credentials not yet configured. Use the button below to send in 1 click.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShareMemberWhatsApp}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>1-Click WhatsApp</span>
            </button>
          </div>
        )}

        {/* Member Credentials & Receipt Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* 1. Login Account Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                  <span>Member Portal Login Credentials</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  Role: Member
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {/* Member ID */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Member ID</span>
                    <span className="font-mono font-bold text-base text-white tracking-wide">{newlyCreatedCredentials.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyField(newlyCreatedCredentials.id, 'id')}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Member ID"
                  >
                    {copiedField === 'id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Password</span>
                    <span className="font-mono font-bold text-base text-emerald-400 tracking-wide">{newlyCreatedCredentials.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyField(newlyCreatedCredentials.password, 'password')}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedField === 'password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Email / Phone */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Login Phone / Email</span>
                    <span className="font-medium text-slate-200">{newlyCreatedCredentials.phone} {newlyCreatedCredentials.email ? `• ${newlyCreatedCredentials.email}` : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCredentials}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials & Welcome Message'}</span>
            </button>
          </div>

          {/* 2. Billing & Membership Details Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Invoice & Membership Summary</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {newlyCreatedCredentials.duesAmount > 0 ? 'Partial Payment' : 'Paid in Full'}
                </span>
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Athlete Name:</span>
                  <span className="font-bold text-slate-900">{newlyCreatedCredentials.name}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Selected Plan:</span>
                  <span className="font-bold text-emerald-700">{newlyCreatedCredentials.planName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Validity Period:</span>
                  <span className="font-medium text-slate-800">{newlyCreatedCredentials.startDate} to {newlyCreatedCredentials.expiryDate}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Gross Package Amount:</span>
                  <span className="font-mono font-medium text-slate-700">₹{Number(newlyCreatedCredentials.packageAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                {Number(newlyCreatedCredentials.discountAmount) > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-50 text-emerald-600 font-semibold">
                    <span>Discount Applied:</span>
                    <span className="font-mono">-₹{Number(newlyCreatedCredentials.discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Amount Paid ({newlyCreatedCredentials.paymentMethod}):</span>
                  <span className="font-mono font-bold text-slate-900">₹{Number(newlyCreatedCredentials.paidAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                {Number(newlyCreatedCredentials.duesAmount) > 0 && (
                  <div className="flex items-center justify-between py-1 text-rose-600 font-bold bg-rose-50 px-2.5 rounded-lg border border-rose-200">
                    <span>Balance Due {newlyCreatedCredentials.dueDate ? `(Due: ${newlyCreatedCredentials.dueDate})` : ''}:</span>
                    <span className="font-mono">₹{Number(newlyCreatedCredentials.duesAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleShareMemberWhatsApp}
                className="py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Send WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoicePdf}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Next Steps Action Footer */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setNewlyCreatedCredentials(null);
              resetFormState();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Another Member</span>
          </button>

          <button
            type="button"
            onClick={handleBackToMemberList}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Users className="w-4 h-4" />
            <span>Open Member Directory</span>
          </button>
        </div>
      </div>
    );
  }

  // MAIN REGISTRATION FORM PAGE
  return (
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* 1. Header Navigation Bar */}
      {!isModal && (
        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackToMemberList}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Return to Member Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {isUpgradeMode
                  ? `Upgrade Services: ${targetMember?.name || 'Member'}`
                  : isEditMode
                    ? `Edit Athlete Dossier: ${targetMember?.name || formData.name || 'Member'}`
                    : 'Register Member'}
              </h1>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Notification Banner */}
      {isEditMode && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                Editing Athlete: {targetMember?.name} ({targetMember?.id || 'Profile'})
              </h4>
              <p className="text-[11px] text-emerald-700 truncate">
                Email and Phone number are locked for account security. Personal details, biometrics, goals, and coach can be updated below.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider shrink-0 ml-2">
            Edit Mode
          </span>
        </div>
      )}

      {/* Upgrade Notification Banner */}
      {isUpgradeMode && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-violet-600 text-white shadow-xs shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-violet-950 truncate">
                Upgrade Mode: {targetMember?.name} ({targetMember?.id})
              </h4>
              <p className="text-[11px] text-violet-700 truncate">
                Member profile and login credentials preserved. Select Personal Training, Recovery, or Plan upgrades below.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200 uppercase tracking-wider shrink-0 ml-2">
            Top-up
          </span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleCreateSubmit} className="space-y-4">
        {/* SECTION 1: Member Photo & Portal Credentials */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Member Profile & Portal Access
              </h2>
            </div>
            {!isUpgradeMode && !isEditMode && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Login with mobile or email
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            {/* Profile Photo Uploader */}
            <div className="md:col-span-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Member" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div>
                  <span className="text-xs font-bold text-slate-800 block leading-tight">Member Photo</span>
                </div>
                {(!isUpgradeMode || isEditMode) && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 transition-all">
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    {formData.avatar && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, avatar: '' }))}
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Member Portal Login Credentials */}
            <div className="md:col-span-7 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Member Portal Login Credentials</span>
                </div>
                {!isUpgradeMode && !isEditMode && (
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-generate
                  </button>
                )}
              </div>

              {isUpgradeMode || isEditMode ? (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Login Email: <strong>{formData.email || 'Mobile Login'}</strong></span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Preserved
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Login Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="athlete@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Initial Password *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Personal Information & Identification */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Personal Information & Identification
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                disabled={isUpgradeMode && !isEditMode}
                placeholder="e.g. Liam Hemsworth"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl text-xs ${isUpgradeMode && !isEditMode
                  ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">Phone Number *</label>
                {(isUpgradeMode || isEditMode) && (
                  <span className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                  </span>
                )}
              </div>
              <input
                type="tel"
                required={!isUpgradeMode && !isEditMode}
                disabled={isUpgradeMode || isEditMode}
                readOnly={isEditMode}
                placeholder="10-digit mobile number"
                maxLength={10}
                inputMode="numeric"
                onKeyDown={preventNonPhoneKey}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                className={`w-full px-3 py-2 rounded-xl text-xs transition-colors ${
                  isUpgradeMode || isEditMode
                    ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none font-medium'
                    : duplicatePhoneMember
                      ? 'bg-rose-50 border-2 border-rose-500 text-slate-900 focus:outline-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-medium'
                }`}
              />
              {isEditMode ? (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>Locked for mobile OTP verification & account security.</span>
                </p>
              ) : duplicatePhoneMember && (
                <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>Existing member already registered with this mobile</span>
                </p>
              )}
            </div>

            {isEditMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Email Address</label>
                  <span className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  readOnly
                  value={formData.email || ''}
                  className="w-full px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs cursor-not-allowed select-none font-medium"
                  placeholder="athlete@example.com"
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  <span>Permanent member login ID (cannot be changed).</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invoice / Joining Date *</span>
              </label>
              <input
                type="date"
                required
                disabled={isUpgradeMode || isEditMode}
                value={formData.joinDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, joinDate: val }));
                  setMembershipStartDate(val);
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs ${
                  isUpgradeMode || isEditMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Cake className="w-3.5 h-3.5 text-emerald-600" />
                <span>Date of Birth (DOB)</span>
              </label>
              <input
                type="date"
                disabled={isUpgradeMode && !isEditMode}
                value={formData.dob}
                onChange={(e) => {
                  const val = e.target.value;
                  const computedAge = calculateAgeFromDob(val);
                  setFormData({
                    ...formData,
                    dob: val,
                    age: computedAge !== '' ? computedAge : formData.age
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                min={5}
                max={120}
                placeholder="e.g. 25"
                disabled={isUpgradeMode && !isEditMode}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: sanitizeDigits(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
              <select
                disabled={isUpgradeMode && !isEditMode}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {isEditMode && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Membership Status</label>
                  <select
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                    <option value="Frozen">Frozen / Paused</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Plan Expiry Date</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    readOnly
                    disabled
                    value={formData.expiryDate || membershipEndDate || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-not-allowed select-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION 3: Membership Package & Multi-Package Builder */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                {isEditMode ? '3. Active Membership Subscription' : '3. Membership Packages & Add-on Services'}
              </h2>
            </div>
            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddPackageRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Package</span>
              </button>
            )}
          </div>

          {isEditMode ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                    Active Plan On Record
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    {targetMember?.planName || chosenPlan?.name || 'Active Membership Pass'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    Status: <strong className="text-emerald-700">{formData.status || targetMember?.status || 'Active'}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled Date</span>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formData.joinDate || targetMember?.joinDate || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan Expiry Date</span>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <input
                      type="date"
                      readOnly
                      disabled
                      value={formData.expiryDate || membershipEndDate || ''}
                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Coach</span>
                  <select
                    value={selectedTrainerId || formData.trainerId || ''}
                    onChange={(e) => {
                      setSelectedTrainerId(e.target.value);
                      setFormData((prev) => ({ ...prev, trainerId: e.target.value }));
                    }}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="">None / Self Guided</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialty || 'Coach'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                ℹ️ Membership subscription was billed upon enrollment. To purchase additional Personal Training (PT) sessions or top-ups, return to directory and select <strong>Upgrade</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedPackages.map((pkgRow, idx) => {
                const currentPkgObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
                const isPt = pkgRow.packageType === 'Personal Training' || pkgRow.packageType === 'pt';
                const isMembership = !isPt;
                const availablePackages = getPackagesForType(pkgRow.packageType, plans, ptPlans, recoveryPlans);
                const maxPlanDiscount = currentPkgObj ? Number(currentPkgObj.maxDiscount ?? currentPkgObj.max_discount ?? 0) : 0;

                return (
                  <div
                    key={pkgRow.id}
                    className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Package #{idx + 1}</span>
                      </span>

                      {selectedPackages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePackageRow(pkgRow.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Line 1: Package Type & Package Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Package Type */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Package Type *</label>
                        <select
                          value={pkgRow.packageType}
                          onChange={(e) => handlePackageTypeChange(pkgRow.id, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                        >
                          {PACKAGE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Package Name */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">Package Name *</label>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAdd(pkgRow.packageType, pkgRow.id)}
                            className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                          >
                            + New
                          </button>
                        </div>
                        <select
                          value={pkgRow.packageId}
                          onChange={(e) => handlePackageIdChange(pkgRow.id, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                        >
                          <option value="">
                            -- Choose {pkgRow.packageType} {availablePackages.length === 0 ? '(No plans yet)' : ''} --
                          </option>
                          {availablePackages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sessions ? `(${p.sessions} Sessions)` : (p.period ? `(${p.period})` : (p.durationMonths ? `(${p.durationMonths} Month)` : ''))} — ₹{Number(p.price || 0).toLocaleString('en-IN')}
                            </option>
                          ))}
                          <option value="__ADD_NEW__">+ Create New Plan...</option>
                        </select>
                      </div>
                    </div>

                    {/* Line 2: Amount / Fee & Discount (below Package Type and Package Name) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Fee (₹)</label>
                        <input
                          type="text"
                          readOnly
                          value={`₹${(Number(pkgRow.price) || 0).toLocaleString('en-IN')}`}
                          className="w-full px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">Discount (₹)</label>
                          {maxPlanDiscount > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                              Number(pkgRow.discount) > maxPlanDiscount
                                ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              Max: ₹{maxPlanDiscount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="0"
                          value={pkgRow.discount}
                          onChange={(e) => handlePackageDiscountChange(pkgRow.id, e.target.value)}
                          className={`w-full px-2.5 py-2 bg-white border rounded-xl text-xs font-mono transition-colors focus:outline-none ${
                            maxPlanDiscount > 0 && Number(pkgRow.discount) > maxPlanDiscount
                              ? 'border-rose-500 ring-1 ring-rose-500 text-rose-700 bg-rose-50/40'
                              : 'border-slate-200 text-slate-900 focus:border-emerald-500'
                          }`}
                        />
                        {maxPlanDiscount > 0 && Number(pkgRow.discount) > maxPlanDiscount && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            ⚠️ Discount cannot exceed ₹{maxPlanDiscount.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date fields for membership start & end date (always shown no matter whatever the package type is) */}
                    {(idx === 0 || !isPt) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Start Date *</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={membershipStartDate}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              setMembershipStartDate(newStart);
                              if (newStart) {
                                const calculated = computePlanEndDate(newStart, currentPkgObj || chosenPlan);
                                if (calculated) {
                                  setMembershipEndDate(calculated);
                                  setFormData((prev) => ({
                                    ...prev,
                                    expiryDate: calculated,
                                    status: calculateMemberStatus ? calculateMemberStatus(calculated, prev.status) : prev.status
                                  }));
                                }
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>End Date (Expiry) *</span>
                            </label>
                          </div>
                          <input
                            type="date"
                            readOnly
                            disabled
                            value={membershipEndDate}
                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-not-allowed select-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Dedicated PT Coach selection if PT package */}
                    {isPt && pkgRow.packageId && (
                      <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Dedicated PT Coach Selection</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {currentPkgObj?.sessions || ptCustomSessions} Sessions Included
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-7">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Assigned Coach *
                            </label>
                            <select
                              value={selectedTrainerId}
                              onChange={(e) => {
                                setSelectedTrainerId(e.target.value);
                                setFormData((prev) => ({ ...prev, trainerId: e.target.value }));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              {trainers && trainers.length > 0 ? (
                                trainers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.specialty}) — {t.experience}
                                  </option>
                                ))
                              ) : (
                                <option value="">No trainers available</option>
                              )}
                            </select>
                          </div>

                          <div className="sm:col-span-5 bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <Percent className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Commission</span>
                              </span>
                              <span className="font-mono font-bold text-indigo-700 text-xs">
                                ₹{ptCommissionAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setCommissionType('percent')}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${commissionType === 'percent' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                                >
                                  %
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setCommissionType('fixed')}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${commissionType === 'fixed' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                                >
                                  ₹
                                </button>
                              </div>
                              {commissionType === 'percent' ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={ptCommissionPercent}
                                  onChange={(e) => setPtCommissionPercent(sanitizeDigits(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold"
                                />
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  value={ptFixedCommission}
                                  onChange={(e) => setPtFixedCommission(sanitizeDigits(e.target.value))}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: Fitness Profile & Emergency Contact */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              4. Physical Stats, Fitness Goal & Emergency Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Fitness Goal</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">-- Select Goal --</option>
                <option value="Weight Loss & Fat Reduction">Weight Loss & Fat Reduction</option>
                <option value="Muscle Building & Hypertrophy">Muscle Building & Hypertrophy</option>
                <option value="Strength & Powerlifting">Strength & Powerlifting</option>
                <option value="Athletic Conditioning">Athletic Conditioning</option>
                <option value="General Health & Wellness">General Health & Wellness</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 72.5"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 68.0"
                value={formData.targetWeight}
                onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder="e.g. 175"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Emergency Contact (Name & Phone)
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah (Sister) - 9876543210"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Front Desk Executive / Staff In-Charge
              </label>
              <input
                type="text"
                placeholder="Staff name"
                value={formData.executive}
                onChange={(e) => setFormData({ ...formData, executive: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Medical Notes & Health Considerations
              </label>
              <input
                type="text"
                placeholder="Any prior injuries, chronic conditions, or physician recommendations (optional)"
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Fee Calculation, Discounts & Payment Settlement (Unified Card) */}
        {!isEditMode && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            {/* Header with Title, Gross Packages & Discounts, and Total Payable Price Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    5. Fee Calculation & Payment Settlement
                  </h2>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7">
                  <span>Total Packages: <strong className="text-slate-700 font-mono">₹{totalGrossPackages.toLocaleString('en-IN')}</strong></span>
                  {numDiscount > 0 && (
                    <span className="text-amber-700 font-semibold">Total Discount: <strong className="font-mono">-₹{numDiscount.toLocaleString('en-IN')}</strong></span>
                  )}
                  {isPaymentAmountEntered && (
                    isGstIncluded ? (
                      <span className="text-emerald-700 font-medium">GST (18%): <span className="font-semibold">Included in Bill</span></span>
                    ) : (
                      <span className="text-slate-500 font-medium">GST: <span className="font-semibold">Disabled (Non-GST)</span></span>
                    )
                  )}
                </div>
              </div>

              {/* Total Payable Price Pill */}
              <div className="sm:self-center shrink-0 bg-emerald-50/90 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-2.5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Total Payable Price</span>
                <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                  ₹{totalCalculatedAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 3 Payment Methods: Cash, UPI, Account Transfer (Compact 3-column grid with titles on top) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* 1. Cash */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">Cash</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={cashAmount}
                      onChange={(e) => setCashAmount(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all text-right"
                    />
                  </div>
                  <button
                    type="button"
                    title="Pay remaining in Cash"
                    onClick={() => {
                      const other = (Number(upiAmount) || 0) + (Number(accountTransferAmount) || 0);
                      const rem = Math.max(0, totalCalculatedAmount - other);
                      setCashAmount(rem > 0 ? String(rem) : '');
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                  >
                    Full
                  </button>
                </div>
              </div>

              {/* 2. UPI */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">UPI</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={upiAmount}
                      onChange={(e) => setUpiAmount(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 transition-all text-right"
                    />
                  </div>
                  <button
                    type="button"
                    title="Pay remaining via UPI"
                    onClick={() => {
                      const other = (Number(cashAmount) || 0) + (Number(accountTransferAmount) || 0);
                      const rem = Math.max(0, totalCalculatedAmount - other);
                      setUpiAmount(rem > 0 ? String(rem) : '');
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                  >
                    Full
                  </button>
                </div>
              </div>

              {/* 3. Account Transfer */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">Account Transfer</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={accountTransferAmount}
                      onChange={(e) => setAccountTransferAmount(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400 transition-all text-right"
                    />
                  </div>
                  <button
                    type="button"
                    title="Pay remaining via Account Transfer"
                    onClick={() => {
                      const other = (Number(cashAmount) || 0) + (Number(upiAmount) || 0);
                      const rem = Math.max(0, totalCalculatedAmount - other);
                      setAccountTransferAmount(rem > 0 ? String(rem) : '');
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                  >
                    Full
                  </button>
                </div>
              </div>
            </div>

            {/* GST TOGGLE BUTTON & TAX BREAKDOWN (Appears when payment amount is entered) */}
            {isPaymentAmountEntered && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200 space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg border transition-colors shrink-0 mt-0.5 sm:mt-0 ${
                        isGstIncluded
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">GST</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                            isGstIncluded
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isGstIncluded ? 'GST Included' : 'GST Disabled (Non-GST)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isGstIncluded
                          ? `GST included in ₹${gstBreakdown.targetAmount.toLocaleString('en-IN')}. Bill will display Base Fee + CGST + SGST = ₹${gstBreakdown.targetAmount.toLocaleString('en-IN')}.`
                          : `Received ₹${gstBreakdown.targetAmount.toLocaleString('en-IN')} flat without GST. Bill will NOT have CGST / SGST bifurcation.`}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button with "GST Included" / "GST Disabled" text */}
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-center bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                    <input
                      type="checkbox"
                      checked={isGstIncluded}
                      onChange={(e) => setIsGstIncluded(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                    <span className="text-xs font-bold text-slate-800">
                      {isGstIncluded ? 'GST Included' : 'GST Disabled'}
                    </span>
                  </label>
                </div>

                {/* When GST is Ticked: Show Base Amount + CGST + SGST = Total Bifurcation */}
                {isGstIncluded ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Base Amount</span>
                      <strong className="text-slate-800 font-mono text-xs">
                        ₹{gstBreakdown.taxable.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">CGST (9%)</span>
                      <strong className="text-slate-800 font-mono text-xs">
                        ₹{gstBreakdown.cgst.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">SGST (9%)</span>
                      <strong className="text-slate-800 font-mono text-xs">
                        ₹{gstBreakdown.sgst.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg border bg-emerald-50/70 border-emerald-200 text-emerald-900">
                      <span className="block text-[10px] font-semibold uppercase">
                        Total (Base + Taxes)
                      </span>
                      <strong className="font-mono text-xs">
                        ₹{gstBreakdown.targetAmount.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                ) : (
                  /* When GST is Disabled: Non-Tax Banner, NO CGST / SGST Bifurcation */
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="font-medium">
                      Non-Tax Bill: Flat <strong>₹{gstBreakdown.targetAmount.toLocaleString('en-IN')}</strong> received without GST.
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                      No GST Bifurcation on Bill
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* If Amount Added is Not Complete: Show Remaining Balance Due & Due Date Picker */}
            {calculatedBalanceDue > 0 ? (
              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Balance Due Display */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Remaining Balance Due (Pending)
                    </label>
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 flex items-center justify-between shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-600">Balance Pending:</span>
                      <span className="text-sm font-black font-mono text-rose-600">
                        ₹{calculatedBalanceDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Date Option for Remaining Payment */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1 flex items-center justify-between">
                      <span>Promised Due Date *</span>
                      <span className="text-[10px] font-normal text-amber-800">When remaining will be paid</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={balanceDueDate}
                        min={getTodayDateStr()}
                        onChange={(e) => setBalanceDueDate(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Settlement Summary */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200/80 font-medium">
                  <span className="text-slate-600">
                    Total Bill: <strong className="text-slate-900 font-mono">₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    Paid Now: <strong className="font-mono">₹{effectivePaidAmount.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="text-rose-700 font-bold">
                    Balance Due: <strong className="font-mono">₹{calculatedBalanceDue.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {totalCalculatedAmount > 0 ? (
                      <>Full payment of <strong>₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong> entered. <strong>No balance remaining.</strong></>
                    ) : (
                      <>Payment settled. <strong>No balance remaining.</strong></>
                    )}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-300">
                  No Balance Remaining
                </span>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: INTEGRATED DIGITAL CONSENT FORM & LIABILITY WAIVER (Fully Readable & Transparent) */}
        {isUpgradeMode || isEditMode ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">
                {isEditMode ? 'Digital Health Declaration & Liability Waiver Active On File' : 'Health Declaration & Liability Waiver Active On File'}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {isEditMode
                  ? 'Member digital consent was verified and signed upon initial registration. No re-signing required for profile updates.'
                  : 'Member digital consent is verified and signed on record. Top-up invoices are billed directly without re-signing.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    6. {consentConfig?.title || 'Gym Rules & Liability Waiver Consent Form'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {consentConfig?.subtitle || 'Review terms & physical activity declaration below before signing.'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
                {consentConfig?.badgeText || 'Compliance Document'}
              </span>
            </div>

            {/* FULLY READABLE LEGAL WAIVER DOCUMENT (OWNER CONFIGURED CLAUSES) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200 text-[11px]">
                <span className="font-bold text-slate-800">
                  Participant: <span className="text-emerald-700">{formData.name || 'Member (Athlete)'}</span>
                </span>
                <span className="text-slate-500">
                  Facility: <strong className="text-slate-700">{gymInfo?.name || 'PulseFit Athletic Club'}</strong> &bull; Date: {formData.joinDate || getTodayDateStr()}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                {(consentConfig?.clauses && consentConfig.clauses.length > 0 ? consentConfig.clauses : [
                  {
                    id: 1,
                    title: 'Physical Fitness & Medical Health Affirmation',
                    text: 'I declare that I am in good physical health and medically sound to engage in strenuous physical exercise, cardiovascular workouts, weight training, athletic classes, and recovery therapies.'
                  }
                ]).map((clause, idx) => (
                  <div key={clause.id || idx} className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0 text-xs">{idx + 1}.</span>
                    <p>
                      <strong className="text-slate-900">{clause.title}:</strong> {clause.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* MANDATORY CONSENT CHECKBOX */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                required
                checked={consentAgreed}
                onChange={(e) => setConsentAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <div className="text-xs text-slate-800 leading-snug">
                <span className="font-bold block text-emerald-950">
                  {consentConfig?.declarationText || 'I have read, understood, and accept all terms of the Health Declaration, Liability Waiver & Gym Rules.'}
                </span>
                <span className="text-[11px] text-slate-600">
                  {consentConfig?.declarationSubtext || 'By checking this box, the athlete confirms full agreement and understanding of the above clauses.'}
                </span>
              </div>
            </label>

            {/* SIGNATURE / VERIFICATION OPTIONS: PHYSICAL FORM SIGNED OR EMAIL OTP */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              {consentConfig?.allowPhysicalSign !== false && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={signedInPerson}
                      onChange={(e) => setSignedInPerson(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Front Desk / Physical Paper Consent Signed (Instant Registration)</span>
                  </label>
                  {signedInPerson && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Physical Form Verified
                    </span>
                  )}
                </div>
              )}

              {(!signedInPerson && consentConfig?.allowEmailOtp !== false) && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MailCheck className="w-4 h-4 text-emerald-600" />
                      <span>Sign Consent Form via Email OTP</span>
                    </span>
                    {otpVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5" /> Digitally Signed
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-semibold">
                        Signature Required
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    An OTP sent to <strong className="text-slate-700">{formData.email || 'the member email'}</strong> acts as the legally binding digital signature on this consent form.
                  </p>

                  {!otpVerified ? (
                    <div className="space-y-2">
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !formData.email}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {isSendingOtp ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending OTP to {formData.email}...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Signature OTP to Email</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter 6-digit OTP"
                              value={otpValue}
                              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                              className="w-36 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center font-mono text-sm tracking-widest font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={isVerifyingOtp || !otpValue}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
                            >
                              {isVerifyingOtp ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                              )}
                              <span>Verify & Sign</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              className="text-xs text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer underline"
                            >
                              Resend Code
                            </button>
                          </div>

                          {/* Simulation Helper Box */}
                          {generatedOtp && (
                            <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
                              <span>Simulated Email Delivery: Verification code is <strong>{generatedOtp}</strong></span>
                              <button
                                type="button"
                                onClick={() => setOtpValue(generatedOtp)}
                                className="font-bold underline hover:text-emerald-950 ml-2"
                              >
                                Auto-Fill
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Consent signed & verified via OTP sent to <strong>{formData.email}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpVerified(false);
                          setOtpSent(false);
                          setOtpValue('');
                        }}
                        className="text-[11px] text-emerald-700 hover:underline font-semibold"
                      >
                        Re-verify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 7: Submission Action Bar */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToMemberList}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel & Return
          </button>

          <button
            type="submit"
            disabled={
              isCreatingMember ||
              (isEditMode
                ? !formData.name?.trim()
                : isUpgradeMode
                  ? totalCalculatedAmount <= 0
                  : (!consentAgreed || (!otpVerified && !signedInPerson)))
            }
            className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
              isEditMode
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : isUpgradeMode
                  ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isCreatingMember ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEditMode ? 'Saving Changes...' : isUpgradeMode ? 'Applying Upgrade...' : 'Registering Athlete...'}</span>
              </>
            ) : (
              <>
                {isEditMode ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Update Member Details</span>
                  </>
                ) : isUpgradeMode ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Confirm Top-up Upgrade</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register Member & Add to Directory</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Shared Reusable Membership Plan Modal (Nested-Safe Dialog for creating new plans) */}
      <MembershipPlanModal
        isOpen={Boolean(quickAddPlanType)}
        onClose={() => {
          setQuickAddPlanType(null);
          setActiveQuickAddRowId(null);
        }}
        defaultPackageType={normalizePackageType(quickAddPlanType)}
        isNested={true}
        onSuccess={(created) => {
          if (created?.id) {
            setFormData((prev) => ({ ...prev, planId: created.id }));
            const calculatedEnd = computePlanEndDate(membershipStartDate || getTodayDateStr(), created);
            if (calculatedEnd) setMembershipEndDate(calculatedEnd);
            setSelectedPackages((prev) => {
              let replaced = false;
              const createdType = normalizePackageType(created.package_type || created.packageType || quickAddPlanType);
              const targetId = activeQuickAddRowId;
              const updated = prev.map((r) => {
                if (targetId ? r.id === targetId : (!replaced && (r.packageType === createdType || !r.packageId))) {
                  replaced = true;
                  return { ...r, packageType: createdType, packageId: String(created.id), price: Number(created.price) || 0 };
                }
                return r;
              });
              if (!replaced && !targetId) {
                updated.push({
                  id: `pkg-${Date.now()}`,
                  packageType: createdType,
                  packageId: String(created.id),
                  price: Number(created.price) || 0,
                  discount: ''
                });
              }
              return updated;
            });
            addToast(`Plan "${created.name}" created and applied to this member!`, 'success');
          }
          setQuickAddPlanType(null);
          setActiveQuickAddRowId(null);
        }}
      />
    </div>
  );
};
