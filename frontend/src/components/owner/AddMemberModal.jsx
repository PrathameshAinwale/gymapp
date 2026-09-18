import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { generateInvoicePdf, downloadPdfBlob, shareInvoicePdfToMobile } from '../../utils/invoicePdfGenerator';
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
  IndianRupee
} from 'lucide-react';

export const AddMemberModal = ({
  isOpen,
  onClose,
  initialData = null,
  isUpgrade = false,
  upgradeMember = null
}) => {
  const { registerAccount } = useAuth();
  const {
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'member' + Math.floor(100 + Math.random() * 900),
    avatar: '',
    age: 25,
    gender: 'Male',
    planId: plans[0]?.id || '',
    trainerId: '', // trainer id
    trainingType: 'self', // 'self' | 'general' | 'pt'
    ptSessionsCount: 12,
    goal: 'Muscle Gain & Strength',
    weight: 70,
    targetWeight: 75,
    height: 175,
    medicalNotes: 'None',
    emergencyContact: '',
    kycDocType: 'Aadhaar Card',
    kycDocNumber: '',
    kycStatus: 'Verified'
  });

  const [trainingType, setTrainingType] = useState('self'); // 'self', 'general', 'pt'
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [ptCustomSessions, setPtCustomSessions] = useState(12);
  const [selectedPtPlanId, setSelectedPtPlanId] = useState('');
  const [ptPackageFee, setPtPackageFee] = useState(3000);
  const [recoveryPlanId, setRecoveryPlanId] = useState('');
  const [commissionType, setCommissionType] = useState('percent'); // 'percent' | 'fixed'
  const [ptCommissionPercent, setPtCommissionPercent] = useState(20);
  const [ptFixedCommission, setPtFixedCommission] = useState(1000);
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

  // Payment Scope & Settlement States
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [customPaidAmount, setCustomPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Quick Add Plan State
  const [quickAddPlanType, setQuickAddPlanType] = useState(null); // 'membership' | 'recovery' | 'pt' | null
  const [isSavingQuickPlan, setIsSavingQuickPlan] = useState(false);
  const [quickPlanForm, setQuickPlanForm] = useState({
    name: '',
    price: 1999,
    period: 'Monthly (1 Month)',
    durationMonths: 1,
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
        const created = await addPlan({
          name: quickPlanForm.name.trim(),
          price: Number(quickPlanForm.price),
          period: quickPlanForm.period,
          durationMonths: Number(quickPlanForm.durationMonths) || 1,
          popular: false,
          features: [
            'Access to gym floor & cardio machines',
            'Locker, steam room & shower access',
            'PulseFit Mobile App Access'
          ]
        });
        if (created?.id) {
          setFormData((prev) => ({ ...prev, planId: created.id }));
        }
        addToast(`Membership plan "${quickPlanForm.name}" created and selected!`, 'success');
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
          age: targetMember.age || 25,
          gender: targetMember.gender || 'Male',
          planId: targetMember.planId || plans[0]?.id || '',
          trainerId: targetMember.trainerId || '',
          trainingType: targetMember.trainingType || 'pt',
          ptSessionsCount: targetMember.ptSessions ? Number(targetMember.ptSessions) : 12,
          goal: targetMember.goal || 'Muscle Gain & Strength',
          weight: targetMember.weight || 70,
          targetWeight: targetMember.targetWeight || 75,
          height: targetMember.height || 175,
          medicalNotes: targetMember.medicalNotes || 'None',
          emergencyContact: targetMember.emergencyContact || targetMember.phone || '',
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
      } else if (initialData) {
        setFormData((prev) => ({
          ...prev,
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          password: 'fit' + Math.floor(1000 + Math.random() * 9000),
          planId: initialData.planId || plans[0]?.id || '',
          goal: initialData.goal || 'Muscle Gain & Strength',
          medicalNotes: initialData.medicalNotes || 'None',
          emergencyContact: initialData.emergencyContact || initialData.phone || '',
          enquiryId: initialData.enquiryId || null,
          ...initialData
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          planId: prev.planId || plans[0]?.id || ''
        }));
      }
    }
  }, [isOpen, plans, initialData, isUpgradeMode, targetMember, fetchRecoveryPlans, fetchPtPlans, fetchPlans, fetchTrainers]);

  // Keep plan selected if plans list loads after opening
  useEffect(() => {
    if (plans && plans.length > 0 && !formData.planId) {
      setFormData((prev) => ({
        ...prev,
        planId: plans[0].id
      }));
    }
  }, [plans, formData.planId]);

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

  // Live Price Calculations
  const chosenPlan = plans.find((p) => p.id === formData.planId) || plans[0];
  const chosenPtPlan = ptPlans.find((p) => String(p.id) === String(selectedPtPlanId));
  const basePrice = isUpgradeMode
    ? (isUpgradingBasePlan ? (Number(chosenPlan?.price) || 0) : 0)
    : (Number(chosenPlan?.price) || 0);
  const ptPrice = trainingType === 'pt' ? (Number(chosenPtPlan?.price) || Number(ptPackageFee) || 0) : 0;
  const chosenRecoveryPlan = recoveryPlans.find((r) => String(r.id) === String(recoveryPlanId));
  const recoveryPrice = Number(chosenRecoveryPlan?.price) || 0;
  const totalCalculatedAmount = basePrice + ptPrice + recoveryPrice;
  const effectivePaidAmount = isFullPayment
    ? totalCalculatedAmount
    : (customPaidAmount === '' ? 0 : Math.max(0, Number(customPaidAmount)));
  const calculatedBalanceDue = Math.max(0, totalCalculatedAmount - effectivePaidAmount);

  const effectivePtPrice = ptPrice > 0 ? ptPrice : (Number(chosenPtPlan?.price) || 0);
  const ptCommissionAmount = trainingType === 'pt' && (chosenTrainer || selectedTrainerId)
    ? (commissionType === 'percent'
      ? Math.round((effectivePtPrice * (Number(ptCommissionPercent) || 0)) / 100)
      : (Number(ptFixedCommission) || 0))
    : 0;

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
      age: 25,
      gender: 'Male',
      planId: plans[0]?.id || '',
      trainerId: '',
      trainingType: 'self',
      goal: 'Muscle Gain & Strength',
      weight: 70,
      targetWeight: 75,
      height: 175,
      medicalNotes: 'None',
      emergencyContact: '',
      kycDocType: 'Aadhaar Card',
      kycDocNumber: '',
      kycStatus: 'Verified'
    });
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
    setIsFullPayment(true);
    setCustomPaidAmount('');
    setPaymentMethod('UPI');
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
        date: new Date().toISOString().split('T')[0],
        paymentMethod: newlyCreatedCredentials.paymentMethod || paymentMethod || 'UPI',
        status: (Number(newlyCreatedCredentials.duesAmount || 0) > 0) ? 'Partial' : 'Paid'
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
      date: new Date().toISOString().split('T')[0],
      paymentMethod: newlyCreatedCredentials.paymentMethod || paymentMethod || 'UPI',
      status: (Number(newlyCreatedCredentials.duesAmount || 0) > 0) ? 'Partial' : 'Paid'
    };
    shareInvoicePdfToMobile(invData, gymInfo, (msg, type) => addToast(msg, type));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    // UPGRADE SUBMISSION BRANCH
    if (isUpgradeMode && targetMember) {
      if (totalCalculatedAmount <= 0 && trainingType !== 'pt' && !recoveryPlanId && !isUpgradingBasePlan) {
        addToast('Please select at least one top-up service (Personal Training, Recovery Plan, or Plan Upgrade).', 'error');
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
        if (trainingType === 'pt') {
          additions.push(`1-on-1 PT (${ptCustomSessions} Sessions${resolvedTrainer ? ' - Coach ' + resolvedTrainer.name : ''})`);
        }
        if (chosenRecoveryPlan) {
          additions.push(chosenRecoveryPlan.name);
        }
        if (isUpgradingBasePlan && chosenPlan) {
          additions.push(`Plan Upgrade: ${chosenPlan.name}`);
        }
        const invoiceTitle = additions.join(' + ') || 'Service Top-up Upgrade';

        const mainCategory = trainingType === 'pt'
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
            payment_method: paymentMethod || 'UPI',
            date: new Date().toISOString().split('T')[0],
            notes: `Top-up upgrade: ${invoiceTitle}${calculatedBalanceDue > 0 ? ` (Partial Payment - Balance Due: ₹${calculatedBalanceDue.toLocaleString('en-IN')})` : ''}`,
            status: calculatedBalanceDue > 0 ? 'Partial' : 'Paid'
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
          const newExpiry = new Date();
          newExpiry.setMonth(today.getMonth() + (chosenPlan.durationMonths || 1));
          memberUpdates.expiryDate = newExpiry.toISOString().split('T')[0];
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
          totalAmount: totalCalculatedAmount,
          paidAmount: effectivePaidAmount,
          duesAmount: calculatedBalanceDue,
          isFullPayment: isFullPayment,
          paymentMethod: paymentMethod || 'UPI',
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

    if (!formData.name || !formData.email) {
      addToast('Please enter member full name and email.', 'error');
      return;
    }

    if (!formData.planId && (!plans || plans.length === 0)) {
      addToast('No membership plans available. Please add a plan first.', 'error');
      handleOpenQuickAdd('membership');
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
      } else if (trainingType === 'pt') {
        resolvedTrainer = trainers.find((t) => t.id === selectedTrainerId) || trainers[0];
        resolvedTrainerName = resolvedTrainer ? `${resolvedTrainer.name} (PT Coach)` : 'PT Coach';
        finalTrainerId = resolvedTrainer?.id;
      }

      const today = new Date();
      const expiry = new Date();
      expiry.setMonth(today.getMonth() + (chosenPlan?.durationMonths || 1));

      // Generate invoice title including any PT / recovery additions
      let invoiceTitle = chosenPlan?.name || 'Gym Membership';
      const additions = [];
      if (trainingType === 'pt') {
        additions.push(chosenPtPlan ? chosenPtPlan.name : `1-on-1 Personal Training (${ptCustomSessions} Sessions)`);
      }
      if (chosenRecoveryPlan) additions.push(chosenRecoveryPlan.name);
      if (additions.length > 0) invoiceTitle += ` + ${additions.join(' + ')}`;

      // 1. Add to Gym CRM state (creates member, single official invoice, and revenue inflow on backend)
      const createdMember = await addMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        enquiryId: initialData?.enquiryId || formData.enquiryId,
        enquiry_id: initialData?.enquiryId || formData.enquiryId,
        avatar: formData.avatar || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=200&auto=format&fit=crop&q=80`,
        age: formData.age,
        gender: formData.gender,
        planId: chosenPlan?.id,
        planName: chosenPlan?.name,
        amount: effectivePaidAmount,
        paid_amount: effectivePaidAmount,
        paidAmount: effectivePaidAmount,
        total_amount: totalCalculatedAmount,
        totalAmount: totalCalculatedAmount,
        dues_amount: calculatedBalanceDue,
        duesAmount: calculatedBalanceDue,
        is_full_payment: isFullPayment,
        payment_method: paymentMethod || 'UPI',
        invoice_title: invoiceTitle,
        trainerId: finalTrainerId,
        trainerName: resolvedTrainerName,
        trainingType: trainingType, // 'self', 'general', 'pt'
        ptPlanId: trainingType === 'pt' ? (selectedPtPlanId || 'custom-pt') : null,
        ptPlanName: trainingType === 'pt' ? (chosenPtPlan?.name || `${ptCustomSessions} Sessions 1-on-1 PT`) : null,
        ptSessions: trainingType === 'pt' ? Number(ptCustomSessions) : 0,
        recoveryPlanId: chosenRecoveryPlan ? chosenRecoveryPlan.id : null,
        recoveryPlanName: chosenRecoveryPlan ? chosenRecoveryPlan.name : null,
        goal: formData.goal,
        weight: formData.weight,
        targetWeight: formData.targetWeight,
        height: formData.height,
        medicalNotes: formData.medicalNotes,
        emergencyContact: formData.emergencyContact,
        expiryDate: expiry.toISOString().split('T')[0],
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
        email: formData.email,
        username: formData.email.split('@')[0],
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
      if (resolvedTrainer && trainingType === 'pt' && ptCommissionAmount > 0) {
        await addCommissionRecord({
          trainerId: resolvedTrainer.id,
          trainerName: resolvedTrainer.name,
          memberName: formData.name,
          planName: chosenPtPlan ? chosenPtPlan.name : `1-on-1 PT (${ptCustomSessions} Sessions)`,
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
        password: formData.password || 'member123',
        id: createdMember.id,
        qrPassCode: createdMember.qrPassCode,
        planName: invoiceTitle,
        totalAmount: totalCalculatedAmount,
        paidAmount: effectivePaidAmount,
        duesAmount: calculatedBalanceDue,
        isFullPayment: isFullPayment,
        paymentMethod: paymentMethod || 'UPI',
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
    const text = `Welcome to PULSE FIT!\nHere are your Member Login Credentials:\n• App URL: ${window.location.origin}/\n• Login Email: ${newlyCreatedCredentials.email}\n• Password: ${newlyCreatedCredentials.password}\n• Member ID: ${newlyCreatedCredentials.id}\n• Plan & Services: ${newlyCreatedCredentials.planName}\n• Total Bill: ₹${Number(newlyCreatedCredentials.totalAmount || 0).toLocaleString('en-IN')}\n• Amount Received: ₹${Number(newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount).toLocaleString('en-IN')}${Number(newlyCreatedCredentials.duesAmount || 0) > 0 ? `\n• Remaining Balance Due: ₹${Number(newlyCreatedCredentials.duesAmount).toLocaleString('en-IN')}` : '\n• Payment Status: Paid in Full'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
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
                    Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="member@example.com"
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
              <p className="text-[10px] text-slate-500">
                The member can log into the PULSE FIT Member Portal using this email and password.
              </p>
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
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${
                  isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="text"
                disabled={isUpgradeMode}
                placeholder="+91 98200 00000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${
                  isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Age</label>
                {isUpgradeMode && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <input
                type="number"
                disabled={isUpgradeMode}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${
                  isUpgradeMode
                    ? 'bg-slate-100 text-slate-600 border border-slate-200 cursor-not-allowed font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500'
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
                className={`w-full px-3.5 py-2 rounded-xl text-xs ${
                  isUpgradeMode
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

          {/* Membership Plan Selection / Upgrade Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {isUpgradeMode ? (
                <div className="p-3.5 rounded-2xl bg-violet-50/60 border border-violet-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      <span>Membership Plan Tier</span>
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-violet-700 hover:text-violet-900">
                      <input
                        type="checkbox"
                        checked={isUpgradingBasePlan}
                        onChange={(e) => setIsUpgradingBasePlan(e.target.checked)}
                        className="w-3.5 h-3.5 text-violet-600 rounded border-slate-300 focus:ring-violet-500 cursor-pointer"
                      />
                      <span>Upgrade Plan Tier</span>
                    </label>
                  </div>

                  {isUpgradingBasePlan ? (
                    <div className="space-y-1">
                      <select
                        value={formData.planId}
                        onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-violet-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500 cursor-pointer font-medium"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{Number(p.price).toLocaleString('en-IN')} / {p.period})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-violet-600 font-medium">
                        Upgrades the base subscription plan and extends member validity.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-white border border-violet-100 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate mr-1">
                        Current: <strong>{plans.find((p) => p.id === formData.planId)?.name || targetMember?.planName || 'Active Membership Plan'}</strong>
                      </span>
                      <span className="text-[10px] font-bold text-violet-800 bg-violet-100 px-2 py-0.5 rounded border border-violet-200 shrink-0">
                        Unchanged (₹0)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Membership Plan *</label>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd('membership')}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Plan</span>
                    </button>
                  </div>

                  {(!plans || plans.length === 0) ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No plans found</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-tight">
                        No active membership plans exist in the system. Add one to continue registration.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickAdd('membership')}
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Plan</span>
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.planId}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          handleOpenQuickAdd('membership');
                        } else {
                          setFormData({ ...formData, planId: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{Number(p.price).toLocaleString('en-IN')} / {p.period})
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="font-bold text-emerald-600">
                        + Add New Plan...
                      </option>
                    </select>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Training Type & Coach Assignment
              </label>
              <select
                value={trainingType}
                onChange={(e) => {
                  const val = e.target.value;
                  setTrainingType(val);
                  if (val === 'self' || val === 'general') {
                    setSelectedTrainerId('');
                    setFormData((prev) => ({ ...prev, trainerId: '' }));
                  } else if (val === 'pt') {
                    const firstTrn = trainers[0]?.id || '';
                    setSelectedTrainerId(firstTrn);
                    setFormData((prev) => ({ ...prev, trainerId: firstTrn }));
                  }
                }}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                <option value="self">Self Guided / No Trainer</option>
                <option value="general">General Trainer (Gym Coach Assistance)</option>
                <option value="pt">1-on-1 Personal Training (PT Package)</option>
              </select>
            </div>
          </div>

          {/* General Trainer Floor Guidance Note (No Individual Coach Selection Needed) */}
          {trainingType === 'general' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800">General Floor Coaching Included</p>
                <p className="text-[11px] text-slate-500">
                  Floor coaching and workout guidance are provided by all on-duty gym staff without individual coach assignment.
                </p>
              </div>
            </div>
          )}

          {/* Dedicated PT Coach Selection (Only when 1-on-1 PT is selected) */}
          {trainingType === 'pt' && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Select Dedicated PT Coach</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Personal Training
                </span>
              </div>
              <select
                value={selectedTrainerId}
                onChange={(e) => {
                  setSelectedTrainerId(e.target.value);
                  setFormData((prev) => ({ ...prev, trainerId: e.target.value }));
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
              >
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.specialty}) — {t.experience}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                This coach will conduct the 1-on-1 PT sessions and receive PT commissions.
              </p>
            </div>
          )}

          {/* 1-ON-1 PERSONAL TRAINING PLAN (WHEN PT SELECTED) */}
          {trainingType === 'pt' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200 space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-emerald-600" />
                  <span>1-on-1 Personal Training (PT) Plan</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                  1-on-1 PT Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PT Plan Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      PT Plan Selection
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd('pt')}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Plan</span>
                    </button>
                  </div>

                  {(!ptPlans || ptPlans.length === 0) ? (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>No PT plans found</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickAdd('pt')}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add PT Plan</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <select
                        value={selectedPtPlanId}
                        onChange={(e) => {
                          if (e.target.value === '__ADD_NEW__') {
                            handleOpenQuickAdd('pt');
                          } else {
                            setSelectedPtPlanId(e.target.value);
                            const selectedPt = ptPlans.find((p) => String(p.id) === String(e.target.value));
                            if (selectedPt) {
                              setPtCustomSessions(Number(selectedPt.sessions) || 12);
                              setPtPackageFee(Number(selectedPt.price) || 0);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      >
                        <option value="">Select Saved PT Package...</option>
                        {ptPlans.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name} ({pkg.sessions} Sessions — ₹{Number(pkg.price).toLocaleString('en-IN')})
                          </option>
                        ))}
                        <option value="__ADD_NEW__" className="font-bold text-emerald-600">
                          + Add New PT Plan...
                        </option>
                      </select>

                      <p className="text-[10px] text-slate-500">
                        Assigned Trainer: <strong>{trainers.find((t) => t.id === selectedTrainerId)?.name || 'Selected Coach'}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Predefined PT Plan Summary */}
                <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Predefined Plan Price</span>
                      {chosenPtPlan && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          {chosenPtPlan.sessions} Sessions Included
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      ₹{Number(chosenPtPlan?.price || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Plan: <strong>{chosenPtPlan?.name || 'No Plan Selected'}</strong></span>
                    <span className="text-emerald-600 font-semibold">Predefined Fee Applied</span>
                  </div>
                </div>
              </div>

              {/* TRAINER COMMISSION ENTRY & CALCULATION (ALWAYS VISIBLE FOR 1-ON-1 PT) */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Trainer Commission (Incentive Payout)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    To: {trainers.find((t) => t.id === selectedTrainerId)?.name || 'Selected PT Coach'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => setCommissionType('percent')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                            commissionType === 'percent'
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          % Rate
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommissionType('fixed')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                            commissionType === 'fixed'
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          ₹ Flat
                        </button>
                      </div>

                      {commissionType === 'percent' ? (
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={ptCommissionPercent}
                            onChange={(e) => setPtCommissionPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 pr-6 text-center"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                        </div>
                      ) : (
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={ptFixedCommission}
                            onChange={(e) => setPtFixedCommission(Math.max(0, Number(e.target.value)))}
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {commissionType === 'percent'
                        ? `Calculated on PT plan fee (₹${effectivePtPrice.toLocaleString('en-IN')})`
                        : 'Direct flat commission payout'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium text-[11px]">
                      Commission Earned:
                    </span>
                    <span className="font-mono font-black text-emerald-700 text-base">
                      ₹{ptCommissionAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Automatically logged under <strong>Trainer Commissions</strong> ledger upon registration.</span>
                </p>
              </div>
            </div>
          )}

          {/* RECOVERY & WELLNESS SESSIONS (AVAILABLE FOR ALL TRAINING OPTIONS) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Recovery & Wellness Sessions (Optional Add-on)</span>
              </span>
              <div className="flex items-center gap-2">
                {recoveryPrice > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    +₹{recoveryPrice.toLocaleString('en-IN')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd('recovery')}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Plan</span>
                </button>
              </div>
            </div>

            {(!recoveryPlans || recoveryPlans.length === 0) ? (
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>No recovery plans found</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickAdd('recovery')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Recovery Plan</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Configure cold plunges, sauna therapy, or sports massage packages for members.
                </p>
              </div>
            ) : (
              <select
                value={recoveryPlanId}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    handleOpenQuickAdd('recovery');
                  } else {
                    setRecoveryPlanId(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                <option value="">No Recovery Package (₹0)</option>
                {recoveryPlans.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.name} ({rec.type || rec.duration || 'Therapy'}) — ₹{Number(rec.price).toLocaleString('en-IN')}
                  </option>
                ))}
                <option value="__ADD_NEW__" className="font-bold text-emerald-600">
                  + Add New Recovery Plan...
                </option>
              </select>
            )}
          </div>

          {/* DYNAMIC PRICING SUMMARY CARD */}
          <div className="mt-2 p-3 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div className="font-semibold text-slate-700">Calculated Invoice Breakdown:</div>
              <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2">
                <span>Plan: ₹{basePrice.toLocaleString('en-IN')}</span>
                {ptPrice > 0 && <span>+ PT: ₹{ptPrice.toLocaleString('en-IN')}</span>}
                {recoveryPrice > 0 && <span>+ Recovery: ₹{recoveryPrice.toLocaleString('en-IN')}</span>}
              </div>
            </div>

            <div className="text-right sm:self-center shrink-0">
              <div className="text-[9px] uppercase font-bold text-slate-400">Total Invoice Amount</div>
              <div className="text-base sm:text-lg font-black text-emerald-600 font-mono">
                ₹{totalCalculatedAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* SCOPE OF PAYMENT & SETTLEMENT */}
          <div className="mt-2 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Payment Details & Scope of Settlement
                </span>
              </div>
              <div className="text-[10px] font-semibold text-slate-500">
                Total Bill: <strong className="font-mono text-slate-800">₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Full Payment Done Checkbox */}
              <div className={`p-3 rounded-xl border transition-all ${
                isFullPayment 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFullPayment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsFullPayment(checked);
                      if (checked) {
                        setCustomPaidAmount('');
                      } else {
                        // Pre-populate with half or keep empty
                        setCustomPaidAmount(totalCalculatedAmount > 0 ? Math.round(totalCalculatedAmount * 0.4) : '');
                      }
                    }}
                    className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold block flex items-center gap-1.5">
                      <span>Full Payment Done</span>
                      {isFullPayment && <Check className="w-3.5 h-3.5 text-emerald-600 inline" />}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {isFullPayment ? '100% full payment received (₹0 balance)' : 'Partial payment / installment balance pending'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Net Banking">Net Banking / NEFT</option>
                </select>
              </div>
            </div>

            {/* Scope of Payment: Partial Payment Inputs & Balance Due Field */}
            {!isFullPayment ? (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/90 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Amount Paid Right Now */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Amount Received Right Now (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={totalCalculatedAmount}
                        value={customPaidAmount}
                        onChange={(e) => setCustomPaidAmount(e.target.value)}
                        placeholder="e.g. 4000"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    </div>
                  </div>

                  {/* Remaining Balance Due Field */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Remaining Balance Due (₹)
                    </label>
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 flex items-center justify-between shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500">Balance Pending:</span>
                      <span className="text-sm font-black font-mono text-rose-600">
                        ₹{calculatedBalanceDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Settlement Breakdown Summary */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-amber-200 font-medium">
                  <span className="text-slate-600">
                    Total: <strong className="text-slate-900 font-mono">₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong>
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Full payment of <strong>₹{totalCalculatedAmount.toLocaleString('en-IN')}</strong> will be recorded with <strong>₹0</strong> balance due.</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  Full Payment Done
                </span>
              </div>
            )}
          </div>

          {/* Member Biometrics & Health Notes */}
          {isUpgradeMode ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Member Biometrics on file: <strong>{formData.weight || 70}kg</strong> &bull; <strong>{formData.height || 175}cm</strong> &bull; Goal: <strong>{formData.goal || 'General Fitness'}</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase">Profile Locked</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.targetWeight}
                    onChange={(e) => setFormData({ ...formData, targetWeight: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height}
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
                  placeholder="e.g. Asthma, Lower back pain history, None"
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

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
                    Integrated Consent Form & Liability Waiver
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Digital Signature
                </span>
              </div>

              {/* Legal Waiver Text Box */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
                <p className="font-semibold text-slate-800 mb-1">Member Health Declaration & Assumption of Risk:</p>
                I certify that I am physically fit and medically sound to participate in gym exercises, weight training, group classes, and recovery sessions. I acknowledge that physical activity involves inherent risk of physical injury. In consideration of my membership, I agree to abide by club safety rules and release the gym facility, management, and trainers from all liability.
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
                  I accept the terms of the Health Declaration, Liability Waiver & Gym Rules.
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingMember || (isUpgradeMode ? totalCalculatedAmount <= 0 : (!consentAgreed || (!otpVerified && !signedInPerson)))}
              className={`px-6 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                isUpgradeMode
                  ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {isCreatingMember ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isUpgradeMode ? 'Generating Invoice & Inflow...' : 'Creating Account & Invoice...'}</span>
                </>
              ) : (
                <>
                  {isUpgradeMode && <Zap className="w-3.5 h-3.5" />}
                  <span>
                    {isUpgradeMode
                      ? (isFullPayment
                          ? `Confirm Top-up & Issue Invoice (₹${totalCalculatedAmount.toLocaleString('en-IN')})`
                          : `Confirm Top-up (₹${effectivePaidAmount.toLocaleString('en-IN')} Paid, ₹${calculatedBalanceDue.toLocaleString('en-IN')} Due)`)
                      : (isFullPayment
                          ? `Register Member & Issue Invoice (₹${totalCalculatedAmount.toLocaleString('en-IN')})`
                          : `Register Member (₹${effectivePaidAmount.toLocaleString('en-IN')} Paid, ₹${calculatedBalanceDue.toLocaleString('en-IN')} Due)`)}
                  </span>
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
        title={newlyCreatedCredentials?.isUpgrade ? "Member Top-up Applied & Invoice Issued" : "Member Account Created & Credentials Ready"}
        maxWidth="max-w-md"
      >
        {newlyCreatedCredentials && (
          <div className="space-y-5 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
              newlyCreatedCredentials.isUpgrade
                ? 'bg-violet-100 text-violet-700 border-violet-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}>
              {newlyCreatedCredentials.isUpgrade ? <Receipt className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
            </div>

            <div>
              <h4 className="font-heading font-extrabold text-lg text-slate-900">
                {newlyCreatedCredentials.name}
              </h4>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                {newlyCreatedCredentials.isUpgrade ? `Top-up: ${newlyCreatedCredentials.planName}` : `Plan: ${newlyCreatedCredentials.planName}`}
              </p>
            </div>

            {/* Slip Box */}
            {newlyCreatedCredentials.isUpgrade ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Invoice Number:</span>
                  <span className="font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                    #{newlyCreatedCredentials.invoiceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Member ID:</span>
                  <span className="font-mono font-bold text-slate-900">{newlyCreatedCredentials.id}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Top-up Items:</span>
                  <span className="font-bold text-emerald-700 text-right max-w-[200px] truncate">{newlyCreatedCredentials.planName}</span>
                </div>
                {newlyCreatedCredentials.trainerName && newlyCreatedCredentials.ptName && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Assigned Coach:</span>
                    <span className="font-semibold text-slate-800">{newlyCreatedCredentials.trainerName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Total Bill:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    ₹{Number(newlyCreatedCredentials.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    ₹{Number(newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Balance Due:</span>
                  {Number(newlyCreatedCredentials.duesAmount || 0) > 0 ? (
                    <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                      ₹{Number(newlyCreatedCredentials.duesAmount).toLocaleString('en-IN')} Due
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      ₹0 (Paid in Full)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Member ID:</span>
                  <span className="font-mono font-bold text-slate-900">{newlyCreatedCredentials.id}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Login Email / Username:</span>
                  <span className="font-bold text-slate-900">{newlyCreatedCredentials.email}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Assigned Password:</span>
                  <span className="font-mono font-black text-emerald-800 text-sm bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {newlyCreatedCredentials.password}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Membership Plan:</span>
                  <span className="font-bold text-emerald-700 text-xs">{newlyCreatedCredentials.planName}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Total Bill:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    ₹{Number(newlyCreatedCredentials.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">
                    ₹{Number(newlyCreatedCredentials.paidAmount ?? newlyCreatedCredentials.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Balance Due:</span>
                  {Number(newlyCreatedCredentials.duesAmount || 0) > 0 ? (
                    <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                      ₹{Number(newlyCreatedCredentials.duesAmount).toLocaleString('en-IN')} Due
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      ₹0 (Paid in Full)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {newlyCreatedCredentials.isUpgrade ? (
              <div className="flex flex-col sm:flex-row gap-2">
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewlyCreatedCredentials(null)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Quick Add Plan Modal */}
      <Modal
        isOpen={Boolean(quickAddPlanType)}
        onClose={() => setQuickAddPlanType(null)}
        title={
          quickAddPlanType === 'membership'
            ? 'Add Membership Plan'
            : quickAddPlanType === 'recovery'
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Plan / Package Name *</label>
            <input
              type="text"
              required
              placeholder={
                quickAddPlanType === 'membership'
                  ? 'e.g. 1 Month Standard, 3 Months Pro'
                  : quickAddPlanType === 'recovery'
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

            {quickAddPlanType === 'membership' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                <select
                  value={quickPlanForm.durationMonths}
                  onChange={(e) => {
                    const months = Number(e.target.value);
                    const periods = {
                      1: 'Monthly (1 Month)',
                      3: 'Quarterly (3 Months)',
                      6: 'Half-Yearly (6 Months)',
                      12: 'Annual (12 Months)'
                    };
                    setQuickPlanForm({
                      ...quickPlanForm,
                      durationMonths: months,
                      period: periods[months] || `${months} Months`
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={1}>1 Month (Monthly)</option>
                  <option value={3}>3 Months (Quarterly)</option>
                  <option value={6}>6 Months (Half-Yearly)</option>
                  <option value={12}>12 Months (Annual)</option>
                </select>
              </div>
            )}

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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
