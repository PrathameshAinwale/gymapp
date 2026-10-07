import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';
import { MembershipPlanModal } from '../common/MembershipPlanModal';
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
  Trash2
} from 'lucide-react';

export const AddMemberModal = ({
  isOpen,
  onClose,
  initialData = null,
  isUpgrade = false,
  upgradeMember = null
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

  const isUpgradeMode = Boolean(isUpgrade || upgradeMember || initialData?.isUpgrade);
  const targetMember = upgradeMember || (isUpgrade ? initialData : null);

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
    password: 'member' + Math.floor(100 + Math.random() * 900),
    avatar: '',
    joinDate: getTodayDateStr(),
    dob: '',
    age: '',
    gender: 'Male',
    planId: '',
    trainerId: '', // trainer id
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
  const [isManualEndDate, setIsManualEndDate] = useState(false);

  // Payment Breakdown States (Cash, UPI, Account Transfer)
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [accountTransferAmount, setAccountTransferAmount] = useState('');
  const [balanceDueDate, setBalanceDueDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  const [trainingType, setTrainingType] = useState('self'); // 'self', 'general', 'pt'
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [ptCustomSessions, setPtCustomSessions] = useState(12);
  const [selectedPtPlanId, setSelectedPtPlanId] = useState('');
  const [ptPackageFee, setPtPackageFee] = useState(3000);
  const [recoveryPlanId, setRecoveryPlanId] = useState('');
  const [commissionType, setCommissionType] = useState('percent'); // 'percent' | 'fixed'
  const [ptCommissionPercent, setPtCommissionPercent] = useState(20);
  const [ptFixedCommission, setPtFixedCommission] = useState(1000);

  // Unified Multi-Package Selection State
  const [selectedPackages, setSelectedPackages] = useState([
    {
      id: 'pkg-1',
      packageType: 'membership',
      packageId: '',
      price: 0,
      discount: ''
    }
  ]);

  const getPackageObject = (type, id) => {
    if (!id) return null;
    if (type === 'membership') return (plans || []).find((p) => String(p.id) === String(id));
    if (type === 'pt') return (ptPlans || []).find((p) => String(p.id) === String(id));
    if (type === 'recovery') return (recoveryPlans || []).find((r) => String(r.id) === String(id));
    return null;
  };

  const handlePackageTypeChange = (rowId, newType) => {
    if (newType === 'pt' && trainers && trainers.length > 0) {
      setSelectedTrainerId((prev) => prev || trainers[0].id);
      setFormData((prev) => ({ ...prev, trainerId: prev.trainerId || trainers[0].id }));
    }
    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let newPackageId = '';
        let newPrice = 0;
        if (newType === 'membership' && plans && plans.length > 0) {
          newPackageId = String(plans[0].id);
          newPrice = Number(plans[0].price) || 0;
          if (!isManualEndDate && membershipStartDate) {
            const calculated = computePlanEndDate(membershipStartDate, plans[0]);
            if (calculated) setMembershipEndDate(calculated);
          }
        } else if (newType === 'pt' && ptPlans && ptPlans.length > 0) {
          newPackageId = String(ptPlans[0].id);
          newPrice = Number(ptPlans[0].price) || 0;
        } else if (newType === 'recovery' && recoveryPlans && recoveryPlans.length > 0) {
          newPackageId = String(recoveryPlans[0].id);
          newPrice = Number(recoveryPlans[0].price) || 0;
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
      handleOpenQuickAdd(row?.packageType || 'membership');
      return;
    }
    setSelectedPackages((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let price = 0;
        if (row.packageType === 'membership') {
          const found = (plans || []).find((p) => String(p.id) === String(newPackageId));
          price = Number(found?.price) || 0;
          if (found && !isManualEndDate && membershipStartDate) {
            const calculated = computePlanEndDate(membershipStartDate, found);
            if (calculated) setMembershipEndDate(calculated);
          }
        } else if (row.packageType === 'pt') {
          const found = (ptPlans || []).find((p) => String(p.id) === String(newPackageId));
          price = Number(found?.price) || 0;
          if (trainers && trainers.length > 0 && !selectedTrainerId) {
            setSelectedTrainerId(trainers[0].id);
            setFormData((prevData) => ({ ...prevData, trainerId: trainers[0].id }));
          }
        } else if (row.packageType === 'recovery') {
          const found = (recoveryPlans || []).find((r) => String(r.id) === String(newPackageId));
          price = Number(found?.price) || 0;
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
    let nextType = 'pt';
    if (!typesUsed.includes('membership')) nextType = 'membership';
    else if (!typesUsed.includes('pt')) nextType = 'pt';
    else if (!typesUsed.includes('recovery')) nextType = 'recovery';
    else nextType = 'pt';

    let initialPkgId = '';
    let initialPrice = 0;
    if (nextType === 'pt' && ptPlans && ptPlans.length > 0) {
      initialPkgId = String(ptPlans[0].id);
      initialPrice = Number(ptPlans[0].price) || 0;
    } else if (nextType === 'recovery' && recoveryPlans && recoveryPlans.length > 0) {
      initialPkgId = String(recoveryPlans[0].id);
      initialPrice = Number(recoveryPlans[0].price) || 0;
    } else if (nextType === 'membership' && plans && plans.length > 0) {
      initialPkgId = String(plans[0].id);
      initialPrice = Number(plans[0].price) || 0;
    }

    setSelectedPackages((prev) => [
      ...prev,
      {
        id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        packageType: nextType,
        packageId: initialPkgId,
        price: initialPrice,
        discount: ''
      }
    ]);
  };

  const handleRemovePackageRow = (rowId) => {
    if (selectedPackages.length <= 1) {
      setSelectedPackages([
        {
          id: `pkg-${Date.now()}`,
          packageType: 'membership',
          packageId: '',
          price: 0,
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
        if (first && first.packageType === 'membership' && !first.packageId) {
          return prev.map((row, idx) =>
            idx === 0
              ? { ...row, packageId: String(plans[0].id), price: Number(plans[0].price) || 0 }
              : row
          );
        }
        return prev;
      });
    }
  }, [plans]);

  const [consentConfig, setConsentConfig] = useState(() => getGymConsentForm(gymInfo?.id));

  useEffect(() => {
    setConsentConfig(getGymConsentForm(gymInfo?.id));
  }, [gymInfo?.id]);

  useEffect(() => {
    const handleUpdate = () => {
      setConsentConfig(getGymConsentForm(gymInfo?.id));
    };
    window.addEventListener('consent_settings_updated', handleUpdate);
    return () => window.removeEventListener('consent_settings_updated', handleUpdate);
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
    if (isUpgradeMode || !formData.phone) return null;
    const cleanInput = String(formData.phone).replace(/\D/g, '');
    const last10 = cleanInput.length >= 10 ? cleanInput.slice(-10) : cleanInput;
    if (last10.length < 7) return null;

    return (members || []).find((m) => {
      if (!m.phone) return false;
      const cleanMPhone = String(m.phone).replace(/\D/g, '');
      const mPhoneLast10 = cleanMPhone.length >= 10 ? cleanMPhone.slice(-10) : cleanMPhone;
      return mPhoneLast10 === last10 || cleanMPhone === cleanInput || m.phone === formData.phone;
    }) || null;
  }, [formData.phone, isUpgradeMode, members]);

  // Quick Add Plan State
  const [quickAddPlanType, setQuickAddPlanType] = useState(null); // 'membership' | 'recovery' | 'pt' | null
  const [isSavingQuickPlan, setIsSavingQuickPlan] = useState(false);
  const [quickPlanForm, setQuickPlanForm] = useState({
    name: '',
    price: 1999,
    period: 'Monthly (1 Month)',
    durationMonths: 1,
    maxDiscount: 0,
    offer: '',
    offerDays: 0,
    featuresText: 'Full gym floor access & strength zone\nPersonal fitness orientation session\nLocker, steam room & shower access\nArchFit mobile app tracking',
    popular: false,
    category: 'General Membership',
    sessions: 12,
    validityDays: 30,
    duration: '30 Mins',
    instructorOrType: 'Therapy',
    description: 'Standard access and sessions included.'
  });

  const handleOpenQuickAdd = (type) => {
    if (type === 'membership') {
      setQuickPlanForm({
        name: '',
        price: 1999,
        period: 'Monthly (1 Month)',
        durationMonths: 1,
        maxDiscount: 0,
        offer: '',
        offerDays: 0,
        featuresText: 'Full gym floor access & strength zone\nPersonal fitness orientation session\nLocker, steam room & shower access\nArchFit mobile app tracking',
        popular: false,
        category: 'General Membership',
        sessions: 1,
        validityDays: 30,
        duration: '30 Days',
        instructorOrType: 'General Access',
        description: 'Full gym access, locker & shower access.'
      });
    } else if (type === 'recovery') {
      setQuickPlanForm({
        name: '',
        price: 799,
        period: 'Per Session',
        durationMonths: 1,
        category: 'Recovery',
        sessions: 1,
        validityDays: 30,
        duration: '30 Mins',
        instructorOrType: 'Ice Plunge',
        description: 'Cold plunge hydrotherapy & deep muscle recovery.'
      });
    } else if (type === 'pt') {
      setQuickPlanForm({
        name: '',
        price: 3000,
        period: '30 Days',
        durationMonths: 1,
        category: 'Personal Training',
        sessions: 12,
        validityDays: 30,
        duration: '45 Mins/Session',
        instructorOrType: 'Master Coach',
        description: '1-on-1 personalized training and nutrition guidance.'
      });
    }
    setQuickAddPlanType(type);
  };

  const handleSaveQuickPlan = async (e) => {
    e.preventDefault();
    if (!quickPlanForm.name.trim()) {
      addToast('Please enter a plan name.', 'error');
      return;
    }
    if (!quickPlanForm.price || Number(quickPlanForm.price) <= 0) {
      addToast('Please enter a valid plan price.', 'error');
      return;
    }

    setIsSavingQuickPlan(true);
    try {
      if (quickAddPlanType === 'membership') {
        const feats = quickPlanForm.featuresText
          ? quickPlanForm.featuresText.split('\n').map((f) => f.trim()).filter(Boolean)
          : ['Access to gym floor & cardio machines', 'Locker, steam room & shower access', 'ArchFit mobile app tracking'];

        const created = await addPlan({
          name: quickPlanForm.name.trim(),
          price: Number(quickPlanForm.price),
          max_discount: Number(quickPlanForm.maxDiscount) || 0,
          maxDiscount: Number(quickPlanForm.maxDiscount) || 0,
          offer: quickPlanForm.offer?.trim() || null,
          offer_days: Number(quickPlanForm.offerDays) || 0,
          offerDays: Number(quickPlanForm.offerDays) || 0,
          period: quickPlanForm.period || 'Monthly (1 Month)',
          durationMonths: Number(quickPlanForm.durationMonths) || 1,
          popular: Boolean(quickPlanForm.popular),
          features: feats
        });

        if (created?.id) {
          setFormData((prev) => ({ ...prev, planId: created.id }));
          const calculatedEnd = computePlanEndDate(membershipStartDate || getTodayDateStr(), created);
          if (calculatedEnd) {
            setMembershipEndDate(calculatedEnd);
          }
          setSelectedPackages((prev) => {
            let replaced = false;
            const updated = prev.map((r) => {
              if (!replaced && r.packageType === 'membership') {
                replaced = true;
                return { ...r, packageId: String(created.id), price: Number(created.price) || 0 };
              }
              return r;
            });
            if (!replaced) {
              updated.push({
                id: `pkg-${Date.now()}`,
                packageType: 'membership',
                packageId: String(created.id),
                price: Number(created.price) || 0,
                discount: ''
              });
            }
            return updated;
          });
        }
        addToast(`Membership plan "${quickPlanForm.name}" created and applied!`, 'success');
      } else if (quickAddPlanType === 'recovery') {
        const created = await addRecoveryPlan({
          name: quickPlanForm.name.trim(),
          duration: quickPlanForm.duration || '30 Mins',
          sessions: Number(quickPlanForm.sessions) || 1,
          price: Number(quickPlanForm.price),
          type: quickPlanForm.instructorOrType || 'Ice Plunge',
          description: quickPlanForm.description || 'Therapy & Recovery Session'
        });
        if (created?.id) {
          setRecoveryPlanId(created.id);
          setSelectedPackages((prev) => {
            let replaced = false;
            const updated = prev.map((r) => {
              if (!replaced && r.packageType === 'recovery') {
                replaced = true;
                return { ...r, packageId: String(created.id), price: Number(created.price) || 0 };
              }
              return r;
            });
            if (!replaced) {
              updated.push({
                id: `pkg-${Date.now()}`,
                packageType: 'recovery',
                packageId: String(created.id),
                price: Number(created.price) || 0,
                discount: ''
              });
            }
            return updated;
          });
        }
        addToast(`Recovery plan "${quickPlanForm.name}" created and selected!`, 'success');
      } else if (quickAddPlanType === 'pt') {
        const created = await addPTPlan({
          name: quickPlanForm.name.trim(),
          sessions: Number(quickPlanForm.sessions) || 12,
          validityDays: Number(quickPlanForm.validityDays) || 30,
          price: Number(quickPlanForm.price),
          trainerLevel: quickPlanForm.instructorOrType || 'Master Coach',
          description: quickPlanForm.description || '1-on-1 PT coaching'
        });
        if (created?.id) {
          setSelectedPtPlanId(String(created.id));
          setSelectedPackages((prev) => {
            let replaced = false;
            const updated = prev.map((r) => {
              if (!replaced && r.packageType === 'pt') {
                replaced = true;
                return { ...r, packageId: String(created.id), price: Number(created.price) || 0 };
              }
              return r;
            });
            if (!replaced) {
              updated.push({
                id: `pkg-${Date.now()}`,
                packageType: 'pt',
                packageId: String(created.id),
                price: Number(created.price) || 0,
                discount: ''
              });
            }
            return updated;
          });
        }
        setPtCustomSessions(Number(quickPlanForm.sessions) || 12);
        setPtPackageFee(Number(quickPlanForm.price) || 3000);
        addToast(`PT package "${quickPlanForm.name}" created and applied!`, 'success');
      }
      setQuickAddPlanType(null);
    } catch (err) {
      console.error('Error saving quick plan:', err);
      addToast(`Failed to save plan: ${err.message}`, 'error');
    } finally {
      setIsSavingQuickPlan(false);
    }
  };

  // Sync initialData or default plan when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!plans || plans.length === 0) fetchPlans?.();
      if (!trainers || trainers.length === 0) fetchTrainers?.();
      fetchRecoveryPlans?.();
      fetchPtPlans?.();

      if (isUpgradeMode && targetMember) {
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

        // Default training type to PT for upgrade
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

        setSelectedPackages([
          {
            id: 'pkg-1',
            packageType: 'membership',
            packageId: initPlanId,
            price: Number(matchedPlan?.price) || 0,
            discount: ''
          }
        ]);
      } else {
        const defPlanId = plans[0]?.id ? String(plans[0].id) : '';
        const defPlan = plans[0];

        setFormData((prev) => ({
          ...prev,
          planId: prev.planId || defPlanId,
          executive: prev.executive || defaultStaffExecutive
        }));

        setSelectedPackages([
          {
            id: 'pkg-1',
            packageType: 'membership',
            packageId: defPlanId,
            price: Number(defPlan?.price) || 0,
            discount: ''
          }
        ]);
      }
    }
  }, [isOpen, plans, initialData, isUpgradeMode, targetMember, defaultStaffExecutive, fetchRecoveryPlans, fetchPtPlans, fetchPlans, fetchTrainers]);

  // Keep PT plan selected if PT is chosen
  useEffect(() => {
    if (trainingType === 'pt' && !selectedPtPlanId && ptPlans && ptPlans.length > 0) {
      const defaultPt = ptPlans[0];
      setSelectedPtPlanId(String(defaultPt.id));
      setPtCustomSessions(Number(defaultPt.sessions) || 12);
      setPtPackageFee(Number(defaultPt.price) || 0);
    }
  }, [trainingType, selectedPtPlanId, ptPlans]);

  // Coach & PT Logic
  const isCoachSelected = Boolean(formData.trainerId && formData.trainerId !== 'general');
  const chosenTrainer = isCoachSelected ? trainers.find((t) => t.id === formData.trainerId) : null;

  // Live Price & Package Calculations based on selected packages
  const selectedMembershipRow = selectedPackages.find(
    (r) => r.packageType === 'membership' && r.packageId
  );
  const chosenPlan = selectedMembershipRow
    ? ((plans || []).find((p) => String(p.id) === String(selectedMembershipRow.packageId)) || null)
    : ((plans || []).find((p) => String(p.id) === String(formData.planId)) || null);

  const selectedPtRow = selectedPackages.find(
    (r) => r.packageType === 'pt' && r.packageId
  );
  const chosenPtPlan = selectedPtRow
    ? ((ptPlans || []).find((p) => String(p.id) === String(selectedPtRow.packageId)) || null)
    : ((ptPlans || []).find((p) => String(p.id) === String(selectedPtPlanId)) || null);

  const selectedRecoveryRow = selectedPackages.find(
    (r) => r.packageType === 'recovery' && r.packageId
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

  const totalCalculatedAmount = Math.max(0, totalGrossPackages - totalDiscountAmount);

  const basePrice = selectedPackages
    .filter((r) => r.packageType === 'membership')
    .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const ptPrice = selectedPackages
    .filter((r) => r.packageType === 'pt')
    .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const recoveryPrice = selectedPackages
    .filter((r) => r.packageType === 'recovery')
    .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const numDiscount = totalDiscountAmount;

  const numCash = Math.max(0, Number(cashAmount) || 0);
  const numUpi = Math.max(0, Number(upiAmount) || 0);
  const numAccountTransfer = Math.max(0, Number(accountTransferAmount) || 0);
  const effectivePaidAmount = numCash + numUpi + numAccountTransfer;
  const calculatedBalanceDue = Math.max(0, totalCalculatedAmount - effectivePaidAmount);

  const getResolvedPaymentMethod = () => {
    const parts = [];
    if (numCash > 0) parts.push(`Cash: ₹${numCash.toLocaleString('en-IN')}`);
    if (numUpi > 0) parts.push(`UPI: ₹${numUpi.toLocaleString('en-IN')}`);
    if (numAccountTransfer > 0) parts.push(`Account Transfer: ₹${numAccountTransfer.toLocaleString('en-IN')}`);
    if (parts.length === 0) return 'Pending Payment';
    if (parts.length === 1) {
      if (numCash > 0) return 'Cash';
      if (numUpi > 0) return 'UPI';
      if (numAccountTransfer > 0) return 'Account Transfer';
    }
    return `Split (${parts.join(', ')})`;
  };

  const effectivePtPrice = ptPrice > 0 ? ptPrice : (Number(chosenPtPlan?.price) || 0);
  const ptCommissionAmount = (trainingType === 'pt' || hasPtPackage) && (chosenTrainer || selectedTrainerId)
    ? (commissionType === 'percent'
      ? Math.round((effectivePtPrice * (Number(ptCommissionPercent) || 0)) / 100)
      : (Number(ptFixedCommission) || 0))
    : 0;

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const addMonthsPreservingDay = (baseDate, monthsToAdd) => {
    const target = new Date(baseDate.getTime());
    const originalDay = target.getDate();
    target.setDate(1);
    target.setMonth(target.getMonth() + monthsToAdd);
    const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(originalDay, daysInTargetMonth));
    return target;
  };

  // Helper to calculate Membership End Date including plan duration and bonus offer days
  const computePlanEndDate = (startDateStr, plan, currentExpiryStr = null) => {
    if (!plan) return '';
    const todayStr = getTodayDateStr ? getTodayDateStr() : new Date().toISOString().split('T')[0];
    let baseDateStr = startDateStr || todayStr;

    if (currentExpiryStr) {
      const cleanCurrent = String(currentExpiryStr).split('T')[0];
      if (cleanCurrent >= todayStr) {
        baseDateStr = cleanCurrent;
      }
    }

    const durationMonths = Number(plan.durationMonths || plan.duration_months) || 1;
    const periodStr = plan.period || '';
    const bonusDays = Number(plan.offerDays || plan.offer_days) || 0;

    return calculatePlanExpiryDate(baseDateStr, durationMonths, periodStr, bonusDays);
  };

  // Auto-calculate Membership End Date whenever plan or start date changes (if not manually overridden)
  useEffect(() => {
    if (!isManualEndDate && membershipStartDate) {
      const calculated = computePlanEndDate(membershipStartDate, chosenPlan);
      if (calculated) {
        setMembershipEndDate(calculated);
      }
    }
  }, [chosenPlan, membershipStartDate, isManualEndDate]);


  const handleTrainerChange = (newTrainerId) => {
    setFormData((prev) => ({ ...prev, trainerId: newTrainerId }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const generateRandomPassword = () => {
    const pass = 'fit' + Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleSendOtp = () => {
    if (!formData.email || !formData.email.includes('@')) {
      addToast('Please enter a valid member email address above before requesting OTP.', 'error');
      return;
    }
    setIsSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setOtpVerified(false);
    setOtpValue('');
    setTimeout(() => {
      setIsSendingOtp(false);
      addToast(`Consent Signature OTP sent to ${formData.email}: Code is ${code}`, 'info');
    }, 450);
  };

  const handleVerifyOtp = () => {
    if (!otpValue.trim()) {
      addToast('Please enter the 6-digit OTP code sent to the email.', 'error');
      return;
    }
    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      if (otpValue.trim() === generatedOtp) {
        setOtpVerified(true);
        addToast('OTP verified! Consent form digitally signed.', 'success');
      } else {
        addToast('Invalid OTP code. Please check the code and try again.', 'error');
      }
    }, 350);
  };

  const resetFormState = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: 'member' + Math.floor(100 + Math.random() * 900),
      avatar: '',
      joinDate: getTodayDateStr(),
      dob: '',
      age: '',
      gender: 'Male',
      planId: '',
      trainerId: '',
      trainingType: 'self',
      goal: 'Muscle Gain & Strength',
      weight: 70,
      targetWeight: 75,
      height: 175,
      medicalNotes: '',
      emergencyContact: '',
      executive: defaultStaffExecutive,
      kycDocType: 'Aadhaar Card',
      kycDocNumber: '',
      kycStatus: 'Verified'
    });
    setMembershipStartDate(getTodayDateStr());
    setMembershipEndDate('');
    setIsManualEndDate(false);
    setCashAmount('');
    setUpiAmount('');
    setAccountTransferAmount('');
    setBalanceDueDate('');
    setDiscountAmount('');
    setTrainingType('self');
    setSelectedTrainerId('');
    setPtPackageFee(3000);
    setRecoveryPlanId('');
    setIsUpgradingBasePlan(false);
    setCommissionType('percent');
    setPtCommissionPercent(20);
    setPtFixedCommission(1000);
    setConsentAgreed(true);
    setSignedInPerson(true);
    setOtpSent(false);
    setOtpValue('');
    setGeneratedOtp('');
    setOtpVerified(false);
    setSelectedPackages([
      {
        id: 'pkg-1',
        packageType: 'membership',
        packageId: plans[0]?.id ? String(plans[0].id) : '',
        price: Number(plans[0]?.price) || 0,
        discount: ''
      }
    ]);
  };

  const handleModalClose = () => {
    resetFormState();
    onClose();
  };

  const handleDownloadUpgradePdf = () => {
    if (!newlyCreatedCredentials) return;
    try {
      const invData = {
        id: newlyCreatedCredentials.invoiceNumber,
        invoiceNumber: newlyCreatedCredentials.invoiceNumber,
        memberName: newlyCreatedCredentials.name,
        memberEmail: newlyCreatedCredentials.email,
        memberPhone: newlyCreatedCredentials.phone,
        planName: newlyCreatedCredentials.planName,
        amount: newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount,
        totalAmount: newlyCreatedCredentials.totalAmount,
        duesAmount: newlyCreatedCredentials.duesAmount || 0,
        pendingAmount: newlyCreatedCredentials.duesAmount || 0,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: newlyCreatedCredentials.paymentMethod || 'UPI',
        status: (Number(newlyCreatedCredentials.duesAmount || 0) > 0) ? 'Pending' : 'Paid'
      };
      const doc = generateInvoicePdf(invData, gymInfo, targetMember);
      if (doc) {
        downloadPdfBlob(doc.output('blob'), `Invoice-${newlyCreatedCredentials.invoiceNumber}.pdf`, doc);
        addToast('Invoice PDF downloaded!');
      }
    } catch (err) {
      console.warn('PDF download error:', err);
    }
  };

  const handleShareUpgradeWhatsApp = () => {
    if (!newlyCreatedCredentials) return;
    const invData = {
      id: newlyCreatedCredentials.invoiceNumber,
      invoiceNumber: newlyCreatedCredentials.invoiceNumber,
      memberName: newlyCreatedCredentials.name,
      memberEmail: newlyCreatedCredentials.email,
      memberPhone: newlyCreatedCredentials.phone,
      planName: newlyCreatedCredentials.planName,
      amount: newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount,
      totalAmount: newlyCreatedCredentials.totalAmount,
      duesAmount: newlyCreatedCredentials.duesAmount || 0,
      pendingAmount: newlyCreatedCredentials.duesAmount || 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: newlyCreatedCredentials.paymentMethod || 'UPI',
      status: (Number(newlyCreatedCredentials.duesAmount || 0) > 0) ? 'Pending' : 'Paid'
    };
    shareInvoicePdfToMobile({
      invoice: invData,
      member: {
        name: newlyCreatedCredentials.name,
        phone: newlyCreatedCredentials.phone
      },
      gymInfo,
      onToast: (msg, type) => addToast(msg, type)
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    // UPGRADE SUBMISSION BRANCH
    if (isUpgradeMode && targetMember) {
      if (totalCalculatedAmount <= 0 && trainingType !== 'pt' && !recoveryPlanId && !isUpgradingBasePlan) {
        addToast('Please select at least one top-up service (Personal Training, Recovery Plan, or Plan Upgrade).', 'error');
        return;
      }

      if (maxPlanDiscount > 0 && numDiscount > maxPlanDiscount) {
        addToast(`Discount ₹${numDiscount} exceeds the maximum allowed discount of ₹${maxPlanDiscount} for ${chosenPlan?.name || 'this plan'}.`, 'error');
        return;
      }

      if (calculatedBalanceDue > 0 && !balanceDueDate) {
        addToast('Please select the date when the remaining balance due will be paid.', 'error');
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
        } else if (trainingType === 'pt') {
          resolvedTrainer = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];
          resolvedTrainerName = resolvedTrainer ? `${resolvedTrainer.name} (PT Coach)` : 'PT Coach';
          finalTrainerId = resolvedTrainer?.id;
        }

        // Build top-up line items for official invoice
        const additions = [];
        selectedPackages.forEach((pkgRow) => {
          if (pkgRow.packageId) {
            const obj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
            if (obj?.name) {
              additions.push(obj.name);
            }
          }
        });
        const invoiceTitle = additions.join(' + ') || 'Service Top-up Upgrade';

        const mainCategory = hasPtPackage || trainingType === 'pt'
          ? 'Personal Training'
          : (chosenRecoveryPlan ? 'Recovery & Wellness' : 'Membership Fee');

        // 1. Record Revenue Inflow and generate separate invoice in backend
        const rawMemberId = targetMember.numericId || targetMember.id;
        const cleanUserId = typeof rawMemberId === 'string'
          ? parseInt(rawMemberId.replace(/\D/g, ''), 10)
          : Number(rawMemberId);

        let createdInvoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
          const inflowRes = await api.revenueBilling.addInflow({
            user_id: cleanUserId || 1,
            memberId: targetMember.id,
            member_name: targetMember.name,
            plan_name: invoiceTitle,
            title: `${targetMember.name} - ${invoiceTitle}`,
            category: mainCategory,
            amount: effectivePaidAmount,
            total_amount: totalCalculatedAmount,
            dues_amount: calculatedBalanceDue,
            due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
            dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
            payment_method: getResolvedPaymentMethod(),
            date: new Date().toISOString().split('T')[0],
            notes: `Top-up upgrade: ${invoiceTitle}${calculatedBalanceDue > 0 ? ` (Pending - Balance Due: ₹${calculatedBalanceDue.toLocaleString('en-IN')})` : ''}`,
            status: calculatedBalanceDue > 0 ? 'Pending' : 'Paid',
            created_by: currentUser?.userId || currentUser?.id,
            created_by_name: formData.executive?.trim() || currentUser?.name || 'Staff'
          });

          if (inflowRes?.data?.invoiceNumber || inflowRes?.data?.id) {
            createdInvoiceNo = inflowRes.data.invoiceNumber || inflowRes.data.id;
          }
        } catch (inflowErr) {
          console.warn('Inflow sync note:', inflowErr.message);
        }

        // 2. Update Member Record in database & state
        const updatedMemberDues = (Number(targetMember.duesAmount || 0) + calculatedBalanceDue);
        const memberUpdates = {
          ...targetMember,
          duesAmount: updatedMemberDues,
          dues_amount: updatedMemberDues,
          due_date: calculatedBalanceDue > 0 ? balanceDueDate : targetMember.dueDate,
          dueDate: calculatedBalanceDue > 0 ? balanceDueDate : targetMember.dueDate,
          trainingType: trainingType,
          trainerId: finalTrainerId || targetMember.trainerId,
          trainerName: resolvedTrainerName !== 'None / Self Guided' ? resolvedTrainerName : targetMember.trainerName,
          ptPlanId: trainingType === 'pt' ? (selectedPtPlanId || 'custom-pt') : targetMember.ptPlanId,
          ptPlanName: trainingType === 'pt' ? (chosenPtPlan?.name || `${ptCustomSessions} Sessions 1-on-1 PT`) : targetMember.ptPlanName,
          ptSessions: trainingType === 'pt'
            ? ((Number(targetMember.ptSessions) || 0) + Number(ptCustomSessions))
            : targetMember.ptSessions,
          recoveryPlanId: chosenRecoveryPlan ? chosenRecoveryPlan.id : targetMember.recoveryPlanId,
          recoveryPlanName: chosenRecoveryPlan ? chosenRecoveryPlan.name : targetMember.recoveryPlanName
        };

        if (isUpgradingBasePlan && chosenPlan) {
          memberUpdates.planId = chosenPlan.id;
          memberUpdates.planName = chosenPlan.name;
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const newCombinedExpiry = computePlanEndDate(todayStr, chosenPlan, targetMember?.expiryDate);
          memberUpdates.expiryDate = newCombinedExpiry;
          memberUpdates.expiry_date = newCombinedExpiry;
          memberUpdates.status = 'Active';
        }

        if (updateMember) {
          await updateMember(targetMember.id, memberUpdates);
        }

        // 3. Log Trainer Commission if applicable
        if (resolvedTrainer && trainingType === 'pt' && ptCommissionAmount > 0 && addCommissionRecord) {
          await addCommissionRecord({
            trainerId: resolvedTrainer.id,
            trainerName: resolvedTrainer.name,
            memberName: targetMember.name,
            planName: chosenPtPlan ? chosenPtPlan.name : `1-on-1 PT (${ptCustomSessions} Sessions)`,
            sessionType: 'Personal Training (PT)',
            serviceType: 'Personal Training (PT)',
            ratePercent: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            commissionPct: commissionType === 'percent' ? Number(ptCommissionPercent) : 0,
            amount: effectivePtPrice,
            packageAmount: effectivePtPrice,
            commissionEarned: ptCommissionAmount,
            date: new Date().toISOString().split('T')[0],
            status: 'Pending'
          });
        }

        // 5. Refresh data stores
        await Promise.allSettled([
          fetchInvoices?.(),
          fetchMembers?.(),
          fetchDashboardStats?.()
        ]);

        addToast(`Upgrade successful! Invoice #${createdInvoiceNo} generated in Member Invoices & Revenue Billing.`, 'success');

        // 6. Show receipt popup
        setNewlyCreatedCredentials({
          isUpgrade: true,
          name: targetMember.name,
          email: targetMember.email,
          phone: targetMember.phone,
          id: targetMember.id,
          invoiceNumber: createdInvoiceNo,
          planName: invoiceTitle,
          packageAmount: basePrice + ptPrice + recoveryPrice,
          grossAmount: basePrice + ptPrice + recoveryPrice,
          discountAmount: numDiscount,
          netAmount: totalCalculatedAmount,
          totalAmount: totalCalculatedAmount,
          paidAmount: effectivePaidAmount,
          duesAmount: calculatedBalanceDue,
          dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
          paymentMethod: getResolvedPaymentMethod(),
          ptName: trainingType === 'pt' ? `${ptCustomSessions} 1-on-1 PT Sessions` : null,
          recoveryName: chosenRecoveryPlan?.name,
          trainerCommission: ptCommissionAmount > 0 ? ptCommissionAmount : null,
          trainerName: resolvedTrainerName
        });

        onClose();
        resetFormState();
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
        return;
      }

      const finalPaymentMethod = getResolvedPaymentMethod();
      const finalStartDate = membershipStartDate || todayStr;
      const finalExpiryDate = membershipEndDate || fallbackExpiry || todayStr;
      const finalJoinDate = formData.joinDate || finalStartDate;

      // Generate invoice title including all selected packages
      const additions = [];
      validPackages.forEach((pkgRow) => {
        const obj = getPackageObject(pkgRow.packageType, pkgRow.packageId);
        if (obj?.name) additions.push(obj.name);
      });
      let invoiceTitle = additions.join(' + ') || chosenPlan?.name || 'Gym Package';

      // 1. Add to Gym CRM state (creates member, single official invoice, and revenue inflow on backend)
      const createdMember = await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        enquiryId: initialData?.enquiryId || formData.enquiryId,
        enquiry_id: initialData?.enquiryId || formData.enquiryId,
        avatar: formData.avatar || null,
        dob: formData.dob || null,
        joinDate: finalJoinDate,
        join_date: finalJoinDate,
        startDate: finalStartDate,
        start_date: finalStartDate,
        expiryDate: finalExpiryDate,
        expiry_date: finalExpiryDate,
        age: formData.age !== '' ? formData.age : (formData.dob ? calculateAgeFromDob(formData.dob) : null),
        gender: formData.gender,
        planId: chosenPlan?.id || null,
        planName: chosenPlan?.name || (hasPtPackage ? 'PT Membership' : 'Gym Membership'),
        amount: effectivePaidAmount,
        paid_amount: effectivePaidAmount,
        paidAmount: effectivePaidAmount,
        total_amount: totalCalculatedAmount,
        totalAmount: totalCalculatedAmount,
        dues_amount: calculatedBalanceDue,
        duesAmount: calculatedBalanceDue,
        due_date: calculatedBalanceDue > 0 ? balanceDueDate : null,
        dueDate: calculatedBalanceDue > 0 ? balanceDueDate : null,
        payment_method: finalPaymentMethod,
        paymentMethod: finalPaymentMethod,
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
        consentSignedDate: today.toISOString().split('T')[0]
      });

      // 1a. If converted from an enquiry lead, remove enquiry from active leads
      const linkedEnquiryId = initialData?.enquiryId || formData.enquiryId;
      if (linkedEnquiryId && deleteEnquiry) {
        deleteEnquiry(linkedEnquiryId);
      }

      // 2. Provision Login Account in Auth Database
      await registerAccount({
        id: createdMember.id,
        name: formData.name,
        email: formData.email || null,
        username: (formData.email ? formData.email.split('@')[0] : formData.phone) || `mem_${createdMember.id}`,
        password: formData.password || 'member123',
        role: 'member',
        planName: chosenPlan?.name,
        qrPassCode: createdMember.qrPassCode
      });

      // 3. Register Signed Consent Form in state
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
        signedDate: today.toISOString().split('T')[0]
      });

      // 4. If PT with dedicated Coach, Log Trainer Commission
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
          date: today.toISOString().split('T')[0],
          status: 'Pending'
        });
      }

      // 6. Open Credentials Receipt for Owner
      setNewlyCreatedCredentials({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || 'member123',
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
        startDate: finalStartDate,
        expiryDate: finalExpiryDate,
        joinDate: finalJoinDate,
        ptName: trainingType === 'pt' ? `${ptCustomSessions} 1-on-1 PT Sessions` : null,
        recoveryName: chosenRecoveryPlan?.name,
        trainerCommission: ptCommissionAmount > 0 ? ptCommissionAmount : null,
        trainerName: resolvedTrainerName
      });

      // Close the registration modal
      onClose();
      resetFormState();
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

    const text = `Welcome to ${gymInfo?.name || 'PulseFit Pro'}!\n\n` +
      `Here are your Member Login Credentials:\n` +
      `• Member ID: ${newlyCreatedCredentials.id}\n` +
      `• Password: ${newlyCreatedCredentials.password}\n` +
      (newlyCreatedCredentials.email ? `• Login Email: ${newlyCreatedCredentials.email}\n` : '') +
      `• Membership Plan: ${newlyCreatedCredentials.planName}\n\n` +
      `Bill Breakdown:\n` +
      `• Package Amount: ₹${gross.toLocaleString('en-IN')}\n` +
      (disc > 0 ? `• Discount Offered: -₹${disc.toLocaleString('en-IN')}\n` : '') +
      `• Net Amount: ₹${net.toLocaleString('en-IN')}\n` +
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

    const text = `*Welcome to ${gymInfo?.name || 'PulseFit Pro'}!*\n\n` +
      `Here are your Member Login Credentials:\n` +
      `• Member ID: *${newlyCreatedCredentials.id}*\n` +
      `• Password: *${newlyCreatedCredentials.password}*\n` +
      (newlyCreatedCredentials.email ? `• Login Email: ${newlyCreatedCredentials.email}\n` : '') +
      `• Membership Plan: ${newlyCreatedCredentials.planName}\n\n` +
      `*Bill Breakdown:*\n` +
      `• Package Amount: ₹${gross.toLocaleString('en-IN')}\n` +
      (disc > 0 ? `• Discount Offered: -₹${disc.toLocaleString('en-IN')}\n` : '') +
      `• Net Amount: ₹${net.toLocaleString('en-IN')}\n` +
      `• Amount Paid: ₹${paid.toLocaleString('en-IN')}\n` +
      (dues > 0 ? `• Balance Due: ₹${dues.toLocaleString('en-IN')}${newlyCreatedCredentials.dueDate ? ` (Due: ${newlyCreatedCredentials.dueDate})` : ''}\n` : `• Payment Status: Paid in Full\n`);

    const url = getWhatsAppUrl(newlyCreatedCredentials.phone, text);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <>
      {/* REGISTER NEW MEMBER MODAL WITH CREDENTIALS PROVISIONING */}
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={isUpgradeMode ? `Upgrade Member Services & Top-ups: ${targetMember?.name || 'Member'}` : "Register Member & Issue Login Account"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* UPGRADE MODE NOTIFICATION BANNER */}
          {isUpgradeMode && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 flex items-center justify-between shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-600 text-white shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-violet-950">
                    Upgrade Mode: {targetMember?.name} ({targetMember?.id})
                  </h4>
                  <p className="text-[11px] text-violet-700">
                    Member profile & login credentials are locked. Select Personal Training, Recovery, or Plan Upgrades below.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-100 text-violet-800 border border-violet-200 uppercase tracking-wider shrink-0">
                Top-up Upgrade
              </span>
            </div>
          )}

          {/* Member Photo Upload */}
          {isUpgradeMode ? (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Member" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Photo (Locked)</span>
                </div>
                <p className="text-[11px] text-slate-500">Member photo preserved for ID & biometric check-in.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 border-2 border-slate-300 shrink-0 flex items-center justify-center group shadow-sm">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Member Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <label className="block text-xs font-bold text-slate-800">
                  Member Profile Photo
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload a photo for attendance, QR turnstile verification, and member profile.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: '' })}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Credentials Box */}
          {isUpgradeMode ? (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Member Portal Login Account: <strong>{formData.email}</strong></span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">Credentials Preserved</span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <KeyRound className="w-4 h-4" />
                  <span>Member Portal Login Credentials</span>
                </div>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Auto-generate Password
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Login Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="member@example.com (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Full Name *</label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="text"
                required
                disabled={isUpgradeMode}
                placeholder="e.g. Liam Hemsworth"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
                  }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Phone Number *</label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="tel"
                required={!isUpgradeMode}
                disabled={isUpgradeMode}
                placeholder="10-digit mobile number"
                maxLength={10}
                inputMode="numeric"
                onKeyDown={preventNonPhoneKey}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl text-xs transition-colors ${duplicatePhoneMember
                    ? 'bg-rose-50 border-2 border-rose-500 text-slate-900 focus:outline-none'
                    : isUpgradeMode
                      ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-medium'
                  }`}
              />
              {duplicatePhoneMember && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  <span>Member already exists with this mobile number
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Invoice Date *
                </label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="date"
                required
                disabled={isUpgradeMode}
                value={formData.joinDate || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, joinDate: val }));
                  if (!isManualEndDate && val) {
                    setMembershipStartDate(val);
                  }
                }}
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-semibold'
                  }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Cake className="w-3.5 h-3.5 text-pink-500" />
                  Date of Birth (DOB)
                </label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="date"
                disabled={isUpgradeMode}
                value={formData.dob || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const autoAge = calculateAgeFromDob(val);
                  setFormData(prev => ({
                    ...prev,
                    dob: val,
                    age: autoAge !== '' ? autoAge : (val ? prev.age : '')
                  }));
                }}
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
                  }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Age</span>
                  {formData.dob && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-md">
                      Auto
                    </span>
                  )}
                </label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                disabled={isUpgradeMode}
                readOnly={Boolean(formData.dob)}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                value={formData.age !== undefined && formData.age !== null ? formData.age : ''}
                onChange={(e) => {
                  const val = sanitizeDigits(e.target.value, 3);
                  setFormData(prev => ({ ...prev, age: val === '' ? '' : Number(val) }));
                }}
                placeholder={formData.dob ? 'Auto from DOB' : 'e.g. 25'}
                className={`w-full px-3.5 py-2 rounded-xl text-xs transition-colors ${isUpgradeMode || formData.dob
                    ? 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold cursor-not-allowed font-mono'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono'
                  }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Gender</label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <select
                disabled={isUpgradeMode}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer'
                  }`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* SECTION: PACKAGE & SERVICES SELECTION (DYNAMIC MULTI-PACKAGE) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 border border-emerald-200/90 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-200/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Package Selection</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddPackageRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Package</span>
              </button>
            </div>

            {/* PACKAGE ROWS */}
            <div className="space-y-2.5">
              {selectedPackages.map((pkgRow, index) => {
                const isMembership = pkgRow.packageType === 'membership';
                const isPt = pkgRow.packageType === 'pt';
                const isRecovery = pkgRow.packageType === 'recovery';

                const availablePlans = isMembership
                  ? plans
                  : isPt
                  ? ptPlans
                  : recoveryPlans;

                const currentPkgObj = getPackageObject(pkgRow.packageType, pkgRow.packageId);

                return (
                  <div
                    key={pkgRow.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        <span>Package #{index + 1}</span>
                        {isMembership && (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Membership
                          </span>
                        )}
                        {isPt && (
                          <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Personal Training
                          </span>
                        )}
                        {isRecovery && (
                          <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            Recovery & Wellness
                          </span>
                        )}
                      </span>
                      {selectedPackages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePackageRow(pkgRow.id)}
                          className="text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                          title="Remove this package"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Row 1: Package Type & Package Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* 1. Package Type */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Package Type *
                        </label>
                        <select
                          value={pkgRow.packageType}
                          onChange={(e) => handlePackageTypeChange(pkgRow.id, e.target.value)}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="membership">Membership Plan</option>
                          <option value="pt">Personal Training (PT)</option>
                          <option value="recovery">Recovery & Wellness</option>
                        </select>
                      </div>

                      {/* 2. Package Name */}
                      <div className="sm:col-span-7">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Package Name *
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAdd(pkgRow.packageType)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>New</span>
                          </button>
                        </div>
                        <select
                          value={pkgRow.packageId}
                          onChange={(e) => handlePackageIdChange(pkgRow.id, e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="">
                            -- Select {isMembership ? 'Membership Plan' : isPt ? 'PT Package' : 'Recovery Plan'} --
                          </option>
                          {availablePlans && availablePlans.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} {isMembership ? `(${item.period || `${item.durationMonths || 1} Mo`})` : isPt ? `(${item.sessions} Sessions)` : `(${item.duration || 'Session'})`}
                            </option>
                          ))}
                          <option value="__ADD_NEW__" className="font-bold text-emerald-600">
                            + Add New {isMembership ? 'Plan' : isPt ? 'PT Plan' : 'Recovery Plan'}...
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Amount & Discount (on the next line) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                      {/* 3. Direct Amount Shown */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Package Price (₹)
                          </label>
                          {Number(pkgRow.price) > 0 && Number(pkgRow.discount) > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 font-mono">
                              Net: ₹{Math.max(0, Number(pkgRow.price || 0) - Number(pkgRow.discount || 0)).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="text"
                            readOnly
                            value={Number(pkgRow.price || 0).toLocaleString('en-IN')}
                            className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black font-mono text-slate-900 cursor-default"
                          />
                        </div>
                      </div>

                      {/* 4. Discount Field beside it on line 2 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Percent className="w-3 h-3 text-emerald-600" />
                            <span>Discount (₹)</span>
                          </label>
                          {currentPkgObj?.maxDiscount > 0 && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded">
                              Max: ₹{currentPkgObj.maxDiscount}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            onKeyDown={(e) => preventNonNumericKey(e, true)}
                            value={pkgRow.discount}
                            onChange={(e) => handlePackageDiscountChange(pkgRow.id, e.target.value)}
                            className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {isMembership && (
                      <div className="pt-2.5 mt-1 border-t border-slate-100 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/80 space-y-2">
                        {currentPkgObj && (
                          <div className="flex items-center justify-end">
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded">
                              Plan Validity: {currentPkgObj.period || `${currentPkgObj.durationMonths || 1} Month(s)`}
                              {Number(currentPkgObj.offerDays || currentPkgObj.offer_days) > 0 && ` (+${currentPkgObj.offerDays || currentPkgObj.offer_days} Days Bonus)`}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              <span>Membership Start Date *</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={membershipStartDate}
                              onChange={(e) => {
                                const newStart = e.target.value;
                                setMembershipStartDate(newStart);
                                setIsManualEndDate(false);
                                if (newStart) {
                                  const calculated = computePlanEndDate(newStart, currentPkgObj || chosenPlan);
                                  if (calculated) setMembershipEndDate(calculated);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-emerald-600" />
                                <span>End Date (Expiry) *</span>
                              </label>
                              {isManualEndDate && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsManualEndDate(false);
                                    const calculated = computePlanEndDate(membershipStartDate, currentPkgObj || chosenPlan);
                                    if (calculated) setMembershipEndDate(calculated);
                                  }}
                                  className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                                >
                                  Reset to Auto
                                </button>
                              )}
                            </div>
                            <input
                              type="date"
                              required
                              value={membershipEndDate}
                              onChange={(e) => {
                                setIsManualEndDate(true);
                                setMembershipEndDate(e.target.value);
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EMBEDDED DEDICATED PT COACH & COMMISSION (SHOWN WHEN PT PACKAGE TYPE AND PACKAGE NAME ARE SELECTED) */}
                    {isPt && pkgRow.packageId && (
                      <div className="pt-2.5 mt-1 border-t border-slate-100 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Dedicated PT Coach Selection *</span>
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {currentPkgObj?.sessions || ptCustomSessions} Sessions PT Included
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                          {/* 1. Trainer Selection Field */}
                          <div className="sm:col-span-7">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Assigned Personal Trainer *
                            </label>
                            <select
                              value={selectedTrainerId}
                              onChange={(e) => {
                                setSelectedTrainerId(e.target.value);
                                setFormData((prev) => ({ ...prev, trainerId: e.target.value }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
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

                          {/* 2. Trainer Commission */}
                          <div className="sm:col-span-5 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                <Percent className="w-3 h-3 text-indigo-600" />
                                <span>Coach Payout</span>
                              </span>
                              <span className="font-mono font-bold text-indigo-700 text-xs">
                                Earns: ₹{ptCommissionAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setCommissionType('percent')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${commissionType === 'percent' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                                >
                                  % Rate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCommissionType('fixed')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${commissionType === 'fixed' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                                >
                                  ₹ Flat
                                </button>
                              </div>
                              {commissionType === 'percent' ? (
                                <div className="relative flex-1 min-w-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={ptCommissionPercent}
                                    onChange={(e) => setPtCommissionPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 pr-5 text-center"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                                </div>
                              ) : (
                                <div className="relative flex-1 min-w-0">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={ptFixedCommission}
                                    onChange={(e) => setPtFixedCommission(Math.max(0, Number(e.target.value)))}
                                    className="w-full pl-5 pr-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                                  />
                                </div>
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

            {/* Inline Add Button */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleAddPackageRow}
                className="w-full py-2 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/60 rounded-xl text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Package (e.g. PT, Recovery)</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC PRICING SUMMARY CARD */}
          <div className="mt-2 p-3.5 rounded-2xl bg-white border border-emerald-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total Price & Breakdown</span>
              </div>
              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Total Packages: <strong className="text-slate-700 font-mono">₹{totalGrossPackages.toLocaleString('en-IN')}</strong></span>
                {totalDiscountAmount > 0 && (
                  <span className="text-amber-700">Total Discount: <strong className="font-mono">-₹{totalDiscountAmount.toLocaleString('en-IN')}</strong></span>
                )}
              </div>
            </div>

            <div className="text-right sm:self-center shrink-0 bg-emerald-50/80 px-3.5 py-1.5 rounded-xl border border-emerald-200">
              <div className="text-[9px] uppercase font-bold text-emerald-800">Total Payable Price</div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                ₹{totalCalculatedAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* PAYMENT BREAKDOWN & SETTLEMENT */}
          <div className="mt-2 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Payment Method & Amounts Received
                </span>
              </div>
              <div className="text-[10px] font-semibold text-slate-500">
                Total Bill: <strong className="font-mono text-slate-800">₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* 3 Payment Methods: Cash, UPI, Account Transfer */}
            <div className="space-y-2.5">
              {/* 1. Cash */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[160px]">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Cash</span>
                    <span className="text-[10px] text-slate-500 block">Cash at Reception</span>
                  </div>
                </div>
                <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={cashAmount}
                      onChange={(e) => setCashAmount(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-400 transition-all text-right"
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
                    className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Full
                  </button>
                </div>
              </div>

              {/* 2. UPI */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[160px]">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">UPI</span>
                    <span className="text-[10px] text-slate-500 block">GPay, PhonePe, Paytm</span>
                  </div>
                </div>
                <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={upiAmount}
                      onChange={(e) => setUpiAmount(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-400 transition-all text-right"
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
                    className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Full
                  </button>
                </div>
              </div>

              {/* 3. Account Transfer */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[160px]">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Account Transfer</span>
                    <span className="text-[10px] text-slate-500 block">NEFT / IMPS / Netbanking</span>
                  </div>
                </div>
                <div className="relative flex-1 max-w-xs flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      onKeyDown={(e) => preventNonNumericKey(e, true)}
                      value={accountTransferAmount}
                      onChange={(e) => setAccountTransferAmount(sanitizeDecimal(e.target.value))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-400 transition-all text-right"
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
                    className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Full
                  </button>
                </div>
              </div>
            </div>

            {/* If Amount Added is Not Complete: Show Remaining Balance Due & Due Date Picker */}
            {calculatedBalanceDue > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3 animate-fadeIn">
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Full payment of <strong>₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong> received. <strong>₹0</strong> balance due.</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-300">
                  Fully Paid
                </span>
              </div>
            )}
          </div>

          {/* Member Biometrics & Health Notes */}
          {isUpgradeMode ? (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Member Biometrics on file: <strong>{formData.weight || 70}kg</strong> &bull; <strong>{formData.height || 175}cm</strong> &bull; Goal: <strong>{formData.goal || 'General Fitness'}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase">Profile Locked</span>
              </div>

              {/* Handled By for Upgrade */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Invoice Created / Handled By (Staff / Owner)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Audit Record</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Front Desk Alex / Trainer Max"
                  value={formData.executive}
                  onChange={(e) => setFormData({ ...formData, executive: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    placeholder="e.g. 75"
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.targetWeight}
                    placeholder="e.g. 65"
                    onChange={(e) => setFormData({ ...formData, targetWeight: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height}
                    placeholder="e.g. 180"
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fitness Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Fat loss, Marathon training, Hypertrophy"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medical Notes & Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Asthma, Lower back pain history (optional)"
                  value={formData.medicalNotes || ''}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact & Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe (+91 98200 12345)"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Executive / Handled By (Staff)</label>
                  <input
                    type="text"
                    placeholder="e.g. Front Desk Alex / Trainer Max"
                    value={formData.executive}
                    onChange={(e) => setFormData({ ...formData, executive: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* INTEGRATED DIGITAL CONSENT FORM & EMAIL OTP SIGNATURE */}
          {isUpgradeMode ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">Health Declaration & Liability Waiver Active</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Member digital consent is already verified and active on file. Top-up invoices are billed directly without re-verification.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    {consentConfig?.title || 'Integrated Consent Form & Liability Waiver'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {consentConfig?.badgeText || 'Digital Signature'}
                </span>
              </div>

              {/* Legal Waiver Text Box */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed max-h-40 overflow-y-auto space-y-2">
                <p className="font-semibold text-slate-800">
                  {consentConfig?.subtitle || 'Member Health Declaration & Assumption of Risk:'}
                </p>
                {Array.isArray(consentConfig?.clauses) && consentConfig.clauses.length > 0 ? (
                  consentConfig.clauses.map((clause, idx) => (
                    <div key={clause.id || idx} className="text-slate-600">
                      <strong className="text-slate-800">{clause.title}:</strong> {clause.content}
                    </div>
                  ))
                ) : (
                  <div>
                    I certify that I am physically fit and medically sound to participate in gym exercises, weight training, group classes, and recovery sessions. I acknowledge that physical activity involves inherent risk of physical injury. In consideration of my membership, I agree to abide by club safety rules and release the gym facility, management, and trainers from all liability.
                  </div>
                )}
              </div>

              {/* Agreement Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  required
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">
                  {consentConfig?.declarationText || 'I accept the terms of the Health Declaration, Liability Waiver & Gym Rules.'}
                </span>
              </label>

              {/* EMAIL OTP OR IN-PERSON SIGNATURE WORKFLOW */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
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

                {!signedInPerson && (
                  <div className="pt-1">
                    <div className="text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MailCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sign Consent Form via Email OTP</span>
                      </span>
                      {otpVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Digitally Signed
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold">
                          Signature Required
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 mb-2">
                      An OTP sent to <strong className="text-slate-700">{formData.email || 'the member email'}</strong> acts as the legally binding digital signature on this consent form.
                    </p>

                    {!otpVerified ? (
                      <div className="space-y-2">
                        {!otpSent ? (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isSendingOtp || !formData.email}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
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
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
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
                                className="text-[11px] text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer underline"
                              >
                                Resend Code
                              </button>
                            </div>

                            {/* Simulation Helper Box */}
                            {generatedOtp && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
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
                          className="text-[10px] text-emerald-700 hover:underline font-semibold"
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

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isCreatingMember || (isUpgradeMode ? totalCalculatedAmount <= 0 : (!consentAgreed || (!otpVerified && !signedInPerson)))}
              className={`w-full sm:w-auto px-6 py-2.5 sm:py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${isUpgradeMode
                  ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
            >
              {isCreatingMember ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isUpgradeMode ? 'Upgrading Member...' : 'Registering Member...'}</span>
                </>
              ) : (
                <>
                  {isUpgradeMode && <Zap className="w-3.5 h-3.5" />}
                  <span>{isUpgradeMode ? 'Confirm Top-up' : 'Register Member'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MEMBER CREDENTIALS / UPGRADE RECEIPT MODAL */}
      <Modal
        isOpen={!!newlyCreatedCredentials}
        onClose={() => setNewlyCreatedCredentials(null)}
        title={newlyCreatedCredentials?.isUpgrade ? "Member Top-up Applied & Invoice Issued" : "Member Account Created"}
        maxWidth="max-w-md"
      >
        {newlyCreatedCredentials && (
          <div className="space-y-4 text-center">
            {/* Header Icon & Member Info */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs mb-2 ${
                newlyCreatedCredentials.isUpgrade
                  ? 'bg-violet-100 text-violet-700 border-violet-200'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                {newlyCreatedCredentials.isUpgrade ? <Receipt className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <h4 className="font-heading font-extrabold text-lg text-slate-900 leading-tight">
                {newlyCreatedCredentials.name}
              </h4>
              <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <Tag className="w-3 h-3 text-emerald-600" />
                <span>{newlyCreatedCredentials.planName || 'Standard Membership'}</span>
              </div>
            </div>

            {/* MEMBER CREDENTIALS CARD (Only for new registrations) */}
            {!newlyCreatedCredentials.isUpgrade && (
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-left space-y-3 shadow-md border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Member Login Credentials</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Ready to share</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Member ID */}
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Member ID</span>
                      <button
                        type="button"
                        onClick={() => handleCopyField(newlyCreatedCredentials.id, 'id')}
                        className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                        title="Copy ID"
                      >
                        {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-sm text-white tracking-wide truncate">
                      {newlyCreatedCredentials.id}
                    </span>
                  </div>

                  {/* Password */}
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password</span>
                      <button
                        type="button"
                        onClick={() => handleCopyField(newlyCreatedCredentials.password, 'password')}
                        className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-sm text-emerald-400 tracking-wide truncate">
                      {newlyCreatedCredentials.password}
                    </span>
                  </div>
                </div>

                {newlyCreatedCredentials.email && (
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span className="truncate">Login Email: <strong className="text-slate-200">{newlyCreatedCredentials.email}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(newlyCreatedCredentials.email, 'email')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1 font-semibold ml-2 shrink-0 cursor-pointer"
                    >
                      {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BILL BREAKDOWN CARD (Clean, no useless data) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-700">
                  <Receipt className="w-3.5 h-3.5 text-slate-600" />
                  <span>Bill Breakdown</span>
                </div>
                {newlyCreatedCredentials.invoiceNumber && (
                  <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                    Inv #{newlyCreatedCredentials.invoiceNumber}
                  </span>
                )}
              </div>

              {/* 1. Bill Package Amount */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Bill Package Amount:</span>
                <span className="font-mono font-semibold text-slate-900 text-xs">
                  ₹{Number(newlyCreatedCredentials.packageAmount || newlyCreatedCredentials.grossAmount || newlyCreatedCredentials.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* 2. Discount Offered */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Discount Offered:</span>
                {Number(newlyCreatedCredentials.discountAmount || 0) > 0 ? (
                  <span className="font-mono font-bold text-emerald-600 text-xs">
                    -₹{Number(newlyCreatedCredentials.discountAmount).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span className="font-mono text-slate-400 text-xs">₹0</span>
                )}
              </div>

              {/* 3. Net Amount */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                <span className="text-slate-900 font-bold text-xs uppercase tracking-wide">Net Amount:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  ₹{Number(newlyCreatedCredentials.netAmount || newlyCreatedCredentials.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* 4. Amount Received */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Amount Received:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  ₹{Number(newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>

              {/* 5. Balance Due */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                <span className="text-slate-700 font-semibold text-xs">Balance Due:</span>
                {Number(newlyCreatedCredentials.duesAmount || 0) > 0 ? (
                  <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                    ₹{Number(newlyCreatedCredentials.duesAmount).toLocaleString('en-IN')} Due{newlyCreatedCredentials.dueDate ? ` (${newlyCreatedCredentials.dueDate})` : ''}
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                    ₹0 (Paid in Full)
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {newlyCreatedCredentials.isUpgrade ? (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadUpgradePdf}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareUpgradeWhatsApp}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewlyCreatedCredentials(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied All!' : 'Copy Credentials'}</span>
                </button>

                {newlyCreatedCredentials.phone && (
                  <button
                    type="button"
                    onClick={handleShareMemberWhatsApp}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setNewlyCreatedCredentials(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Shared Reusable Membership Plan Modal (Nested-Safe Dialog) */}
      <MembershipPlanModal
        isOpen={quickAddPlanType === 'membership'}
        onClose={() => setQuickAddPlanType(null)}
        isNested={true}
        onSuccess={(created) => {
          if (created?.id) {
            setFormData((prev) => ({ ...prev, planId: created.id }));
            const calculatedEnd = computePlanEndDate(membershipStartDate || getTodayDateStr(), created);
            setMembershipEndDate(calculatedEnd);
            addToast(`Plan "${created.name}" created and applied to this member!`, 'success');
          }
          setQuickAddPlanType(null);
        }}
      />

      {/* Quick Add Service (PT / Recovery) Modal */}
      <Modal
        isOpen={Boolean(quickAddPlanType && quickAddPlanType !== 'membership')}
        onClose={() => setQuickAddPlanType(null)}
        isNested={true}
        title={
          quickAddPlanType === 'recovery'
            ? 'Add Recovery & Wellness Plan'
            : 'Add Personal Training Package'
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveQuickPlan} className="space-y-4 text-left">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Creating this plan will save it to your gym database and automatically select it for this member.
            </span>
          </div>

          <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan / Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    quickAddPlanType === 'recovery'
                      ? 'e.g. Ice Bath Therapy, Sauna Session'
                      : 'e.g. 12 Sessions Personal Training'
                  }
                  value={quickPlanForm.name}
                  onChange={(e) => setQuickPlanForm({ ...quickPlanForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fee / Price (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min={0}
                      required
                      value={quickPlanForm.price}
                      onChange={(e) => setQuickPlanForm({ ...quickPlanForm, price: e.target.value })}
                      className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {quickAddPlanType === 'recovery' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Therapy Category</label>
                    <select
                      value={quickPlanForm.instructorOrType}
                      onChange={(e) => setQuickPlanForm({ ...quickPlanForm, instructorOrType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Ice Plunge">Ice Plunge / Cold Bath</option>
                      <option value="Infrared Sauna">Infrared Sauna</option>
                      <option value="Massage Gun">Percussion Massage Gun</option>
                      <option value="Cryotherapy">Cryotherapy</option>
                      <option value="Physiotherapy">Physiotherapy & Stretch</option>
                    </select>
                  </div>
                )}

                {quickAddPlanType === 'pt' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Included Sessions</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={quickPlanForm.sessions}
                      onChange={(e) => setQuickPlanForm({ ...quickPlanForm, sessions: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuickAddPlanType(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingQuickPlan}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingQuickPlan ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Plan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save & Apply Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
