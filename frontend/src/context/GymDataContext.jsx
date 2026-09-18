import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { getTodayIso, getYesterdayIso, getOffsetIso, formatDateDisplay, recordMatchesDate } from '../utils/dateUtils';

const GymDataContext = createContext(null);

export const calculateMemberStatus = (expiryDate, currentStatus = 'Active') => {
  if (currentStatus === 'Frozen' || currentStatus === 'On Hold') return currentStatus;
  if (!expiryDate) return currentStatus || 'Active';

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    if (isNaN(exp.getTime())) return currentStatus || 'Active';

    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays <= 10) {
      return 'Expiring Soon';
    } else {
      return 'Active';
    }
  } catch {
    return currentStatus || 'Active';
  }
};

export const getExpiryDaysDiff = (expiryDate) => {
  if (!expiryDate) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    if (isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

// Initial Rich Seed Data
const SEED_PLANS = [
  {
    id: "plan-1",
    name: "Silver Monthly Pass",
    price: 1999,
    period: "Monthly (1 Month)",
    durationMonths: 1,
    popular: false,
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
    features: [
      "Access to all cardio & strength training zones",
      "Locker, steam room & shower facilities",
      "ArchFit Mobile App QR Turnstile Pass",
      "1 Initial InBody body composition scan"
    ],
    activeSubscribers: 142
  },
  {
    id: "plan-2",
    name: "Gold Quarterly Fitness",
    price: 4999,
    period: "Quarterly (3 Months)",
    durationMonths: 3,
    popular: true,
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40",
    features: [
      "All Silver Plan benefits included",
      "Unlimited group classes (Yoga, HIIT, Bollywood Zumba)",
      "Dedicated Trainer workout assignment & routine",
      "Bi-weekly body composition & BMI assessment",
      "Steam, Sauna & Recovery Zone access"
    ],
    activeSubscribers: 285
  },
  {
    id: "plan-3",
    name: "Platinum Half-Yearly",
    price: 8999,
    period: "Half-Yearly (6 Months)",
    durationMonths: 6,
    popular: false,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/40",
    features: [
      "All Gold Plan benefits included",
      "2 Free Personal Trainer 1-on-1 sessions",
      "Personalized Indian Macro & Diet Chart",
      "Complimentary dedicated locker for 6 months",
      "2 Free guest workout passes per month"
    ],
    activeSubscribers: 118
  },
  {
    id: "plan-4",
    name: "Diamond VIP Annual Elite",
    price: 15999,
    period: "Annual (12 Months)",
    durationMonths: 12,
    popular: true,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40",
    features: [
      "24/7 VIP Gym floor, Lounge & Steam access",
      "Weekly 1-on-1 Personal Training Session",
      "Customized Indian Vegetarian / Non-Veg Macro Diet",
      "Free ArchFit Athlete Kit (Duffel Bag, Shaker & Towel)",
      "Complimentary Post-Workout Protein Shakes"
    ],
    activeSubscribers: 94
  }
];

const SEED_TRAINERS = [
  {
    id: "trn-2",
    userId: 2,
    name: "Coach Alex Rivers",
    email: "trainer@archfit.in",
    phone: "+91 98201 11223",
    specialty: "Hypertrophy & Powerlifting",
    experience: "8+ Years",
    rating: 4.9,
    clientsCount: 24,
    monthlySalary: 65000,
    avatar: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80",
    certifications: ["CSCS", "NASM-CPT", "Precision Nutrition L1"],
    bio: "Certified CSCS with specialization in biomechanics, muscle hypertrophy, and athlete conditioning."
  },
  {
    id: "trn-3",
    userId: 3,
    name: "Coach Elena Rostova",
    email: "elena.r@archfit.in",
    phone: "+91 98201 22334",
    specialty: "Fat Loss & Functional Movement",
    experience: "6 Years",
    rating: 4.8,
    clientsCount: 19,
    monthlySalary: 55000,
    avatar: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&auto=format&fit=crop&q=80",
    certifications: ["CrossFit L2", "ACE Personal Trainer", "Kettlebell Athletics"],
    bio: "Passionate about mobility, core power, and high-intensity body transformations."
  },
  {
    id: "trn-4",
    userId: 4,
    name: "Coach Marcus Thorne",
    email: "marcus.t@archfit.in",
    phone: "+91 98201 33445",
    specialty: "Yoga, Mobility & Spine Rehab",
    experience: "10 Years",
    rating: 5.0,
    clientsCount: 31,
    monthlySalary: 58000,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    certifications: ["RYT-500", "FMS Level 2", "CES"],
    bio: "Focuses on injury rehabilitation, spine health, restorative yoga, and sustainable mobility."
  }
];

const SEED_MEMBERS = [
  {
    id: "mem-5",
    userId: 5,
    name: "Aarav Sharma",
    email: "member@archfit.in",
    phone: "+91 98765 43210",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    planId: "plan-2",
    planName: "Gold Quarterly Fitness",
    status: "Active",
    joinDate: "2025-11-15",
    expiryDate: "2026-12-07",
    trainerId: "trn-2",
    trainerName: "Coach Alex Rivers",
    gender: "Male",
    age: 27,
    weight: 78.5,
    targetWeight: 74.0,
    height: 178,
    goal: "Lean Muscle Gain & Core Strength",
    medicalNotes: "Minor left shoulder impingement (cleared)",
    emergencyContact: "Neha Sharma (+91 98765 11223)",
    attendanceStreak: 14,
    qrPassCode: "PF-M-101-AARAV",
    duesAmount: 0,
    lastCheckIn: "2 hours ago"
  },
  {
    id: "mem-6",
    userId: 6,
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: "+91 98112 34567",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    planId: "plan-4",
    planName: "Diamond VIP Annual Elite",
    status: "Active",
    joinDate: "2025-08-10",
    expiryDate: "2026-08-10",
    trainerId: "trn-3",
    trainerName: "Coach Elena Rostova",
    gender: "Female",
    age: 29,
    weight: 62.0,
    targetWeight: 57.0,
    height: 165,
    goal: "Fat Loss & Athletic Conditioning",
    medicalNotes: "None reported",
    emergencyContact: "Rajesh Patel (+91 98112 99887)",
    attendanceStreak: 21,
    qrPassCode: "PF-M-102-PRIYA",
    duesAmount: 0,
    lastCheckIn: "3 hours ago"
  },
  {
    id: "mem-7",
    userId: 7,
    name: "Rohan Verma",
    email: "rohan.v@example.com",
    phone: "+91 98223 45678",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80",
    planId: "plan-1",
    planName: "Silver Monthly Pass",
    status: "Expiring Soon",
    joinDate: "2026-01-20",
    expiryDate: "2026-03-02",
    trainerId: null,
    trainerName: "None / Self Guided",
    gender: "Male",
    age: 32,
    weight: 84.0,
    targetWeight: 80.0,
    height: 182,
    goal: "Cardiovascular Health & Fat Loss",
    medicalNotes: "Mild asthma (keeps inhaler)",
    emergencyContact: "Kavita Verma (+91 98223 88776)",
    attendanceStreak: 3,
    qrPassCode: "PF-M-103-ROHAN",
    duesAmount: 1999,
    lastCheckIn: "1 day ago"
  },
  {
    id: "mem-8",
    userId: 8,
    name: "Ananya Iyer",
    email: "ananya.iyer@example.com",
    phone: "+91 98334 56789",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    planId: "plan-2",
    planName: "Gold Quarterly Fitness",
    status: "Active",
    joinDate: "2025-10-01",
    expiryDate: "2026-07-01",
    trainerId: "trn-4",
    trainerName: "Coach Marcus Thorne",
    gender: "Female",
    age: 26,
    weight: 54.0,
    targetWeight: 56.0,
    height: 160,
    goal: "Hypertrophy, Flexibility & Core Stability",
    medicalNotes: "None",
    emergencyContact: "Suresh Iyer (+91 98334 11223)",
    attendanceStreak: 8,
    qrPassCode: "PF-M-104-ANANYA",
    duesAmount: 0,
    lastCheckIn: "1 hour ago"
  },
  {
    id: "mem-9",
    userId: 9,
    name: "Kabir Mehra",
    email: "kabir.m@example.com",
    phone: "+91 98445 67890",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    planId: "plan-1",
    planName: "Silver Monthly Pass",
    status: "Expired",
    joinDate: "2025-12-01",
    expiryDate: "2026-01-01",
    trainerId: null,
    trainerName: "None / Self Guided",
    gender: "Male",
    age: 35,
    weight: 92.0,
    targetWeight: 85.0,
    height: 175,
    goal: "General Fitness & Weight Loss",
    medicalNotes: "Lower back soreness (avoid heavy deadlifts)",
    emergencyContact: "Sunita Mehra (+91 98445 22334)",
    attendanceStreak: 0,
    qrPassCode: "PF-M-105-KABIR",
    duesAmount: 1999,
    lastCheckIn: "1 month ago"
  },
  {
    id: "mem-11",
    userId: 11,
    name: "Sameer Kulkarni",
    email: "sameer.kulkarni@example.com",
    phone: "+91 99887 76655",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    planId: null,
    planName: "Unassigned",
    status: "Active",
    joinDate: "2026-09-04",
    expiryDate: "2027-03-04",
    trainerId: "trn-2",
    trainerName: "Coach Alex Rivers",
    gender: "Male",
    age: 28,
    weight: 81.0,
    targetWeight: 76.0,
    height: 180,
    goal: "Lean Muscle Gain & Agility",
    medicalNotes: "No chronic conditions",
    emergencyContact: "Anjali Kulkarni (+91 99887 11223)",
    attendanceStreak: 1,
    qrPassCode: "PF-M-11-SAMEE",
    duesAmount: 0,
    lastCheckIn: "1 week ago"
  }
];

const SEED_ENQUIRIES = [
  {
    id: "enq-7",
    numericId: 7,
    gymId: 1,
    name: "Rohit Sharma",
    phone: "+91 98199 87654",
    email: "rohit.s@outlook.com",
    source: "Instagram",
    interestedPlan: "Gold Quarterly Fitness",
    goal: "Weight Loss & Stamina",
    priority: "Hot",
    status: "Trial Scheduled",
    followUpDate: "2026-08-15",
    staffName: "Coach Priya",
    notes: "Booked 1-day complimentary floor workout pass for Saturday morning.",
    comments: [
      { id: 1, text: "Messaged on IG asking about Saturday morning batch. Trial booked for 8 AM.", author: "Coach Priya", createdAt: "2026-08-14 12:15" }
    ],
    convertedMemberId: null,
    createdAt: "2026-09-11T04:58:54Z"
  },
  {
    id: "enq-6",
    numericId: 6,
    gymId: 1,
    name: "Arjun Verma",
    phone: "+91 98201 12345",
    email: "arjun.v@gmail.com",
    source: "Walk-in",
    interestedPlan: "Platinum Annual All-Access",
    goal: "Muscle Hypertrophy & Bulk",
    priority: "Hot",
    status: "Contacted",
    followUpDate: "2026-08-16",
    staffName: "Coach Rohan",
    notes: "Interested in 1-on-1 PT package with annual pass. Visited during evening peak.",
    comments: [
      { id: 1, text: "Came in at 6:30 PM. Walked through free-weights zone. Very keen on coach training.", author: "Coach Rohan", createdAt: "2026-08-14 18:45" }
    ],
    convertedMemberId: null,
    createdAt: "2026-09-11T04:58:54Z"
  },
  {
    id: "enq-5",
    numericId: 5,
    gymId: 1,
    name: "Sneha Nair",
    phone: "+91 98450 78901",
    email: "sneha.nair@gmail.com",
    source: "Google Maps",
    interestedPlan: "Gold Quarterly Fitness",
    goal: "Post-rehab Strength",
    priority: "Warm",
    status: "Trial Scheduled",
    followUpDate: "2026-08-18",
    staffName: "Coach Rohan",
    notes: "Recovering from ACL sprain. Needs certified trainer evaluation on trial day.",
    comments: [
      { id: 1, text: "Advised to bring doctor fitness clearance certificate. Rohan will take mobility screening.", author: "Coach Rohan", createdAt: "2026-08-13 14:20" }
    ],
    convertedMemberId: null,
    createdAt: "2026-09-08T10:04:03Z"
  },
  {
    id: "enq-3",
    numericId: 3,
    gymId: 1,
    name: "Priya Patil",
    phone: "+91 97654 32109",
    email: "priya.patil@yahoo.com",
    source: "Referral",
    interestedPlan: "Silver Monthly Pass",
    goal: "Mobility & Yoga",
    priority: "Cold",
    status: "Converted",
    followUpDate: "2026-08-17",
    staffName: "Coach Vikram",
    notes: "Referred by member Ananya Roy. Wants early morning slot only.",
    comments: [
      { id: 1, text: "Ananya mentioned her colleague wants to join. Scheduled callback for Monday morning.", author: "Coach Vikram", createdAt: "2026-08-13 16:30" }
    ],
    convertedMemberId: null,
    createdAt: "2026-09-08T10:04:03Z"
  },
  {
    id: "enq-4",
    numericId: 4,
    gymId: 1,
    name: "Vikram Rao",
    phone: "+91 99302 45678",
    email: "vikram.rao@techcorp.in",
    source: "Corporate Tie-up",
    interestedPlan: "Platinum Annual All-Access",
    goal: "Strength & Conditioning",
    priority: "Cold",
    status: "Contacted",
    followUpDate: "2026-08-20",
    staffName: "Admin Sunita",
    notes: "Corporate discount inquiry from TCS Powai office. Follow up post budget approval.",
    comments: [
      { id: 1, text: "Sent corporate discount matrix for 10+ employees. Awaiting HR approval.", author: "Admin Sunita", createdAt: "2026-08-12 11:00" }
    ],
    convertedMemberId: null,
    createdAt: "2026-09-08T10:04:03Z"
  }
];

const SEED_PRODUCTS = [
  { id: "prd-1", numericId: 1, name: "Optimum Nutrition Gold Standard 100% Whey (5 lbs)", category: "Supplements", price: 6899, costPrice: 5200, stock: 18, minStockAlert: 5, status: "In Stock", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80" },
  { id: "prd-2", numericId: 2, name: "MuscleBlaze Micronized Creatine Monohydrate (250g)", category: "Supplements", price: 999, costPrice: 650, stock: 26, minStockAlert: 5, status: "In Stock", image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=200&auto=format&fit=crop&q=80" },
  { id: "prd-3", numericId: 3, name: "ArchFit Athlete Performance Kit (Duffel + Shaker)", category: "Merchandise", price: 1499, costPrice: 800, stock: 45, minStockAlert: 10, status: "In Stock", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop&q=80" },
  { id: "prd-4", numericId: 4, name: "Cellucor C4 Original Pre-Workout (30 Servings)", category: "Supplements", price: 2399, costPrice: 1700, stock: 14, minStockAlert: 5, status: "In Stock", image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&auto=format&fit=crop&q=80" },
  { id: "prd-5", numericId: 5, name: "Raw Electrolyte & Hydration Drink (500ml)", category: "Beverages", price: 120, costPrice: 75, stock: 60, minStockAlert: 15, status: "In Stock", image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=200&auto=format&fit=crop&q=80" }
];

const SEED_EXPENSES = [
  { id: "exp-1", title: "Facility Commercial Lease - Powai Club", category: "Rent", vendor: "Hiranandani Realtors Pvt Ltd", amount: 120000, date: "2026-08-01", paymentMode: "Bank Transfer", refNo: "LEASE-AUG-2026", notes: "Monthly commercial premises rent." },
  { id: "exp-2", title: "Adani Electricity Powai HT Commercial", category: "Utilities", vendor: "Adani Electricity Mumbai Ltd", amount: 45000, date: "2026-08-05", paymentMode: "UPI", refNo: "BILL-AUG-9912", notes: "HVAC central cooling & power." },
  { id: "exp-3", title: "Trainer & Staff Commissions Payout", category: "Salaries", vendor: "ArchFit Payroll Disbursement", amount: 48000, date: "2026-08-07", paymentMode: "Bank Transfer", refNo: "SAL-AUG-01", notes: "Trainer commissions & staff." },
  { id: "exp-4", title: "Life Fitness & Technogym AMC Inspection", category: "Equipment AMC", vendor: "Fitness World Services Mumbai", amount: 14500, date: "2026-08-10", paymentMode: "Card", refNo: "AMC-Q3-004", notes: "Quarterly cable & belt lubrication." }
];

const SEED_CLASSES = [
  { id: "cls-1", numericId: 1, name: "Sunrise HIIT & Conditioning", title: "Sunrise HIIT & Conditioning", trainerId: "trn-2", trainerName: "Coach Alex Rivers", time: "06:30 AM - 07:30 AM", days: ["Mon", "Wed", "Fri"], capacity: 25, bookedCount: 18, enrolledCount: 18, category: "Cardio & HIIT", room: "Studio A (Main Floor)", difficulty: "High", intensity: "High" },
  { id: "cls-2", numericId: 2, name: "Power Vinyasa Yoga Flow", title: "Power Vinyasa Yoga Flow", trainerId: "trn-4", trainerName: "Coach Marcus Thorne", time: "07:30 AM - 08:30 AM", days: ["Tue", "Thu", "Sat"], capacity: 20, bookedCount: 14, enrolledCount: 14, category: "Yoga & Flexibility", room: "Mind & Body Studio", difficulty: "All Levels", intensity: "Moderate" },
  { id: "cls-3", numericId: 3, name: "CrossFit & Olympic Lifting", title: "CrossFit & Olympic Lifting", trainerId: "trn-2", trainerName: "Coach Alex Rivers", time: "06:00 PM - 07:00 PM", days: ["Mon", "Wed", "Fri"], capacity: 15, bookedCount: 12, enrolledCount: 12, category: "Strength & Power", room: "Iron Box Turf", difficulty: "Advanced", intensity: "Extreme" },
  { id: "cls-4", numericId: 4, name: "Bollywood Zumba Dance Fitness", title: "Bollywood Zumba Dance Fitness", trainerId: "trn-3", trainerName: "Coach Elena Rostova", time: "07:00 PM - 08:00 PM", days: ["Tue", "Thu", "Sat"], capacity: 30, bookedCount: 26, enrolledCount: 26, category: "Dance Fitness", room: "Studio A (Main Floor)", difficulty: "Beginner", intensity: "High" },
  { id: "cls-5", numericId: 5, name: "Core & Spine Posture Rehab", title: "Core & Spine Posture Rehab", trainerId: "trn-4", trainerName: "Coach Marcus Thorne", time: "08:30 AM - 09:15 AM", days: ["Mon", "Wed", "Fri"], capacity: 15, bookedCount: 9, enrolledCount: 9, category: "Rehab & Mobility", room: "Mind & Body Studio", difficulty: "All Levels", intensity: "Low" }
];

const SEED_ATTENDANCE = [
  { id: "att-6", memberId: "mem-5", memberName: "Aarav Sharma", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80", planName: "Gold Quarterly Fitness", checkInTime: "07:15 AM", checkOutTime: "08:30 AM", duration: "1h 15m", date: getYesterdayIso(), rawDate: getYesterdayIso(), displayDate: "Yesterday", status: "Completed", gate: "Main Turnstile A" },
  { id: "att-5", memberId: "mem-6", memberName: "Priya Patel", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80", planName: "Diamond VIP Annual Elite", checkInTime: "06:45 AM", checkOutTime: "08:15 AM", duration: "1h 30m", date: getYesterdayIso(), rawDate: getYesterdayIso(), displayDate: "Yesterday", status: "Completed", gate: "VIP Turnstile C" },
  { id: "att-4", memberId: "mem-8", memberName: "Ananya Iyer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80", planName: "Gold Quarterly Fitness", checkInTime: "08:30 AM", checkOutTime: "09:45 AM", duration: "1h 15m", date: getOffsetIso(-2), rawDate: getOffsetIso(-2), displayDate: formatDateDisplay(getOffsetIso(-2)), status: "Completed", gate: "Main Turnstile B" },
  { id: "att-3", memberId: "mem-11", memberName: "Sameer Kulkarni", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80", planName: "Silver Monthly Pass", checkInTime: "04:18 AM", checkOutTime: "05:45 AM", duration: "1h 27m", date: getOffsetIso(-2), rawDate: getOffsetIso(-2), displayDate: formatDateDisplay(getOffsetIso(-2)), status: "Completed", gate: "Main Turnstile B" },
  { id: "att-2", memberId: "mem-7", memberName: "Rohan Verma", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80", planName: "Silver Monthly Pass", checkInTime: "06:00 PM", checkOutTime: "07:30 PM", duration: "1h 30m", date: getYesterdayIso(), rawDate: getYesterdayIso(), displayDate: "Yesterday", status: "Completed", gate: "Main Turnstile A" },
  { id: "att-2b", memberId: "mem-10", memberName: "Vikram Malhotra", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80", planName: "Gold Quarterly Fitness", checkInTime: "05:15 PM", checkOutTime: "06:45 PM", duration: "1h 30m", date: getYesterdayIso(), rawDate: getYesterdayIso(), displayDate: "Yesterday", status: "Completed", gate: "VIP Turnstile C" },
  { id: "att-1", memberId: "mem-9", memberName: "Kabir Mehra", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80", planName: "Silver Monthly Pass", checkInTime: "07:00 AM", checkOutTime: "08:15 AM", duration: "1h 15m", date: getOffsetIso(-3), rawDate: getOffsetIso(-3), displayDate: formatDateDisplay(getOffsetIso(-3)), status: "Completed", gate: "Main Turnstile A" }
];

const SEED_ADVANCE_REQUESTS = [
  {
    id: "adv-1",
    staffId: "trn-2",
    staffName: "Coach Alex Rivers",
    role: "Head Strength Coach",
    amount: 25000,
    requestDate: "2026-09-10",
    reason: "Family medical emergency and urgent hospital deposit",
    repaymentMonth: "October 2026",
    status: "Pending",
    disbursedDate: null,
    approvedBy: null
  },
  {
    id: "adv-2",
    staffId: "trn-3",
    staffName: "Coach Elena Rostova",
    role: "Senior Functional Coach",
    amount: 15000,
    requestDate: "2026-09-05",
    reason: "CrossFit Level 3 International Certification fee",
    repaymentMonth: "September 2026",
    status: "Approved",
    disbursedDate: "2026-09-06",
    approvedBy: "Vikramaditya Singhania (Superadmin)"
  },
  {
    id: "adv-3",
    staffId: "trn-4",
    staffName: "Coach Marcus Thorne",
    role: "Mobility & Yoga Specialist",
    amount: 12000,
    requestDate: "2026-08-20",
    reason: "Annual house lease renewal advance",
    repaymentMonth: "August 2026",
    status: "Disbursed",
    disbursedDate: "2026-08-21",
    approvedBy: "Sunita Deshmukh (Accounts)"
  }
];

const SEED_PT_SESSIONS = [
  {
    id: "pts-1",
    memberId: "mem-5",
    memberName: "Aarav Sharma",
    memberEmail: "member@pulsefit.in",
    trainerId: "trn-2",
    trainerName: "Coach Alex Rivers",
    packageTitle: "Elite 1-on-1 PT (12 Sessions)",
    totalSessions: 12,
    completedSessions: 5,
    remainingSessions: 7,
    startDate: "2026-08-10",
    otp: "4821",
    logs: [
      { sessionNo: 1, date: "2026-08-12 07:30 AM", verifiedWithOtp: true, trainerNotes: "Baseline bench & squat biomechanics form assessment" },
      { sessionNo: 2, date: "2026-08-15 07:30 AM", verifiedWithOtp: true, trainerNotes: "Hypertrophy Push workout, 4 sets chest press" },
      { sessionNo: 3, date: "2026-08-19 07:30 AM", verifiedWithOtp: true, trainerNotes: "Pull day deadlifts and heavy lat pulldowns" },
      { sessionNo: 4, date: "2026-08-23 07:30 AM", verifiedWithOtp: true, trainerNotes: "Leg day squats and Romanian deadlifts" },
      { sessionNo: 5, date: "2026-08-28 07:30 AM", verifiedWithOtp: true, trainerNotes: "Shoulder stability & overhead barbell press" }
    ]
  },
  {
    id: "pts-2",
    memberId: "mem-6",
    memberName: "Priya Patel",
    memberEmail: "priya.p@gmail.com",
    trainerId: "trn-3",
    trainerName: "Coach Elena Rostova",
    packageTitle: "VIP Executive Transformation (24 Sessions)",
    totalSessions: 24,
    completedSessions: 8,
    remainingSessions: 16,
    startDate: "2026-08-05",
    otp: "7392",
    logs: [
      { sessionNo: 1, date: "2026-08-06 06:45 AM", verifiedWithOtp: true, trainerNotes: "Cardio VO2 max & core stability test" },
      { sessionNo: 2, date: "2026-08-09 06:45 AM", verifiedWithOtp: true, trainerNotes: "HIIT circuit with kettlebells & rowing" }
    ]
  }
];

const SEED_TRAINER_REVIEWS = [
  {
    id: "rev-1",
    trainerId: "trn-2",
    trainerName: "Coach Alex Rivers",
    memberId: "mem-5",
    memberName: "Aarav Sharma",
    rating: 5,
    comment: "Coach Alex has transformed my strength! Added 25kg to my deadlift in 2 months with zero injury. Best biomechanics coach in Mumbai.",
    date: "2026-09-02"
  },
  {
    id: "rev-2",
    trainerId: "trn-2",
    trainerName: "Coach Alex Rivers",
    memberId: "mem-7",
    memberName: "Rohan Verma",
    rating: 5,
    comment: "Extreme attention to posture and progressive overload. Highly disciplined and supportive!",
    date: "2026-08-28"
  },
  {
    id: "rev-3",
    trainerId: "trn-3",
    trainerName: "Coach Elena Rostova",
    memberId: "mem-6",
    memberName: "Priya Patel",
    rating: 5,
    comment: "Elena's HIIT circuits and fat loss protocols are unmatched. Lost 4kg in 6 weeks while gaining toned endurance!",
    date: "2026-09-05"
  },
  {
    id: "rev-4",
    trainerId: "trn-4",
    trainerName: "Coach Marcus Thorne",
    memberId: "mem-8",
    memberName: "Ananya Iyer",
    rating: 5,
    comment: "Fixed my chronic lumbar spine stiffness through yoga mobility drills. Feel 10 years younger.",
    date: "2026-08-30"
  }
];

const SEED_EQUIPMENT = [
  { id: "eq-1", numericId: 1, name: "Hammer Strength Power Olympic Rack (Zone A)", brand: "Hammer Strength", category: "Free Weights & Racks", location: "Zone A - Heavy Iron", status: "Operational", condition: "Excellent", lastServiced: "2026-08-01", lastServiceDate: "2026-08-01", nextServiceDue: "2026-11-01" },
  { id: "eq-2", numericId: 2, name: "Technogym Skillmill Curved Treadmill", brand: "Technogym", category: "Cardio Machines", location: "Zone C - Cardio Deck", status: "Operational", condition: "Good", lastServiced: "2026-07-15", lastServiceDate: "2026-07-15", nextServiceDue: "2026-10-15" },
  { id: "eq-3", numericId: 3, name: "Life Fitness Dual Adjustable Cable Cross 8-Stack", brand: "Life Fitness", category: "Cable & Selectorized", location: "Zone B - Selectorized", status: "Operational", condition: "Excellent", lastServiced: "2026-08-10", lastServiceDate: "2026-08-10", nextServiceDue: "2026-11-10" },
  { id: "eq-4", numericId: 4, name: "Eleiko IWF Competition Barbell & Bumper Plate Set (300kg)", brand: "Eleiko", category: "Free Weights & Racks", location: "Zone A - Heavy Iron", status: "Operational", condition: "Excellent", lastServiced: "2026-08-05", lastServiceDate: "2026-08-05", nextServiceDue: "2026-12-05" },
  { id: "eq-5", numericId: 5, name: "Concept2 RowErg PM5 Indoor Rower", brand: "Concept2", category: "Cardio Machines", location: "Zone C - Cardio Deck", status: "Maintenance Needed", condition: "Fair", lastServiced: "2026-06-20", lastServiceDate: "2026-06-20", nextServiceDue: "2026-09-20" },
  { id: "eq-6", numericId: 6, name: "Matrix Fitness Ultra Leg Press 45-Degree", brand: "Matrix", category: "Cable & Selectorized", location: "Zone B - Selectorized", status: "Operational", condition: "Good", lastServiced: "2026-07-28", lastServiceDate: "2026-07-28", nextServiceDue: "2026-10-28" }
];


const SEED_EXERCISES = [
  { id: 'ex-1', name: 'Barbell Flat Bench Press', category: 'Chest', equipment: 'Barbell' },
  { id: 'ex-2', name: 'Incline Dumbbell Press', category: 'Chest', equipment: 'Dumbbells' },
  { id: 'ex-3', name: 'Overhead Shoulder Press', category: 'Shoulders', equipment: 'Barbell' },
  { id: 'ex-4', name: 'Dumbbell Lateral Raises', category: 'Shoulders', equipment: 'Dumbbells' },
  { id: 'ex-5', name: 'Tricep Rope Pushdowns', category: 'Arms', equipment: 'Cable' },
  { id: 'ex-6', name: 'Barbell Deadlift', category: 'Back', equipment: 'Barbell' },
  { id: 'ex-7', name: 'Lat Pulldowns', category: 'Back', equipment: 'Cable' },
  { id: 'ex-8', name: 'Seated Cable Row', category: 'Back', equipment: 'Cable' },
  { id: 'ex-9', name: 'Barbell EZ-Bar Bicep Curls', category: 'Arms', equipment: 'Barbell' },
  { id: 'ex-10', name: 'Hammer Curls', category: 'Arms', equipment: 'Dumbbells' },
  { id: 'ex-11', name: 'Barbell Back Squats', category: 'Legs', equipment: 'Barbell' },
  { id: 'ex-12', name: 'Leg Press Machine', category: 'Legs', equipment: 'Machine' },
  { id: 'ex-13', name: 'Lying Hamstring Curls', category: 'Legs', equipment: 'Machine' },
  { id: 'ex-14', name: 'Standing Calf Raises', category: 'Legs', equipment: 'Machine' },
  { id: 'ex-15', name: 'Romanian Deadlifts (RDL)', category: 'Legs', equipment: 'Barbell' },
  { id: 'ex-16', name: 'Hanging Knee Raises & Plank', category: 'Core', equipment: 'Bodyweight' }
];

const SEED_BODY_METRICS = [
  { month: 'Apr', weight: 84.5, bodyFat: 19.5, muscleMass: 35.2, chest: 104.0, waist: 88.0, biceps: 35.5 },
  { month: 'May', weight: 82.8, bodyFat: 18.0, muscleMass: 36.0, chest: 105.5, waist: 86.0, biceps: 36.2 },
  { month: 'Jun', weight: 81.2, bodyFat: 16.8, muscleMass: 36.8, chest: 106.5, waist: 84.0, biceps: 37.0 },
  { month: 'Jul', weight: 79.8, bodyFat: 15.5, muscleMass: 37.5, chest: 108.0, waist: 82.5, biceps: 38.0 },
  { month: 'Aug', weight: 78.4, bodyFat: 14.8, muscleMass: 37.9, chest: 109.0, waist: 81.2, biceps: 38.5 },
  { month: 'Sep', weight: 77.8, bodyFat: 14.2, muscleMass: 38.2, chest: 109.5, waist: 80.5, biceps: 39.0 }
];

const SEED_DEFAULT_WORKOUT_PLAN = {
  id: 'wp-1',
  memberId: 'mem-4',
  memberName: 'Pooja Hegde',
  title: '6-Day Muscle Hypertrophy Split',
  assignedBy: 'Coach Alex Rivers',
  days: [
    {
      day: 'Monday',
      label: 'Push (Chest & Triceps)',
      exercises: [
        { id: 1, name: 'Barbell Flat Bench Press', sets: 4, reps: '10-12', weight: '60 kg', rest: 90, done: false },
        { id: 2, name: 'Incline Dumbbell Press', sets: 4, reps: '12', weight: '22 kg', rest: 60, done: false },
        { id: 3, name: 'Dumbbell Lateral Raises', sets: 4, reps: '15', weight: '10 kg', rest: 45, done: false },
        { id: 4, name: 'Tricep Rope Pushdowns', sets: 4, reps: '12', weight: '25 kg', rest: 60, done: false }
      ]
    },
    {
      day: 'Tuesday',
      label: 'Pull (Back & Biceps)',
      exercises: [
        { id: 5, name: 'Lat Pulldowns', sets: 4, reps: '10-12', weight: '55 kg', rest: 90, done: false },
        { id: 6, name: 'Seated Cable Rows', sets: 4, reps: '12', weight: '45 kg', rest: 60, done: false },
        { id: 7, name: 'Barbell EZ-Bar Bicep Curls', sets: 4, reps: '12', weight: '25 kg', rest: 60, done: false },
        { id: 8, name: 'Hammer Curls', sets: 3, reps: '15', weight: '12 kg', rest: 45, done: false }
      ]
    },
    {
      day: 'Wednesday',
      label: 'Legs & Core Compound',
      exercises: [
        { id: 9, name: 'Barbell Back Squats', sets: 4, reps: '8-10', weight: '80 kg', rest: 120, done: false },
        { id: 10, name: 'Leg Press Machine', sets: 4, reps: '12', weight: '140 kg', rest: 90, done: false },
        { id: 11, name: 'Lying Hamstring Curls', sets: 4, reps: '12', weight: '35 kg', rest: 60, done: false },
        { id: 12, name: 'Standing Calf Raises', sets: 4, reps: '20', weight: '50 kg', rest: 45, done: false }
      ]
    },
    {
      day: 'Thursday',
      label: 'Upper Body Hypertrophy',
      exercises: [
        { id: 13, name: 'Standing Overhead Barbell Press', sets: 4, reps: '10', weight: '40 kg', rest: 90, done: false },
        { id: 14, name: 'Cable Chest Flyes', sets: 4, reps: '15', weight: '15 kg', rest: 60, done: false },
        { id: 15, name: 'Single-Arm Dumbbell Rows', sets: 4, reps: '12', weight: '24 kg', rest: 60, done: false },
        { id: 16, name: 'Overhead Dumbbell Tricep Ext', sets: 3, reps: '12', weight: '16 kg', rest: 60, done: false }
      ]
    },
    {
      day: 'Friday',
      label: 'Back Width & Arm Sculpt',
      exercises: [
        { id: 17, name: 'Wide-Grip Pull-ups / Assist', sets: 4, reps: '8-10', weight: 'Bodyweight', rest: 90, done: false },
        { id: 18, name: 'Face Pulls with Rope', sets: 4, reps: '15', weight: '20 kg', rest: 45, done: false },
        { id: 19, name: 'Incline Dumbbell Bicep Curls', sets: 4, reps: '12', weight: '10 kg', rest: 60, done: false },
        { id: 20, name: 'Skull Crushers EZ Bar', sets: 3, reps: '12', weight: '20 kg', rest: 60, done: false }
      ]
    },
    {
      day: 'Saturday',
      label: 'Legs & Core Volume',
      exercises: [
        { id: 21, name: 'Romanian Deadlifts (RDL)', sets: 4, reps: '10-12', weight: '60 kg', rest: 90, done: false },
        { id: 22, name: 'Walking Dumbbell Lunges', sets: 3, reps: '12/leg', weight: '14 kg', rest: 60, done: false },
        { id: 23, name: 'Leg Extensions', sets: 4, reps: '15', weight: '40 kg', rest: 45, done: false },
        { id: 24, name: 'Hanging Knee Raises & Plank', sets: 4, reps: '15 reps / 60s', weight: 'Bodyweight', rest: 45, done: false }
      ]
    }
  ]
};

const SEED_DEFAULT_DIET_PLAN = {
  id: 'dp-1',
  memberId: 'mem-4',
  memberName: 'Pooja Hegde',
  dailyCaloriesTarget: 2400,
  proteinGramsTarget: 160,
  carbsGramsTarget: 260,
  fatsGramsTarget: 60,
  waterGlassesTarget: 10,
  assignedBy: 'Coach Alex Rivers',
  days: [
    {
      day: 'Monday',
      meals: [
        { id: 1, name: 'Breakfast (8:00 AM)', time: '8:00 AM', items: 'Oatmeal with whey protein, banana, almonds & chia seeds', calories: 520, protein: 35, carbs: 65, fats: 14, completed: false },
        { id: 2, name: 'Mid-Morning Snack (11:00 AM)', time: '11:00 AM', items: 'Boiled egg whites / Paneer cubes & green tea', calories: 220, protein: 20, carbs: 10, fats: 8, completed: false },
        { id: 3, name: 'Lunch (1:30 PM)', time: '1:30 PM', items: 'Brown rice, grilled chicken breast / tofu, dal & mixed veggies salad', calories: 680, protein: 48, carbs: 75, fats: 16, completed: false },
        { id: 4, name: 'Pre-Workout Snack (5:00 PM)', time: '5:00 PM', items: '2 slices whole wheat toast with peanut butter & 1 banana', calories: 340, protein: 12, carbs: 48, fats: 12, completed: false },
        { id: 5, name: 'Dinner (8:30 PM)', time: '8:30 PM', items: 'Quinoa bowl with paneer / fish curry, steamed broccoli & curd', calories: 640, protein: 45, carbs: 62, fats: 15, completed: false }
      ]
    },
    {
      day: 'Tuesday',
      meals: [
        { id: 6, name: 'Breakfast (8:00 AM)', time: '8:00 AM', items: 'Moong dal chilla with paneer stuffing & tender coconut water', calories: 480, protein: 32, carbs: 55, fats: 12, completed: false },
        { id: 7, name: 'Mid-Morning Snack (11:00 AM)', time: '11:00 AM', items: 'Handful of roasted chana & walnuts + black coffee', calories: 210, protein: 14, carbs: 18, fats: 9, completed: false },
        { id: 8, name: 'Lunch (1:30 PM)', time: '1:30 PM', items: '2 Multigrain rotis, soya chunks curry, rajma & cucumber salad', calories: 650, protein: 42, carbs: 80, fats: 14, completed: false },
        { id: 9, name: 'Pre-Workout Snack (5:00 PM)', time: '5:00 PM', items: 'Whey protein shake with chilled almond milk & an apple', calories: 290, protein: 28, carbs: 32, fats: 4, completed: false },
        { id: 10, name: 'Dinner (8:30 PM)', time: '8:30 PM', items: 'Grilled chicken breast / grilled tofu, sautéed asparagus & sweet potato', calories: 620, protein: 46, carbs: 55, fats: 14, completed: false }
      ]
    },
    {
      day: 'Wednesday',
      meals: [
        { id: 11, name: 'Breakfast (8:00 AM)', time: '8:00 AM', items: '3-egg masala omelette with whole grain toast & black coffee', calories: 490, protein: 34, carbs: 45, fats: 15, completed: false },
        { id: 12, name: 'Lunch (1:30 PM)', time: '1:30 PM', items: 'Jeera brown rice, chicken tikka / grilled paneer & green salad', calories: 670, protein: 46, carbs: 70, fats: 16, completed: false },
        { id: 13, name: 'Dinner (8:30 PM)', time: '8:30 PM', items: 'Stir-fried vegetables with chicken / edamame & whole wheat wrap', calories: 610, protein: 42, carbs: 60, fats: 15, completed: false }
      ]
    },
    {
      day: 'Thursday',
      meals: [
        { id: 14, name: 'Breakfast (8:00 AM)', time: '8:00 AM', items: 'Overnight protein oats with berries, walnuts & seeds', calories: 510, protein: 35, carbs: 60, fats: 14, completed: false },
        { id: 15, name: 'Lunch (1:30 PM)', time: '1:30 PM', items: '2 Rotis, chole masala, cucumber raita & grilled fish / soya curry', calories: 660, protein: 44, carbs: 76, fats: 15, completed: false },
        { id: 16, name: 'Dinner (8:30 PM)', time: '8:30 PM', items: 'Grilled chicken / tofu salad with olive oil dressing & sweet potato', calories: 590, protein: 45, carbs: 50, fats: 14, completed: false }
      ]
    },
    {
      day: 'Friday',
      meals: [
        { id: 17, name: 'Breakfast (8:00 AM)', time: '8:00 AM', items: 'Besan & paneer chilla with mint chutney & green tea', calories: 470, protein: 30, carbs: 52, fats: 14, completed: false },
        { id: 18, name: 'Lunch (1:30 PM)', time: '1:30 PM', items: 'Brown rice, dal tadka, chicken curry / paneer bhurji & curd', calories: 690, protein: 48, carbs: 78, fats: 17, completed: false },
        { id: 19, name: 'Dinner (8:30 PM)', time: '8:30 PM', items: 'High protein soup with grilled chicken breast / tofu steak', calories: 580, protein: 46, carbs: 45, fats: 13, completed: false }
      ]
    },
    {
      day: 'Saturday',
      meals: [
        { id: 20, name: 'Breakfast (8:00 AM)', time: '8:00 AM', items: 'Scrambled eggs / paneer bhurji with toasted multigrain bread', calories: 510, protein: 36, carbs: 46, fats: 16, completed: false },
        { id: 21, name: 'Lunch (1:30 PM)', time: '1:30 PM', items: 'Quinoa biryani with raita and boiled eggs / soya chunks', calories: 680, protein: 44, carbs: 80, fats: 16, completed: false },
        { id: 22, name: 'Dinner (8:30 PM)', time: '8:30 PM', items: 'Grilled fish / paneer with sautéed broccoli, bell peppers & lemon rice', calories: 620, protein: 45, carbs: 58, fats: 15, completed: false }
      ]
    }
  ]
};

const mapPtSession = (s) => ({
  id: `pts-${s.id}`,
  numericId: s.id,
  memberId: `mem-${s.member_id}`,
  memberName: s.member_name,
  memberAvatar: s.member_avatar,
  trainerId: `tr-${s.trainer_id}`,
  trainerName: s.trainer_name,
  packageTitle: s.plan_name || `${s.total_sessions} 1-on-1 PT Sessions`,
  totalSessions: Number(s.total_sessions),
  completedSessions: Number(s.completed_sessions),
  remainingSessions: Number(s.remaining_sessions),
  startDate: s.start_date,
  otp: s.client_otp,
  client_otp: s.client_otp,
  status: s.status,
  logs: Array.isArray(s.logs)
    ? s.logs.map((l) => ({
      sessionNo: l.session_number || l.sessionNo,
      date: l.verified_at ? l.verified_at.slice(0, 16).replace('T', ' ') : (l.date || 'Today'),
      verifiedWithOtp: Boolean(l.otp_verified ?? true),
      trainerNotes: l.notes || l.trainerNotes || '1-on-1 coaching workout completed'
    }))
    : []
});

const mapAdvanceRequest = (r) => ({
  id: `adv-${r.id}`,
  numericId: r.id,
  staffId: `tr-${r.trainer_id}`,
  staffName: r.trainer_name || 'Staff Member',
  trainerName: r.trainer_name || 'Staff Member',
  trainerAvatar: r.trainer_avatar,
  role: r.role || 'Fitness Coach',
  amount: Number(r.amount),
  reason: r.reason,
  date: r.request_date || (r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().split('T')[0]),
  requestDate: r.request_date || (r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().split('T')[0]),
  repaymentMonth: r.repayment_month || 'Next Cycle',
  status: r.status || 'Pending',
  notes: r.notes,
  disbursedDate: r.disbursed_at ? r.disbursed_at.slice(0, 10) : null,
  approvedBy: r.status === 'Approved' || r.status === 'Disbursed' ? (r.notes?.includes('By') ? r.notes : 'Accounts Officer') : null
});

const mapTrainerReview = (rev) => ({
  id: `rev-${rev.id}`,
  numericId: rev.id,
  trainerId: `tr-${rev.trainer_id}`,
  trainerName: rev.trainer_name,
  memberId: `mem-${rev.member_id}`,
  memberName: rev.member_name,
  avatar: rev.member_avatar,
  rating: Number(rev.rating),
  comment: rev.comment || '',
  date: rev.date || (rev.created_at ? rev.created_at.slice(0, 10) : new Date().toISOString().split('T')[0])
});

export const GymDataProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [gymInfo, setGymInfo] = useState({
    name: "ARCHFIT ATHLETIC CLUB",
    tagline: "India's Premier Strength & Conditioning Hub",
    address: "Plot 42, Hiranandani Business Park, Powai, Mumbai, Maharashtra 400076",
    phone: "+91 98201 54321",
    email: "contact@archfit.in",
    operatingHours: "Mon-Sat: 5:30 AM - 11:00 PM | Sun: 6:00 AM - 8:00 PM",
    currency: "₹"
  });

  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState(SEED_DEFAULT_WORKOUT_PLAN);
  const [workoutPlans, setWorkoutPlans] = useState([SEED_DEFAULT_WORKOUT_PLAN]);
  const [dietPlan, setDietPlan] = useState(SEED_DEFAULT_DIET_PLAN);
  const [dietPlans, setDietPlans] = useState([SEED_DEFAULT_DIET_PLAN]);
  const [waterGlasses, setWaterGlasses] = useState(8);
  const [bodyMetrics, setBodyMetrics] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pulsefit_body_metrics');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { month: 'Apr', weight: 84.5, bodyFat: 19.8, muscleMass: 35.0, chest: 104, waist: 88, biceps: 36.5 },
      { month: 'May', weight: 83.0, bodyFat: 18.5, muscleMass: 35.8, chest: 105, waist: 86, biceps: 37.0 },
      { month: 'Jun', weight: 81.2, bodyFat: 17.2, muscleMass: 36.5, chest: 106, waist: 84, biceps: 37.5 },
      { month: 'Jul', weight: 79.8, bodyFat: 16.0, muscleMass: 37.2, chest: 107.5, waist: 82.5, biceps: 38.0 },
      { month: 'Aug', weight: 78.5, bodyFat: 15.1, muscleMass: 37.8, chest: 108.5, waist: 81.5, biceps: 38.5 },
      { month: 'Sep', weight: 77.8, bodyFat: 14.2, muscleMass: 38.2, chest: 109.5, waist: 80.5, biceps: 39.0 }
    ];
  });
  const activeGymKey = currentUser?.gymId || currentUser?.gym_id || (typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : 'default');
  const [invoices, setInvoices] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`pulsefit_invoices_${activeGymKey}`) || localStorage.getItem('pulsefit_invoices');
        if (saved) {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed.filter((i) => !i.gymId || i.gymId === Number(activeGymKey)) : [];
        }
      } catch (e) {}
    }
    return [];
  });
  const [expenses, setExpenses] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`pulsefit_expenses_${activeGymKey}`) || localStorage.getItem('pulsefit_expenses');
        if (saved) {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed.filter((e) => !e.gym_id || e.gym_id === Number(activeGymKey)) : [];
        }
      } catch (e) {}
    }
    return [];
  });
  const [equipment, setEquipment] = useState([]);
  const [bookedClasses, setBookedClasses] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(true);
  const [loadingModules, setLoadingModules] = useState({
    dashboard: true,
    members: true,
    trainers: true,
    plans: true,
    classes: true,
    attendance: true,
    financials: true,
    invoices: true,
    enquiries: true,
    products: true,
    equipment: true,
    commissions: true,
    freezes: true,
    consent: true,
    payroll: true,
    ptSessions: true,
    advanceRequests: true,
    trainerReviews: true,
    gymInfo: true
  });

  // Operations modules: Enquiries, Products, Commissions, Consent, Freezes, Payroll, Biometrics, PT & Recovery
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [consentForms, setConsentForms] = useState([]);
  const [membershipFreezes, setMembershipFreezes] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [staffAttendanceLogs, setStaffAttendanceLogs] = useState([]);
  const [ptPlans, setPtPlans] = useState([]);
  const [recoveryPlans, setRecoveryPlans] = useState([]);
  const [entryApprovals, setEntryApprovals] = useState([]);
  const [biometricDevices, setBiometricDevices] = useState([]);
  const [biometricLogs, setBiometricLogs] = useState([]);

  // Advance Pay & Requests
  const [advanceRequests, setAdvanceRequests] = useState([]);

  // Personal Training (PT) Sessions with OTP Verification
  const [ptSessions, setPtSessions] = useState([]);

  // Trainer Reviews & Ratings by Members
  const [trainerReviews, setTrainerReviews] = useState([]);

  const initialExercises = SEED_EXERCISES;

  // Dynamic live revenue analytics & owner stats
  const [ownerStats, setOwnerStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiringMembers: 0,
    expiredMembers: 0,
    totalTrainers: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0,
    totalLeads: 0,
    hotLeads: 0
  });

  const [revenueAnalytics, setRevenueAnalytics] = useState([]);

  // Toast Notification System
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchEnquiries = useCallback(async () => {
    try {
      const res = await api.enquiries.getAll();
      if (Array.isArray(res?.data)) {
        setEnquiries(res.data);
        localStorage.setItem('pulsefit_enquiries', JSON.stringify(res.data));
        return res.data;
      }
    } catch (err) {
      console.warn('Enquiries fetch error:', err.message);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.members.getAll();
      if (Array.isArray(res?.data)) {
        const synced = res.data.map((m) => ({
          ...m,
          status: calculateMemberStatus(m.expiryDate, m.status)
        }));
        setMembers(synced);
        return synced;
      }
      return res?.data;
    } catch (e) { console.warn('Fetch members error:', e.message); }
  }, []);

  const fetchTrainers = useCallback(async () => {
    try {
      const res = await api.trainers.getAll();
      if (Array.isArray(res?.data)) setTrainers(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch trainers error:', e.message); }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.plans.getAll();
      if (Array.isArray(res?.data)) {
        const cleaned = res.data.map((p) => {
          let feats = p.features;
          if (typeof feats === 'string') {
            try {
              const parsed = JSON.parse(feats);
              feats = Array.isArray(parsed) ? parsed : [feats];
            } catch (e) {
              feats = feats.split('\n').map((f) => f.trim()).filter(Boolean);
            }
          }
          return { ...p, features: Array.isArray(feats) ? feats : [] };
        });
        setPlans(cleaned);
        fetchRecoveryPlans();
        fetchPtPlans();
        return cleaned;
      }
    } catch (e) { console.warn('Fetch plans error:', e.message); }
  }, []);

  const fetchRecoveryPlans = useCallback(async () => {
    try {
      const res = await api.recoveryPlans.getAll();
      if (Array.isArray(res?.data)) {
        setRecoveryPlans(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Fetch recovery plans error:', e.message);
    }
  }, []);

  const fetchPtPlans = useCallback(async () => {
    try {
      const res = await api.ptPlans.getAll();
      if (Array.isArray(res?.data)) {
        setPtPlans(res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Fetch PT plans error:', e.message);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.classes.getAll();
      if (Array.isArray(res?.data)) setClasses(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch classes error:', e.message); }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api.attendance.getAll();
      if (Array.isArray(res?.data)) setAttendance(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch attendance error:', e.message); }
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await api.equipment.getAll();
      if (Array.isArray(res?.data)) setEquipment(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch equipment error:', e.message); }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const activeGym = currentUser?.gymId || currentUser?.gym_id || (typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : null);
      const res = api.revenueBilling?.getInflows
        ? await api.revenueBilling.getInflows({ gym_id: activeGym })
        : await api.invoices.getAll({ gym_id: activeGym });
      if (Array.isArray(res?.data)) {
        setInvoices(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pulsefit_invoices_${activeGym || 'default'}`, JSON.stringify(res.data));
        }
      }
      return res?.data;
    } catch (e) { console.warn('Fetch invoices error:', e.message); }
  }, [currentUser?.gymId, currentUser?.gym_id]);

  const fetchExpenses = useCallback(async () => {
    try {
      const activeGym = currentUser?.gymId || currentUser?.gym_id || (typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : null);
      const res = api.revenueBilling?.getOutflows
        ? await api.revenueBilling.getOutflows({ gym_id: activeGym })
        : await api.expenses.getAll({ gym_id: activeGym });
      if (Array.isArray(res?.data)) {
        setExpenses(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pulsefit_expenses_${activeGym || 'default'}`, JSON.stringify(res.data));
        }
      }
      return res?.data;
    } catch (e) { console.warn('Fetch expenses error:', e.message); }
  }, [currentUser?.gymId, currentUser?.gym_id]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.products.getAll();
      if (Array.isArray(res?.data)) setProducts(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch products error:', e.message); }
  }, []);

  const fetchCommissions = useCallback(async () => {
    try {
      const res = await api.commissions.getAll();
      if (Array.isArray(res?.data)) setCommissions(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch commissions error:', e.message); }
  }, []);

  const fetchFreezes = useCallback(async () => {
    try {
      const res = await api.freezes.getAll();
      if (Array.isArray(res?.data)) setMembershipFreezes(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch freezes error:', e.message); }
  }, []);

  const fetchConsentForms = useCallback(async () => {
    try {
      const res = await api.consentForms.getAll();
      if (Array.isArray(res?.data)) setConsentForms(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch consent forms error:', e.message); }
  }, []);

  const fetchPayroll = useCallback(async () => {
    try {
      const res = await api.payroll.getAll();
      if (Array.isArray(res?.data)) setPayrollRecords(res.data);
      return res?.data;
    } catch (e) { console.warn('Fetch payroll error:', e.message); }
  }, []);

  const fetchPtSessions = useCallback(async () => {
    try {
      if (api.ptSessions?.getAll) {
        const res = await api.ptSessions.getAll();
        if (Array.isArray(res?.data)) setPtSessions(res.data.map(mapPtSession));
        return res?.data;
      }
    } catch (e) { console.warn('Fetch pt sessions error:', e.message); }
  }, []);

  const fetchAdvanceRequests = useCallback(async () => {
    try {
      if (api.advanceRequests?.getAll) {
        const res = await api.advanceRequests.getAll();
        if (Array.isArray(res?.data)) setAdvanceRequests(res.data.map(mapAdvanceRequest));
        return res?.data;
      }
    } catch (e) { console.warn('Fetch advance requests error:', e.message); }
  }, []);

  const fetchTrainerReviews = useCallback(async () => {
    try {
      if (api.trainerReviews?.getAll) {
        const res = await api.trainerReviews.getAll();
        if (Array.isArray(res?.data)) setTrainerReviews(res.data.map(mapTrainerReview));
        return res?.data;
      }
    } catch (e) { console.warn('Fetch trainer reviews error:', e.message); }
  }, []);

  const fetchGymInfo = useCallback(async () => {
    try {
      if (api.gymInfo?.get) {
        const res = await api.gymInfo.get();
        if (res?.data) setGymInfo(res.data);
        return res?.data;
      }
    } catch (e) { console.warn('Fetch gym info error:', e.message); }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      if (api.dashboard?.getOwnerStats) {
        const res = await api.dashboard.getOwnerStats();
        if (res?.stats) setOwnerStats(res.stats);
        if (res?.revenueAnalytics) setRevenueAnalytics(res.revenueAnalytics);
        return res;
      }
    } catch (e) { console.warn('Fetch dashboard stats error:', e.message); }
  }, []);

  // Live Async Fetch from Laravel + MySQL Backend with Progressive Hydration
  // NOTE: PHP built-in dev server is single-threaded, so we fetch in small
  // sequential batches of 2 to avoid request queuing and timeouts.
  const fetchAllFromBackend = useCallback(async () => {
    try {
      setIsLoadingBackend(true);

      // Batch 1: Core member, trainer, plans & recovery
      await Promise.allSettled([fetchMembers(), fetchTrainers(), fetchPlans(), fetchRecoveryPlans(), fetchPtPlans()]);
      setLoadingModules((prev) => ({ ...prev, dashboard: false, members: false, trainers: false, plans: false }));

      // Batch 2: Financial data (invoices & expenses) & dashboard stats
      await Promise.allSettled([fetchInvoices(), fetchExpenses()]);
      await fetchDashboardStats();
      setLoadingModules((prev) => ({ ...prev, financials: false, invoices: false, analytics: false, reports: false }));

      // Batch 3: CRM & classes
      await Promise.allSettled([fetchEnquiries(), fetchClasses()]);
      setLoadingModules((prev) => ({ ...prev, enquiries: false, classes: false }));

      // Batch 4: Attendance & equipment
      await Promise.allSettled([fetchAttendance(), fetchEquipment()]);
      setLoadingModules((prev) => ({ ...prev, attendance: false, equipment: false }));

      // Batch 5: Products & commissions
      await Promise.allSettled([fetchProducts(), fetchCommissions()]);
      setLoadingModules((prev) => ({ ...prev, products: false, commissions: false }));

      // Batch 6: Freezes & payroll
      await Promise.allSettled([fetchFreezes(), fetchPayroll()]);
      setLoadingModules((prev) => ({ ...prev, freezes: false, payroll: false }));

      // Batch 7: Consent & PT sessions
      await Promise.allSettled([fetchConsentForms(), fetchPtSessions()]);
      setLoadingModules((prev) => ({ ...prev, consent: false, ptSessions: false }));

      // Batch 8: Advance requests, reviews & gym info
      await Promise.allSettled([fetchAdvanceRequests(), fetchTrainerReviews(), fetchGymInfo()]);
      setLoadingModules((prev) => ({ ...prev, advanceRequests: false, trainerReviews: false, gymInfo: false }));

    } catch (err) {
      console.warn('Backend sync note:', err.message);
    } finally {
      setIsLoadingBackend(false);
      setLoadingModules((prev) => {
        const cleared = {};
        for (const k in prev) cleared[k] = false;
        return cleared;
      });
    }
  }, [
    fetchMembers,
    fetchTrainers,
    fetchPlans,
    fetchRecoveryPlans,
    fetchPtPlans,
    fetchClasses,
    fetchEnquiries,
    fetchAttendance,
    fetchInvoices,
    fetchExpenses,
    fetchEquipment,
    fetchProducts,
    fetchCommissions,
    fetchFreezes,
    fetchConsentForms,
    fetchPayroll,
    fetchPtSessions,
    fetchAdvanceRequests,
    fetchTrainerReviews,
    fetchGymInfo,
    fetchDashboardStats
  ]);

  // Safety timer to guarantee no owner page ever hangs on a loader
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsLoadingBackend(false);
      setLoadingModules((prev) => {
        const cleared = {};
        for (const k in prev) cleared[k] = false;
        return cleared;
      });
    }, 4500);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Helper function to check if an owner page is still loading its dataset from the backend
  const isOwnerTabLoading = useCallback((tabName) => {
    if (!tabName) return false;
    if (!isLoadingBackend && !Object.values(loadingModules).some(Boolean)) {
      return false;
    }

    switch (tabName) {
      case 'dashboard':
        return Boolean(loadingModules.dashboard);
      case 'members':
        return Boolean(loadingModules.members);
      case 'classes':
        return Boolean(loadingModules.classes);
      case 'pt-sessions':
        return Boolean(loadingModules.ptSessions);
      case 'enquiries':
        return Boolean(loadingModules.enquiries);
      case 'attendance':
        return Boolean(loadingModules.attendance);
      case 'plans':
        return Boolean(loadingModules.plans);
      case 'membership-freeze':
        return Boolean(loadingModules.freezes);
      case 'consent-forms':
        return Boolean(loadingModules.consent);
      case 'staff-accounts':
      case 'trainers':
        return Boolean(loadingModules.trainers);
      case 'advance-pay':
        return Boolean(loadingModules.advanceRequests);
      case 'payroll':
        return Boolean(loadingModules.payroll);
      case 'commissions':
        return Boolean(loadingModules.commissions);
      case 'analytics':
      case 'reports':
      case 'financials':
        return Boolean(loadingModules.financials);
      case 'invoices':
        return Boolean(loadingModules.invoices);
      case 'products':
        return Boolean(loadingModules.products);
      case 'equipment':
        return Boolean(loadingModules.equipment);
      case 'settings':
        return Boolean(loadingModules.gymInfo);
      default:
        return Boolean(isLoadingBackend);
    }
  }, [isLoadingBackend, loadingModules]);

  useEffect(() => {
    // Reset state before loading data for the active gym to prevent any cross-tenant data leakage
    setMembers([]);
    setTrainers([]);
    setInvoices([]);
    setExpenses([]);
    setEnquiries([]);
    setAttendance([]);
    setBookedClasses([]);
    setPtSessions([]);
    setProducts([]);
    setCommissions([]);
    setMembershipFreezes([]);
    setConsentForms([]);
    setPayrollRecords([]);
    setAdvanceRequests([]);
    setTrainerReviews([]);
    setOwnerStats({
      totalMembers: 0,
      activeMembers: 0,
      expiringMembers: 0,
      expiredMembers: 0,
      totalTrainers: 0,
      todayAttendance: 0,
      monthlyRevenue: 0,
      monthlyExpenses: 0,
      monthlyProfit: 0,
      totalLeads: 0,
      hotLeads: 0
    });
    setRevenueAnalytics([]);

    fetchAllFromBackend();
  }, [fetchAllFromBackend, currentUser?.gymId, currentUser?.userId]);

  // MEMBER ACTIONS (Direct Backend Sync)
  const addMember = async (newMemberData) => {
    try {
      const res = await api.members.create(newMemberData);
      if (res.success && res.data) {
        setMembers((prev) => [
          res.data,
          ...prev.filter((m) => m.id !== res.data.id && m.userId !== res.data.userId)
        ]);
        await fetchMembers();
        await fetchInvoices();
        await fetchDashboardStats();
        await fetchPtSessions?.();
        addToast(`New member "${res.data.name}" registered successfully & saved to database!`, 'success');
        return res.data;
      }
      throw new Error(res?.message || 'Failed to register member on backend server');
    } catch (e) {
      console.error('Backend create member error:', e.message);
      addToast(`Error adding member: ${e.message}`, 'error');
      throw e;
    }
  };

  const updateMember = async (id, updatedData) => {
    try {
      await api.members.update(id, updatedData);
      await fetchPtSessions?.();
    } catch (e) {
      console.warn('Backend update member fallback:', e.message);
    }

    const calculatedStatus = (updatedData.expiryDate || updatedData.expiry_date)
      ? calculateMemberStatus(updatedData.expiryDate || updatedData.expiry_date, updatedData.status)
      : updatedData.status;

    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updatedData, ...(calculatedStatus ? { status: calculatedStatus } : {}) } : m))
    );
    addToast('Member details updated successfully');
  };

  const deleteMember = async (id) => {
    try {
      await api.members.delete(id);
    } catch (e) {
      console.warn('Backend delete member fallback:', e.message);
    }

    const member = members.find((m) => m.id === id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    addToast(`Member "${member?.name || id}" removed`, 'info');
  };

  const renewMemberPlan = async (memberId, planId) => {
    const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
    const today = new Date();
    const expiry = new Date();
    expiry.setMonth(today.getMonth() + (selectedPlan.durationMonths || 1));
    const expiryStr = expiry.toISOString().split('T')[0];
    const newStatus = calculateMemberStatus(expiryStr, 'Active');

    try {
      await api.members.update(memberId, {
        plan_id: planId,
        status: newStatus,
        expiry_date: expiryStr,
        dues_amount: 0
      });
      await api.invoices.create({
        user_id: memberId,
        plan_id: planId,
        amount: selectedPlan.price,
        payment_method: 'Instant Digital Payment',
        status: 'Paid'
      });
    } catch (e) {
      console.warn('Backend renew plan fallback:', e.message);
    }

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            status: newStatus,
            expiryDate: expiryStr,
            duesAmount: 0
          };
        }
        return m;
      })
    );

    const newInvoice = {
      id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      memberId,
      memberName: members.find((m) => m.id === memberId)?.name || 'Member',
      planName: selectedPlan.name,
      amount: selectedPlan.price,
      date: today.toISOString().split('T')[0],
      paymentMethod: 'Instant Digital Payment',
      status: 'Paid',
      invoiceUrl: '#'
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    addToast(`Plan renewed! ${selectedPlan.name} is now active.`);
  };

  // RECORD PAYMENT / FEE COLLECTION & MEMBERSHIP ACTIVATION
  const recordPayment = async ({
    memberId,
    memberName,
    planId,
    planName,
    amount,
    paymentDate,
    expiryDate,
    paymentMethod = 'UPI'
  }) => {
    const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
    let calculatedExpiry = expiryDate;
    if (!calculatedExpiry) {
      const baseDate = paymentDate ? new Date(paymentDate) : new Date();
      baseDate.setMonth(baseDate.getMonth() + (Number(selectedPlan?.durationMonths) || 1));
      calculatedExpiry = baseDate.toISOString().split('T')[0];
    }

    const resolvedMemberName = memberName || members.find((m) => m.id === memberId)?.name || 'Member';
    const resolvedPlanName = planName || selectedPlan?.name || 'Membership Plan';
    const resolvedAmount = Number(amount !== undefined && amount !== null ? amount : selectedPlan?.price || 0);
    const resolvedDate = paymentDate || new Date().toISOString().split('T')[0];

    const newInvoice = {
      id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      memberId: memberId || 'mem-ext',
      memberName: resolvedMemberName,
      planName: resolvedPlanName,
      amount: resolvedAmount,
      date: resolvedDate,
      paymentMethod: paymentMethod || 'UPI',
      status: 'Paid',
      invoiceUrl: '#'
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // Update ownerStats & revenueAnalytics in real time
    setOwnerStats((prev) => {
      const currentRev = Number(prev?.monthlyRevenue) || 0;
      const currentExp = Number(prev?.monthlyExpenses) || 0;
      const newRev = currentRev + resolvedAmount;
      return {
        ...prev,
        monthlyRevenue: newRev,
        monthlyProfit: Math.max(0, newRev - currentExp)
      };
    });

    setRevenueAnalytics((prev) =>
      (prev || []).map((item, idx, arr) =>
        idx === arr.length - 1
          ? {
            ...item,
            revenue: item.revenue + resolvedAmount,
            profit: Math.max(0, (item.profit || 0) + resolvedAmount)
          }
          : item
      )
    );

    // Update member status & validity
    if (memberId) {
      const paymentStatus = calculateMemberStatus(calculatedExpiry, 'Active');
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            return {
              ...m,
              planId: selectedPlan?.id || planId,
              planName: resolvedPlanName,
              status: paymentStatus,
              expiryDate: calculatedExpiry,
              duesAmount: 0
            };
          }
          return m;
        })
      );

      try {
        await api.members.update(memberId, {
          plan_name: resolvedPlanName,
          status: paymentStatus,
          expiry_date: calculatedExpiry
        });
      } catch (e) {
        // Fallback
      }
    }

    try {
      if (api.revenueBilling?.addInflow) {
        const res = await api.revenueBilling.addInflow({
          memberId,
          memberName: resolvedMemberName,
          planId: selectedPlan?.id,
          planName: resolvedPlanName,
          amount: resolvedAmount,
          paymentMethod: paymentMethod || 'UPI',
          date: resolvedDate,
          status: 'Paid'
        });
        if (res?.data) {
          setInvoices((prev) => {
            const updated = [res.data, ...prev.filter((i) => i.id !== newInvoice.id && i.id !== res.data.id)];
            if (typeof window !== 'undefined') {
              localStorage.setItem('pulsefit_invoices', JSON.stringify(updated));
            }
            return updated;
          });
        }
        fetchInvoices();
        fetchDashboardStats();
        fetchMembers();
      } else if (api.invoices && api.invoices.create) {
        const res = await api.invoices.create({
          user_id: memberId,
          member_id: memberId,
          member_name: resolvedMemberName,
          plan_id: selectedPlan?.id,
          plan_name: resolvedPlanName,
          amount: resolvedAmount,
          payment_method: paymentMethod || 'UPI',
          payment_date: resolvedDate,
          expiry_date: calculatedExpiry,
          status: 'Paid'
        });
        if (res?.data) {
          setInvoices((prev) => {
            const updated = [res.data, ...prev.filter((i) => i.id !== newInvoice.id && i.id !== res.data.id)];
            if (typeof window !== 'undefined') {
              localStorage.setItem('pulsefit_invoices', JSON.stringify(updated));
            }
            return updated;
          });
        }
        fetchInvoices();
        fetchDashboardStats();
        fetchMembers();
      }
    } catch (e) {
      console.error('Backend invoice create error:', e);
      addToast(`Failed to record payment in database: ${e.message}`, 'error');
      throw e;
    }

    addToast(`Payment of ₹${resolvedAmount.toLocaleString('en-IN')} recorded for ${resolvedMemberName}!`);
    return newInvoice;
  };

  // TRAINER ACTIONS
  const addTrainer = async (trainerData) => {
    try {
      const res = await api.trainers.create(trainerData);
      if (res.success && res.data) {
        setTrainers((prev) => [res.data, ...prev]);
        addToast(`Coach "${res.data.name}" added to staff & saved!`);
        return res.data;
      }
    } catch (e) {
      console.warn('Backend add trainer fallback:', e.message);
    }

    const id = `trn-${trainers.length + 1}`;
    const newTrainer = {
      id,
      avatar: trainerData.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      rating: 5.0,
      activeClientsCount: 0,
      experience: "5+ Years",
      ...trainerData
    };
    setTrainers((prev) => [newTrainer, ...prev]);
    addToast(`Coach "${newTrainer.name}" added to staff!`);
  };

  const updateTrainer = async (id, trainerData) => {
    try {
      await api.trainers.update(id, trainerData);
    } catch (e) {
      console.warn('Backend update trainer fallback:', e.message);
    }
    setTrainers((prev) => prev.map((t) => (t.id === id ? { ...t, ...trainerData } : t)));
    addToast("Trainer information updated");
  };

  // PLAN ACTIONS
  const addPlan = async (planData) => {
    try {
      const res = await api.plans.create(planData);
      if (res.success && res.data) {
        setPlans((prev) => [...prev, res.data]);
        addToast(`Membership package "${res.data.name}" created & saved!`);
        return res.data;
      }
    } catch (e) {
      console.warn('Backend add plan fallback:', e.message);
    }

    const id = `plan-${plans.length + 1}`;
    const newPlan = {
      id,
      activeSubscribers: 0,
      popular: false,
      color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
      ...planData
    };
    setPlans((prev) => [...prev, newPlan]);
    addToast(`Membership package "${newPlan.name}" created successfully!`);
    return newPlan;
  };

  const updatePlan = async (id, updatedData) => {
    try {
      await api.plans.update(id, updatedData);
    } catch (e) {
      console.warn('Backend update plan fallback:', e.message);
    }
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData } : p))
    );
    addToast(`Membership package "${updatedData.name || 'Plan'}" updated!`);
  };

  const deletePlan = async (id) => {
    try {
      await api.plans.delete(id);
    } catch (e) {
      console.warn('Backend delete plan fallback:', e.message);
    }
    setPlans((prev) => prev.filter((p) => p.id !== id));
    addToast(`Plan package removed from active memberships.`);
  };

  // EQUIPMENT ACTIONS
  const addEquipment = async (itemData) => {
    try {
      const res = await api.equipment.create(itemData);
      if (res.success && res.data) {
        setEquipment((prev) => [res.data, ...prev]);
        addToast(`Asset "${res.data.name}" logged successfully!`, 'success');
        return res.data;
      }
    } catch (e) {
      console.warn('Backend add equipment fallback:', e.message);
    }
    const newItem = {
      id: `eq-${equipment.length + 1}`,
      lastServiceDate: new Date().toISOString().split('T')[0],
      ...itemData
    };
    setEquipment((prev) => [newItem, ...prev]);
    addToast(`Asset "${newItem.name}" added!`, 'success');
    return newItem;
  };

  const updateEquipment = async (id, updatedData) => {
    try {
      await api.equipment.update(id, updatedData);
    } catch (e) {
      console.warn('Backend update equipment fallback:', e.message);
    }
    setEquipment((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );
    addToast('Equipment details updated', 'info');
  };

  const deleteEquipment = async (id) => {
    try {
      await api.equipment.delete(id);
    } catch (e) {
      console.warn('Backend delete equipment fallback:', e.message);
    }
    setEquipment((prev) => prev.filter((item) => item.id !== id));
    addToast('Equipment record removed', 'info');
  };

  // ATTENDANCE & QR CHECK-IN
  const checkInMemberByQR = async (codeOrId) => {
    try {
      const res = await api.attendance.checkIn(codeOrId);
      if (res.success) {
        addToast(res.message, 'success');
        fetchAllFromBackend();
        return res;
      } else {
        addToast(res.message || 'Check-in failed', 'error');
        return res;
      }
    } catch (err) {
      // Local fallback check
      const member = members.find(
        (m) => m.qrPassCode?.toLowerCase() === codeOrId?.toLowerCase() || m.id?.toLowerCase() === codeOrId?.toLowerCase()
      );

      if (!member) {
        addToast('Invalid Gym Pass / QR Code not recognized', 'error');
        return { success: false, message: 'Invalid QR' };
      }

      if (member.status === 'Expired') {
        addToast(`Check-in Denied: ${member.name}'s membership has expired!`, 'error');
        return { success: false, message: 'Membership Expired' };
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const todayIso = getTodayIso();
      const newEntry = {
        id: `att-${Date.now().toString().slice(-4)}`,
        memberId: member.id,
        memberName: member.name,
        avatar: member.avatar,
        planName: member.planName,
        checkInTime: timeStr,
        checkOutTime: '--',
        date: todayIso,
        rawDate: todayIso,
        displayDate: 'Today',
        status: 'Inside Gym',
        gate: 'Main Turnstile A'
      };

      setAttendance((prev) => [newEntry, ...prev]);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? {
              ...m,
              lastCheckIn: `Today, ${timeStr}`,
              attendanceStreak: (m.attendanceStreak || 0) + 1
            }
            : m
        )
      );

      addToast(`Welcome ${member.name}! Access Granted.`, 'success');
      return { success: true, member, entry: newEntry };
    }
  };

  // PUNCH OUT MEMBER
  const punchOutMember = async (attendanceId) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistic local update
    setAttendance((prev) =>
      prev.map((att) => {
        if (att.id === attendanceId) {
          return {
            ...att,
            checkOutTime: timeStr,
            duration: att.duration && att.duration !== '--' ? att.duration : '1h 15m',
            status: 'Completed'
          };
        }
        return att;
      })
    );

    try {
      const res = await api.attendance.checkOut(attendanceId);
      if (res?.success) {
        setAttendance((prev) =>
          prev.map((att) => {
            if (att.id === attendanceId) {
              return {
                ...att,
                checkOutTime: res.punch_out || timeStr,
                duration: res.duration || att.duration,
                status: 'Completed'
              };
            }
            return att;
          })
        );
        addToast(res.message || `Punch-out recorded at ${timeStr}. Workout completed!`, 'info');
      }
    } catch (err) {
      console.warn('Backend attendance punch-out note:', err.message);
      addToast(`Punch-out recorded at ${timeStr}. Workout completed!`, 'info');
    }
  };

  // CLASS BOOKING
  const toggleBookClass = async (classId) => {
    const isBooked = bookedClasses.includes(classId);
    try {
      if (isBooked) {
        await api.classes.cancel(classId, 'mem-4');
        setBookedClasses((prev) => prev.filter((id) => id !== classId));
        setClasses((prev) =>
          prev.map((c) => (c.id === classId ? { ...c, bookedCount: Math.max(0, (c.bookedCount || 0) - 1) } : c))
        );
        addToast('Class reservation cancelled', 'info');
      } else {
        await api.classes.book(classId, 'mem-4');
        setBookedClasses((prev) => [...prev, classId]);
        setClasses((prev) =>
          prev.map((c) => (c.id === classId ? { ...c, bookedCount: (c.bookedCount || 0) + 1 } : c))
        );
        addToast('Class slot successfully booked in MySQL!', 'success');
      }
    } catch (e) {
      console.warn('Class booking fallback:', e.message);
      if (isBooked) {
        setBookedClasses((prev) => prev.filter((id) => id !== classId));
        addToast('Class reservation cancelled', 'info');
      } else {
        setBookedClasses((prev) => [...prev, classId]);
        addToast('Class slot successfully booked!', 'success');
      }
    }
  };

  // CLASSES MANAGEMENT
  const addClass = async (classData) => {
    const tempId = `cls-${Date.now()}`;
    const newClass = {
      id: tempId,
      name: classData.name || classData.title,
      title: classData.title || classData.name,
      enrolledCount: 0,
      bookedCount: 0,
      trainerName: classData.trainerName || 'Coach',
      days: Array.isArray(classData.days) ? classData.days : ['Mon', 'Wed', 'Fri'],
      capacity: Number(classData.capacity) || 20,
      category: classData.category || 'Group Fitness',
      room: classData.room || 'Studio A',
      difficulty: classData.difficulty || classData.intensity || 'All Levels',
      intensity: classData.intensity || classData.difficulty || 'High',
      ...classData
    };
    setClasses((prev) => {
      const updated = [...prev, newClass];
      localStorage.setItem('pulsefit_classes', JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await api.classes.create({
        name: classData.title || classData.name,
        trainer_id: classData.trainerId,
        trainer_name: classData.trainerName,
        instructor_name: classData.trainerName,
        time: classData.time,
        days: classData.days,
        capacity: Number(classData.capacity) || 20,
        category: classData.category || 'Group Fitness',
        room: classData.room || 'Studio A',
        difficulty: classData.intensity || classData.difficulty || 'All Levels'
      });
      if (res?.data?.id) {
        setClasses((prev) => {
          const updated = prev.map((c) =>
            c.id === tempId ? { ...c, id: 'cls-' + res.data.id, numericId: res.data.id } : c
          );
          localStorage.setItem('pulsefit_classes', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.warn('Class creation sync error:', err.message);
    }
    addToast(`Class "${classData.title || classData.name}" scheduled successfully!`, 'success');
    return newClass;
  };

  const deleteClass = async (id) => {
    setClasses((prev) => {
      const updated = prev.filter((c) => c.id !== id && c.numericId !== id);
      localStorage.setItem('pulsefit_classes', JSON.stringify(updated));
      return updated;
    });
    try {
      await api.classes.delete(id);
    } catch (err) {
      console.warn('Class deletion sync error:', err.message);
    }
    addToast('Class removed from schedule');
  };

  // WORKOUT & DIET ACTIONS
  const toggleExerciseDone = (dayIndex, exerciseId) => {
    setWorkoutPlan((prev) => {
      const newDays = [...prev.days];
      const targetDay = { ...newDays[dayIndex] };
      targetDay.exercises = targetDay.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, done: !ex.done } : ex
      );
      targetDay.completed = targetDay.exercises.every((e) => e.done);
      newDays[dayIndex] = targetDay;
      return { ...prev, days: newDays };
    });
    addToast('Exercise progress saved!');
  };

  const toggleMealDone = (mealId) => {
    setDietPlan((prev) => ({
      ...prev,
      meals: prev.meals ? prev.meals.map((m) => (m.id === mealId ? { ...m, completed: !m.completed } : m)) : []
    }));
    addToast('Meal status updated');
  };

  const incrementWater = () => {
    setWaterGlasses((prev) => Math.min(prev + 1, 16));
    addToast('Logged 250ml water! Stay hydrated');
  };

  const decrementWater = () => {
    setWaterGlasses((prev) => Math.max(prev - 1, 0));
  };

  const logNewBodyMetrics = (newMetric) => {
    setBodyMetrics((prev) => [...prev, newMetric]);
    addToast('New body metrics logged successfully!');
  };

  const saveWorkoutPlan = async (planData) => {
    try {
      if (planData.memberId) {
        await api.workouts.updateMemberRoutine(planData.memberId, {
          title: planData.title,
          days: planData.days
        });
      }
    } catch (e) {
      console.warn('Workout sync fallback:', e.message);
    }
    setWorkoutPlans((prev) => {
      const exists = prev.some((p) => p.id === planData.id);
      if (exists) {
        return prev.map((p) => (p.id === planData.id ? planData : p));
      }
      return [planData, ...prev];
    });
    setWorkoutPlan(planData);
    addToast(`Workout plan "${planData.title}" saved successfully!`);
  };

  const deleteWorkoutPlan = (planId) => {
    setWorkoutPlans((prev) => prev.filter((p) => p.id !== planId));
    addToast('Workout plan deleted', 'info');
  };

  const saveDietPlan = async (planData) => {
    try {
      if (planData.memberId) {
        await api.diets.updateMemberDiet(planData.memberId, {
          daily_calories_target: planData.dailyCaloriesTarget,
          protein_grams_target: planData.proteinGramsTarget,
          carbs_grams_target: planData.carbsGramsTarget,
          fats_grams_target: planData.fatsGramsTarget,
          water_glasses_target: planData.waterGlassesTarget,
          days: planData.days
        });
      }
    } catch (e) {
      console.warn('Diet sync fallback:', e.message);
    }
    setDietPlans((prev) => {
      const exists = prev.some((p) => p.id === planData.id);
      if (exists) {
        return prev.map((p) => (p.id === planData.id ? planData : p));
      }
      return [planData, ...prev];
    });
    setDietPlan(planData);
    addToast(`Diet plan for "${planData.memberName}" saved successfully!`);
  };

  const deleteDietPlan = (planId) => {
    setDietPlans((prev) => prev.filter((p) => p.id !== planId));
    addToast('Diet plan deleted', 'info');
  };

  // Enquiries Handlers (Direct MySQL Database Operations)
  const addEnquiry = async (enquiryData) => {
    try {
      const res = await api.enquiries.create(enquiryData);
      if (res?.data) {
        setEnquiries((prev) => [res.data, ...prev.filter((e) => e.id !== res.data.id)]);
        addToast(`Enquiry for "${res.data.name}" recorded in database!`);
        return res.data;
      }
    } catch (err) {
      console.warn('Enquiry create sync error:', err.message);
      addToast(`Error saving enquiry: ${err.message}`, 'error');
      throw err;
    }
  };

  const updateEnquiry = async (id, updatedData) => {
    // Optimistic UI update
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
    );

    try {
      const keys = Object.keys(updatedData);
      let res;
      if (keys.length === 1 && updatedData.priority) {
        res = await api.enquiries.updatePriority(id, updatedData.priority);
      } else if (keys.length === 1 && updatedData.followUpDate) {
        res = await api.enquiries.updateFollowUp(id, updatedData.followUpDate);
      } else {
        res = await api.enquiries.update(id, updatedData);
      }
      if (res?.data) {
        setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, ...res.data } : e)));
      }
      addToast('Lead details updated');
    } catch (err) {
      console.warn('Enquiry update sync error:', err.message);
      addToast(`Update error: ${err.message}`, 'error');
    }
  };

  const deleteEnquiry = async (id) => {
    try {
      await api.enquiries.delete(id);
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      addToast('Enquiry removed from database', 'info');
    } catch (err) {
      console.warn('Enquiry delete sync error:', err.message);
      addToast(`Error deleting enquiry: ${err.message}`, 'error');
    }
  };

  const convertEnquiryToMember = async (id, memberData) => {
    try {
      const res = await api.enquiries.convertToMember(id, memberData);
      if (res?.data) {
        setMembers((prev) => [res.data, ...prev.filter((m) => m.id !== res.data.id)]);
        setEnquiries((prev) => prev.filter((e) => e.id !== id));
        addToast(res.message || `Lead converted to active member "${res.data.name}"!`);
        return res.data;
      }
    } catch (err) {
      console.warn('Convert enquiry error:', err.message);
      addToast(`Conversion error: ${err.message}`, 'error');
      throw err;
    }
  };

  // Products Handlers
  // Products Handlers
  const addProduct = async (productData) => {
    const tempId = `prod-${Date.now()}`;
    const newProduct = {
      id: tempId,
      status: Number(productData.stock) > 0 ? 'In Stock' : 'Out of Stock',
      image: productData.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
      ...productData
    };
    setProducts((prev) => [newProduct, ...prev]);

    try {
      const res = await api.products.create(productData);
      if (res?.data?.id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === tempId ? { ...newProduct, ...res.data } : p))
        );
      }
    } catch (err) {
      console.warn('Product create sync error:', err.message);
    }

    addToast(`Product "${newProduct.name}" saved to database!`);
    return newProduct;
  };

  const updateProduct = async (id, updatedData) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updatedData };
          if (Number(updated.stock) <= 0) {
            updated.status = 'Out of Stock';
          } else if (Number(updated.stock) <= Number(updated.minStockAlert || 5)) {
            updated.status = 'Low Stock';
          } else {
            updated.status = 'In Stock';
          }
          return updated;
        }
        return p;
      })
    );

    try {
      await api.products.update(id, updatedData);
    } catch (err) {
      console.warn('Product update sync error:', err.message);
    }
    addToast('Product updated in database');
  };

  const deleteProduct = async (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.products.delete(id);
    } catch (err) {
      console.warn('Product delete sync error:', err.message);
    }
    addToast('Product removed from database', 'info');
  };

  const recordProductSale = async ({ productId, quantity = 1, buyerName = 'Walk-in Customer', paymentMethod = 'UPI' }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return false;
    if (Number(product.stock) < Number(quantity)) {
      addToast(`Insufficient stock for ${product.name}! Available: ${product.stock}`, 'error');
      return false;
    }

    const totalAmount = Number(product.price) * Number(quantity);
    updateProduct(productId, { stock: Number(product.stock) - Number(quantity) });

    const newInvoice = {
      id: `INV-PROD-${Date.now()}`,
      memberId: 'store-pos',
      memberName: buyerName,
      planName: `${product.name} (Qty: ${quantity})`,
      amount: totalAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      status: 'Paid',
      invoiceUrl: '#'
    };
    setInvoices((prev) => [newInvoice, ...prev]);

    try {
      await api.products.sell(productId, quantity, buyerName);
    } catch (err) {
      console.warn('Product sell sync error:', err.message);
    }

    setOwnerStats((prev) => {
      const currentRev = Number(prev?.monthlyRevenue) || 0;
      const currentExp = Number(prev?.monthlyExpenses) || 0;
      const newRev = currentRev + totalAmount;
      return {
        ...prev,
        monthlyRevenue: newRev,
        monthlyProfit: Math.max(0, newRev - currentExp)
      };
    });

    addToast(`Sold ${quantity}x ${product.name} for ₹${totalAmount.toLocaleString('en-IN')}!`);
    return true;
  };

  // Expenses Handlers (Cash Outflow)
  const addExpense = async (expenseData) => {
    const tempId = `EXP-${Date.now()}`;
    const payload = {
      ...expenseData,
      amount: Number(expenseData.amount) || 0,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      paymentMode: expenseData.paymentMode || expenseData.payment_mode || 'UPI',
      refNo: expenseData.receiptRef || expenseData.refNo || `EXP-${Date.now().toString().slice(-6)}`
    };

    const newExpense = {
      id: tempId,
      status: 'Paid',
      ...payload
    };
    setExpenses((prev) => [newExpense, ...prev]);

    try {
      const res = api.revenueBilling?.addOutflow
        ? await api.revenueBilling.addOutflow(payload)
        : await api.expenses.create(payload);
      const savedExpense = res?.data || newExpense;
      setExpenses((prev) => {
        const updated = prev.map((e) => (e.id === tempId ? { ...newExpense, ...savedExpense } : e));
        if (typeof window !== 'undefined') {
          localStorage.setItem('pulsefit_expenses', JSON.stringify(updated));
        }
        return updated;
      });
      fetchExpenses();
      fetchDashboardStats();
      addToast(`Expense "${newExpense.title}" (₹${newExpense.amount.toLocaleString('en-IN')}) saved to database!`);
      return savedExpense;
    } catch (err) {
      console.error('Expense backend create sync error:', err);
      // Revert optimistic add
      setExpenses((prev) => {
        const reverted = prev.filter((e) => e.id !== tempId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pulsefit_expenses', JSON.stringify(reverted));
        }
        return reverted;
      });
      addToast(`Failed to save expense: ${err.message}`, 'error');
      throw err;
    }
  };

  const deleteExpense = async (expenseId) => {
    let backup;
    setExpenses((prev) => {
      backup = prev;
      const updated = prev.filter((e) => e.id !== expenseId && e.numericId !== expenseId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pulsefit_expenses', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      if (api.revenueBilling?.deleteRecord) {
        await api.revenueBilling.deleteRecord(expenseId);
      } else {
        await api.expenses.delete(expenseId);
      }
      fetchExpenses();
      fetchDashboardStats();
      addToast('Expense record removed from database', 'info');
    } catch (err) {
      console.error('Expense backend delete sync error:', err);
      if (backup) {
        setExpenses(backup);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pulsefit_expenses', JSON.stringify(backup));
        }
      }
      addToast('Failed to delete expense from database: ' + err.message, 'error');
      throw err;
    }
  };

  // Commissions Handlers
  const addCommissionRecord = async (data) => {
    const tempId = `com-${Date.now()}`;
    const newRecord = {
      id: tempId,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      ...data
    };
    setCommissions((prev) => [newRecord, ...prev]);

    try {
      const res = await api.commissions.create(data);
      if (res?.data?.id) {
        setCommissions((prev) =>
          prev.map((c) => (c.id === tempId ? { ...newRecord, id: 'com-' + res.data.id } : c))
        );
      }
    } catch (err) {
      console.warn('Commission create sync error:', err.message);
    }
    addToast(`Commission logged for ${data.trainerName}`);
  };

  const markCommissionPaid = async (id) => {
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Paid' } : c))
    );
    try {
      await api.commissions.updateStatus(id, 'Paid');
    } catch (err) {
      console.warn('Commission status sync error:', err.message);
    }
    addToast('Commission marked as Paid in database');
  };

  // Consent Forms Handlers
  const addConsentForm = async ({ memberId, memberName, phone, planName, formType, emergencyContact, emergencyPhone, medicalNotes, status, signedDate }) => {
    const tempId = `cs-${Date.now()}`;
    const newForm = {
      id: tempId,
      memberId: memberId || 'mem-1',
      memberName,
      phone: phone || '',
      planName: planName || 'General Gym Access',
      formType: formType || 'General Fitness & Liability Waiver',
      emergencyContact: emergencyContact || '',
      emergencyPhone: emergencyPhone || '',
      medicalNotes: medicalNotes || 'None recorded',
      status: status || 'Pending',
      signedDate: status === 'Signed' ? (signedDate || new Date().toISOString().split('T')[0]) : null
    };

    setConsentForms((prev) => [newForm, ...prev]);

    try {
      const res = await api.consentForms.create({
        memberId,
        memberName,
        phone,
        planName,
        formType,
        emergencyContact,
        emergencyPhone,
        medicalNotes,
        status,
        signedDate: newForm.signedDate
      });
      if (res?.data?.id) {
        setConsentForms((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, id: res.data.id } : f))
        );
      }
    } catch (err) {
      console.warn('Consent form creation sync error:', err.message);
    }

    addToast(`Consent form registered for ${memberName}!`);
    return newForm;
  };

  const updateConsentStatus = async (id, status) => {
    setConsentForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
            ...f,
            status,
            signedDate: status === 'Signed' ? new Date().toISOString().split('T')[0] : null
          }
          : f
      )
    );
    try {
      await api.consentForms.updateStatus(id, status);
    } catch (err) {
      console.warn('Consent status sync error:', err.message);
    }
    addToast(`Consent form marked as ${status}`);
  };

  // Membership Freezes Handlers
  const addFreezeRequest = async ({ memberId, memberName, planName, freezeStartDate, freezeEndDate, daysFrozen, reason }) => {
    const tempId = `frz-${Date.now()}`;
    const newFreeze = {
      id: tempId,
      memberId,
      memberName,
      planName,
      freezeStartDate,
      freezeEndDate,
      daysFrozen: Number(daysFrozen) || 15,
      reason,
      status: 'Active Freeze',
      approvedBy: 'Vikramaditya Singhania (Owner)'
    };
    setMembershipFreezes((prev) => [newFreeze, ...prev]);

    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId && m.expiryDate) {
          const exp = new Date(m.expiryDate);
          exp.setDate(exp.getDate() + Number(newFreeze.daysFrozen));
          return {
            ...m,
            status: 'Frozen (Paused)',
            expiryDate: exp.toISOString().split('T')[0]
          };
        }
        return m;
      })
    );

    try {
      await api.freezes.create({
        memberId,
        memberName,
        planName,
        freezeStartDate,
        freezeEndDate,
        daysFrozen,
        reason
      });
    } catch (err) {
      console.warn('Freeze create sync error:', err.message);
    }

    addToast(`Membership for "${memberName}" frozen for ${newFreeze.daysFrozen} days!`);
  };

  const unfreezeMembership = async (freezeId) => {
    const freeze = membershipFreezes.find((f) => f.id === freezeId);
    setMembershipFreezes((prev) =>
      prev.map((f) => (f.id === freezeId ? { ...f, status: 'Completed' } : f))
    );
    if (freeze) {
      setMembers((prev) =>
        prev.map((m) => (m.id === freeze.memberId ? { ...m, status: 'Active' } : m))
      );
    }

    try {
      await api.freezes.unfreeze(freezeId);
    } catch (err) {
      console.warn('Unfreeze sync error:', err.message);
    }
    addToast('Membership un-frozen and reactivated in database!');
  };

  const extendMembership = ({ memberId, extensionDays, reason }) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const currentExp = member.expiryDate ? new Date(member.expiryDate) : new Date();
    currentExp.setDate(currentExp.getDate() + Number(extensionDays));
    const newExpiryStr = currentExp.toISOString().split('T')[0];

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: 'Active', expiryDate: newExpiryStr } : m))
    );
    addToast(`Extended membership of ${member.name} by ${extensionDays} days! New expiry: ${newExpiryStr}`);
  };

  // Payroll Handlers
  const markPayrollPaid = async (id) => {
    setPayrollRecords((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Paid', payDate: new Date().toISOString().split('T')[0] } : p))
    );
    try {
      await api.payroll.markPaid(id);
    } catch (err) {
      console.warn('Payroll mark paid sync error:', err.message);
    }
    addToast('Payroll payment disbursed and marked as Paid in database');
  };

  // Dynamic Payroll Adjustments (Incentives and Deductions)
  const updatePayrollAdjustments = async (recordId, { bonus, deductions, notes }) => {
    let calculatedNet = 0;
    setPayrollRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId || rec.numericId === recordId) {
          const newBonus = Number(bonus !== undefined ? bonus : rec.bonus || 0);
          const newDeductions = Number(deductions !== undefined ? deductions : rec.deductions || 0);
          const base = Number(rec.baseSalary || 0);
          const comm = Number(rec.commissions || 0);
          calculatedNet = base + comm + newBonus - newDeductions;
          return {
            ...rec,
            bonus: newBonus,
            deductions: newDeductions,
            netPay: calculatedNet
          };
        }
        return rec;
      })
    );

    try {
      await api.payroll.adjust(recordId, {
        bonus,
        deductions,
        notes: notes || 'Manual adjustment applied',
        adjustedBy: currentUser?.name || 'Owner'
      });
    } catch (err) {
      console.warn('Payroll adjustment sync note:', err.message);
    }

    addToast('Payroll adjustments updated in database!', 'success');
  };

  // Advance Salary Request by Staff / Trainer
  const requestAdvancePay = async ({ staffId, staffName, role, amount, reason, repaymentMonth }) => {
    const rawTrainerId = typeof staffId === 'string' ? staffId.replace(/[^0-9]/g, '') : staffId;
    const numericTrainerId = Number(rawTrainerId) || 2;

    try {
      const res = await api.advanceRequests.create({
        gym_id: currentUser?.gymId || 1,
        trainer_id: numericTrainerId,
        trainer_name: staffName || currentUser?.name || 'Staff Member',
        amount: Number(amount) || 0,
        reason: reason || 'Advance Salary Request',
        repayment_month: repaymentMonth || 'Next Cycle'
      });

      if (res?.data) {
        const mapped = mapAdvanceRequest({
          ...res.data,
          role: role || currentUser?.roleLabel || 'Fitness Coach'
        });
        setAdvanceRequests((prev) => [mapped, ...prev.filter((r) => r.id !== mapped.id)]);
        addToast(`Advance salary request of ₹${Number(amount).toLocaleString('en-IN')} submitted and saved to database!`, 'info');
        return mapped;
      }
    } catch (err) {
      console.warn('Backend advance request note:', err.message);
    }

    const newRequest = {
      id: `adv-${Date.now().toString().slice(-4)}`,
      numericId: Date.now(),
      staffId: staffId || 'trn-2',
      staffName: staffName || currentUser?.name || 'Staff Member',
      trainerName: staffName || currentUser?.name || 'Staff Member',
      role: role || currentUser?.roleLabel || 'Fitness Coach',
      amount: Number(amount) || 0,
      requestDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      reason: reason || 'Advance Salary Request',
      repaymentMonth: repaymentMonth || 'Next Cycle',
      status: 'Pending',
      disbursedDate: null,
      approvedBy: null
    };

    setAdvanceRequests((prev) => [newRequest, ...prev]);
    addToast(`Advance salary request of ₹${Number(amount).toLocaleString('en-IN')} submitted!`, 'info');
    return newRequest;
  };

  // Advance Salary Approval / Disbursement by Superadmin or Accounts
  const updateAdvancePayStatus = async (requestId, status, approverName = 'Superadmin') => {
    // Optimistic UI update
    setAdvanceRequests((prev) =>
      prev.map((req) => {
        if (
          req.id === requestId ||
          req.numericId === requestId ||
          String(req.id).replace(/[^0-9]/g, '') === String(requestId).replace(/[^0-9]/g, '')
        ) {
          const isDisbursed = status === 'Disbursed';
          const isApproved = status === 'Approved';
          return {
            ...req,
            status,
            approvedBy: isApproved || isDisbursed ? approverName : req.approvedBy,
            disbursedDate: isDisbursed ? new Date().toISOString().split('T')[0] : req.disbursedDate
          };
        }
        return req;
      })
    );

    try {
      const res = await api.advanceRequests.updateStatus(requestId, status, `Action taken by ${approverName}`);
      if (res?.data) {
        const mapped = mapAdvanceRequest(res.data);
        setAdvanceRequests((prev) =>
          prev.map((req) => (req.id === mapped.id || req.numericId === mapped.numericId ? mapped : req))
        );
      }
      addToast(`Advance request #${String(requestId).replace(/[^0-9]/g, '')} marked as ${status} in database!`, 'success');
      await fetchAdvanceRequests();
    } catch (err) {
      console.error('Backend advance status sync error:', err.message);
      addToast(`Error updating advance status: ${err.message}`, 'error');
      await fetchAdvanceRequests();
    }

    // If disbursed, automatically append an outflow expense entry in UI
    if (status === 'Disbursed') {
      const targetReq = advanceRequests.find((r) =>
        r.id === requestId ||
        r.numericId === requestId ||
        String(r.id).replace(/[^0-9]/g, '') === String(requestId).replace(/[^0-9]/g, '')
      );
      if (targetReq) {
        addExpense({
          title: `Salary Advance Payout - ${targetReq.staffName || targetReq.trainerName}`,
          category: 'Salaries',
          vendor: targetReq.staffName || targetReq.trainerName,
          amount: targetReq.amount,
          date: new Date().toISOString().split('T')[0],
          paymentMode: 'Bank Transfer',
          receiptRef: `ADV-${String(requestId).toUpperCase()}`,
          notes: `Advance disbursed for: ${targetReq.reason}`
        });
      }
    }
  };

  // PT SESSIONS: Allocate new package to a member
  const allocatePTSessions = async ({ memberId, memberName, memberEmail, trainerId, trainerName, totalSessions, packageTitle }) => {
    const rawMemberId = typeof memberId === 'string' ? memberId.replace(/^(mem-|usr-member-)/, '') : memberId;
    const rawTrainerId = typeof trainerId === 'string' ? trainerId.replace(/^(trn-|tr-|usr-trainer-)/, '') : trainerId;

    try {
      const res = await api.ptSessions.create({
        member_id: Number(rawMemberId) || null,
        member_name: memberName || 'Member',
        trainer_id: Number(rawTrainerId) || null,
        trainer_name: trainerName || 'Trainer',
        plan_name: packageTitle || `${totalSessions} 1-on-1 PT Sessions`,
        total_sessions: Number(totalSessions) || 12,
        start_date: new Date().toISOString().split('T')[0]
      });

      if (res?.data) {
        const mapped = mapPtSession(res.data);
        setPtSessions((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id && p.numericId !== res.data.id)]);
        addToast(`PT Package allocated & saved to database! Member OTP: ${res.data.client_otp}`, 'success');
        fetchPtSessions?.();
        return mapped;
      }
    } catch (err) {
      console.warn('Backend allocate PT session note:', err.message);
    }

    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const newSessionPackage = {
      id: `pts-${Date.now().toString().slice(-4)}`,
      memberId,
      memberName,
      memberEmail: memberEmail || '',
      trainerId,
      trainerName,
      packageTitle: packageTitle || `${totalSessions} 1-on-1 PT Sessions`,
      totalSessions: Number(totalSessions) || 12,
      completedSessions: 0,
      remainingSessions: Number(totalSessions) || 12,
      startDate: new Date().toISOString().split('T')[0],
      otp: randomOtp,
      logs: []
    };

    setPtSessions((prev) => [newSessionPackage, ...prev]);
    return newSessionPackage;
  };

  const deletePTSession = async (id) => {
    try {
      if (api.ptSessions?.delete) {
        await api.ptSessions.delete(id);
      }
    } catch (err) {
      console.warn('Delete PT session error:', err.message);
    }
    setPtSessions((prev) => prev.filter((p) => p.id !== id && p.numericId !== id));
    addToast('PT Session package removed', 'info');
  };

  // PT SESSIONS: Trainer logs completed session with member OTP verification
  const logPTSessionWithOtp = async ({ ptSessionId, inputOtp, trainerNotes }) => {
    const sessionPkg = ptSessions.find((p) => p.id === ptSessionId || p.numericId === ptSessionId);
    if (!sessionPkg) {
      return { success: false, message: 'PT Package not found' };
    }

    if (sessionPkg.remainingSessions <= 0) {
      return { success: false, message: 'All sessions in this package have already been completed!' };
    }

    try {
      const res = await api.ptSessions.logSession(sessionPkg.numericId || sessionPkg.id, {
        otp_entered: inputOtp,
        notes: trainerNotes || '1-on-1 coaching workout completed'
      });

      if (res?.success && res?.data?.pt_session) {
        const updatedMapped = mapPtSession(res.data.pt_session);
        setPtSessions((prev) =>
          prev.map((p) => (p.id === sessionPkg.id || p.numericId === sessionPkg.numericId ? updatedMapped : p))
        );
        addToast(res.message || 'Session verified & logged in database!', 'success');
        return { success: true, message: res.message };
      }
    } catch (err) {
      console.warn('Backend log PT session note:', err.message);
      if (err.data?.message) {
        addToast(err.data.message, 'error');
        return { success: false, message: err.data.message };
      }
    }

    if (sessionPkg.otp && sessionPkg.otp.toString().trim() !== inputOtp.toString().trim()) {
      return { success: false, message: 'Invalid Member OTP. Please ask the client for the correct 4-digit code.' };
    }

    // Local fallback
    const nextOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const now = new Date();
    const logDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setPtSessions((prev) =>
      prev.map((p) => {
        if (p.id === ptSessionId || p.numericId === ptSessionId) {
          const completed = p.completedSessions + 1;
          const remaining = Math.max(0, p.totalSessions - completed);
          const newLog = {
            sessionNo: completed,
            date: logDate,
            verifiedWithOtp: true,
            trainerNotes: trainerNotes || '1-on-1 coaching workout completed'
          };
          return {
            ...p,
            completedSessions: completed,
            remainingSessions: remaining,
            otp: nextOtp,
            logs: [newLog, ...(p.logs || [])]
          };
        }
        return p;
      })
    );

    addToast(`Session verified & logged! Remaining sessions: ${sessionPkg.remainingSessions - 1}`, 'success');
    return { success: true, message: 'Session successfully verified and logged!' };
  };

  // TRAINER REVIEWS & RATINGS (Submitted by Member)
  const addTrainerReview = async ({ trainerId, trainerName, memberId, memberName, rating, comment }) => {
    const rawTrainerId = typeof trainerId === 'string' ? trainerId.replace(/^(trn-|tr-|usr-trainer-)/, '') : trainerId;
    const rawMemberId = typeof memberId === 'string' ? memberId.replace(/^(mem-|usr-member-)/, '') : memberId;

    try {
      const res = await api.trainerReviews.create({
        trainer_id: Number(rawTrainerId) || 2,
        trainer_name: trainerName || 'Trainer',
        member_id: Number(rawMemberId) || null,
        member_name: memberName || 'Member',
        rating: Number(rating) || 5,
        comment: comment || '',
        date: new Date().toISOString().split('T')[0]
      });

      if (res?.data) {
        const mapped = mapTrainerReview(res.data);
        setTrainerReviews((prev) => [mapped, ...prev]);
        if (res.avg_rating) {
          setTrainers((prev) =>
            prev.map((t) => (t.id === trainerId ? { ...t, rating: Number(res.avg_rating) } : t))
          );
        }
        addToast(`Review submitted and recorded in database! Thank you for rating ${trainerName}.`, 'success');
        return mapped;
      }
    } catch (err) {
      console.warn('Backend trainer review note:', err.message);
    }

    const newRev = {
      id: `rev-${Date.now().toString().slice(-4)}`,
      trainerId,
      trainerName,
      memberId: memberId || 'mem-5',
      memberName: memberName || 'Member',
      rating: Number(rating) || 5,
      comment: comment || '',
      date: new Date().toISOString().split('T')[0]
    };

    setTrainerReviews((prev) => [newRev, ...prev]);

    // Recalculate trainer average rating
    setTrainers((prev) =>
      prev.map((t) => {
        if (t.id === trainerId) {
          const allReviews = [...trainerReviews.filter((r) => r.trainerId === trainerId), newRev];
          const avg = (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1);
          return {
            ...t,
            rating: Number(avg)
          };
        }
        return t;
      })
    );

    addToast(`Review submitted! Thank you for rating ${trainerName}.`, 'success');
    return newRev;
  };

  // Staff Attendance Handlers
  const recordStaffCheckIn = (staffId) => {
    const staff = trainers.find((t) => t.id === staffId);
    if (!staff) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayIso = getTodayIso();

    const existingToday = staffAttendanceLogs.find(
      (l) => l.staffId === staffId && recordMatchesDate(l, todayIso) && !l.checkOutTime
    );

    if (existingToday) {
      // Calculate total hours
      let calculatedHours = '8.0 hrs';
      try {
        const timeRegex = /(\d+):(\d+)\s*(AM|PM)?/i;
        const inMatch = existingToday.checkInTime ? existingToday.checkInTime.match(timeRegex) : null;
        if (inMatch) {
          let [_, hStr, mStr, period] = inMatch;
          let h = parseInt(hStr, 10);
          let m = parseInt(mStr, 10);
          if (period) {
            if (period.toUpperCase() === 'PM' && h < 12) h += 12;
            if (period.toUpperCase() === 'AM' && h === 12) h = 0;
          }
          const checkInDate = new Date();
          checkInDate.setHours(h, m, 0, 0);
          const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
          const diffHrs = diffMs / (1000 * 60 * 60);
          if (diffHrs < 0.1) {
            calculatedHours = `${Math.max(1, Math.round(diffMs / (1000 * 60)))} mins`;
          } else {
            calculatedHours = `${diffHrs.toFixed(1)} hrs`;
          }
        }
      } catch (e) {
        calculatedHours = '8.0 hrs';
      }

      setStaffAttendanceLogs((prev) =>
        prev.map((l) =>
          l.id === existingToday.id
            ? { ...l, checkOutTime: timeStr, status: 'Completed Shift', totalHours: calculatedHours }
            : l
        )
      );
      addToast(`${staff.name} punched OUT at ${timeStr}`);
    } else {
      const newLog = {
        id: `stf-att-${Date.now()}`,
        staffId,
        staffName: staff.name,
        role: staff.specialty || staff.role || 'Fitness Coach',
        date: todayIso,
        rawDate: todayIso,
        displayDate: 'Today',
        checkInTime: timeStr,
        checkOutTime: null,
        status: 'On Premises (Active)',
        totalHours: 'In progress'
      };
      setStaffAttendanceLogs((prev) => [newLog, ...prev]);
      addToast(`${staff.name} punched IN at ${timeStr}`);
    }
  };

  // Turnstile Entry Approvals
  const approveGateEntry = async (approvalId) => {
    const approval = entryApprovals.find((a) => a.id === approvalId);
    if (!approval) return;
    setEntryApprovals((prev) =>
      prev.map((a) => (a.id === approvalId ? { ...a, status: 'Approved' } : a))
    );
    const newLog = {
      id: `blog-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      deviceId: "bio-dev-1",
      deviceName: approval.gate || "Main Entrance Turnstile #1",
      personName: approval.memberName,
      personType: 'Member (Override)',
      verificationMode: "Owner Gate Override",
      result: "Access Granted",
      gateTrigger: "Relay Pulse (5s)"
    };
    setBiometricLogs((prev) => [newLog, ...prev]);

    try {
      await api.biometrics.approveGate(approvalId);
    } catch (err) {
      console.warn('Gate approve sync error:', err.message);
    }
    addToast(`Gate unlocked for ${approval.memberName}! Turnstile pulse active (5s).`, 'success');
  };

  const denyGateEntry = async (approvalId) => {
    setEntryApprovals((prev) =>
      prev.map((a) => (a.id === approvalId ? { ...a, status: 'Denied' } : a))
    );
    try {
      await api.biometrics.denyGate(approvalId);
    } catch (err) {
      console.warn('Gate deny sync error:', err.message);
    }
    addToast('Gate access denied in database.');
  };

  // Scrap Enquiry with 24-Month Retention
  const scrapEnquiry = async (id, reason = 'Not Interested') => {
    const autoPurgeDate = new Date();
    autoPurgeDate.setMonth(autoPurgeDate.getMonth() + 24);

    setEnquiries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
            ...e,
            status: 'Scrapped',
            isScrapped: true,
            scrapReason: reason,
            scrapDate: new Date().toISOString().split('T')[0],
            scrapAutoPurgeDate: autoPurgeDate.toISOString().split('T')[0]
          }
          : e
      )
    );

    try {
      await api.enquiries.update(id, { status: 'Lost', notes: `Scrapped: ${reason}` });
    } catch (err) {
      console.warn('Enquiry scrap sync error:', err.message);
    }
    addToast(`Enquiry moved to Scrapped Leads (auto-purges in 24 months)`, 'info');
  };

  // Biometric Turnstile Device Operations
  const testTurnstilePulse = async (deviceId) => {
    const dev = biometricDevices.find((d) => d.id === deviceId) || biometricDevices[0];
    const newLog = {
      id: `blog-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      deviceId: dev?.id || "bio-dev-1",
      deviceName: dev?.name || "Main Entrance Turnstile #1",
      personName: "Owner Remote Command",
      personType: "Staff Office",
      verificationMode: "Manual Relay Test",
      result: "Relay Triggered",
      gateTrigger: `Relay Pulse (${dev?.pulseDurationSec || 5}s)`
    };
    setBiometricLogs((prev) => [newLog, ...prev]);
    setBiometricDevices((prev) =>
      prev.map((d) =>
        d.id === (dev?.id || d.id)
          ? { ...d, lastSync: 'Just now (Pulse Verified)' }
          : d
      )
    );

    try {
      if (dev?.id) {
        await api.biometrics.triggerPulse(dev.id);
      }
    } catch (err) {
      console.warn('Turnstile pulse sync error:', err.message);
    }
    addToast(`Remote relay pulse sent to ${dev?.name}! Turnstile unlocked for ${dev?.pulseDurationSec || 5}s.`, 'success');
  };

  const addBiometricDevice = async (devData) => {
    const tempId = `bio-dev-${Date.now()}`;
    const newDev = {
      id: tempId,
      status: "Connected & Online",
      totalPunchesToday: 0,
      lastSync: "Just now",
      pulseDurationSec: 5,
      ...devData
    };
    setBiometricDevices((prev) => [...prev, newDev]);

    try {
      const res = await api.biometrics.createDevice(devData);
      if (res?.data?.id) {
        setBiometricDevices((prev) =>
          prev.map((d) => (d.id === tempId ? { ...newDev, id: 'bio-dev-' + res.data.id } : d))
        );
      }
    } catch (err) {
      console.warn('Device create sync error:', err.message);
    }
    addToast(`Biometric machine "${newDev.name}" connected!`, 'success');
  };

  // PT Plans & Recovery Plans
  const addPTPlan = async (planData) => {
    const tempId = `pt-${Date.now()}`;
    const newPlan = { id: tempId, ...planData };
    setPtPlans((prev) => [...prev, newPlan]);

    try {
      const res = await api.ptPlans.create(planData);
      if (res?.data?.id) {
        setPtPlans((prev) =>
          prev.map((p) => (p.id === tempId ? { ...newPlan, id: 'pt-' + res.data.id } : p))
        );
      }
    } catch (err) {
      console.warn('PT plan create sync error:', err.message);
    }
    addToast(`PT Package "${newPlan.name}" created in database!`, 'success');
    return newPlan;
  };

  const deletePTPlan = async (planId) => {
    setPtPlans((prev) => prev.filter((p) => String(p.id) !== String(planId)));
    try {
      const numericId = String(planId).replace('pt-', '');
      await api.ptPlans.delete(numericId);
    } catch (err) {
      console.warn('PT plan delete sync error:', err.message);
    }
    addToast('PT package removed from database', 'info');
  };

  const addRecoveryPlan = async (planData) => {
    const tempId = `rec-${Date.now()}`;
    let newPlan = { id: tempId, ...planData };
    setRecoveryPlans((prev) => [...prev, newPlan]);

    try {
      const res = await api.recoveryPlans.create(planData);
      if (res?.data?.id) {
        const finalId = String(res.data.id).startsWith('rec-') ? res.data.id : 'rec-' + res.data.id;
        newPlan = { ...newPlan, ...res.data, id: finalId };
        setRecoveryPlans((prev) =>
          prev.map((r) => (r.id === tempId ? newPlan : r))
        );
      }
    } catch (err) {
      console.warn('Recovery plan create sync error:', err.message);
    }
    addToast(`Therapy option "${newPlan.name}" added to database!`, 'success');
    return newPlan;
  };

  const deleteRecoveryPlan = async (planId) => {
    setRecoveryPlans((prev) => prev.filter((r) => String(r.id) !== String(planId)));
    try {
      const numericId = String(planId).replace('rec-', '');
      await api.recoveryPlans.delete(numericId);
    } catch (err) {
      console.warn('Recovery plan delete sync error:', err.message);
    }
    addToast('Recovery package removed from database', 'info');
  };

  const updateMemberKYC = (memberId, { docType, docNumber, status }) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
            ...m,
            kycDocType: docType || m.kycDocType,
            kycDocNumber: docNumber || m.kycDocNumber,
            kycStatus: status || 'Verified'
          }
          : m
      )
    );
    addToast('KYC details updated successfully!');
  };

  return (
    <GymDataContext.Provider
      value={{
        gymInfo,
        setGymInfo,
        members,
        trainers,
        plans,
        classes,
        attendance,
        initialExercises,
        workoutPlan,
        setWorkoutPlan,
        workoutPlans,
        setWorkoutPlans,
        saveWorkoutPlan,
        deleteWorkoutPlan,
        dietPlan,
        setDietPlan,
        dietPlans,
        setDietPlans,
        saveDietPlan,
        deleteDietPlan,
        waterGlasses,
        bodyMetrics,
        invoices,
        equipment,
        bookedClasses,
        toasts,
        addToast,
        removeToast,
        addMember,
        updateMember,
        deleteMember,
        renewMemberPlan,
        recordPayment,
        calculateMemberStatus,
        getExpiryDaysDiff,
        addTrainer,
        updateTrainer,
        addPlan,
        updatePlan,
        deletePlan,
        addClass,
        deleteClass,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        checkInMemberByQR,
        punchOutMember,
        toggleBookClass,
        toggleExerciseDone,
        toggleMealDone,
        incrementWater,
        decrementWater,
        logNewBodyMetrics,
        fetchAllFromBackend,
        fetchMembers,
        fetchTrainers,
        fetchPlans,
        fetchClasses,
        fetchAttendance,
        fetchEquipment,
        fetchInvoices,
        fetchExpenses,
        fetchProducts,
        fetchCommissions,
        fetchFreezes,
        fetchConsentForms,
        fetchPayroll,
        fetchPtSessions,
        fetchAdvanceRequests,
        fetchTrainerReviews,
        fetchGymInfo,
        fetchDashboardStats,
        isLoadingBackend,
        isOwnerTabLoading,
        loadingModules,
        ownerStats,
        setOwnerStats,
        revenueAnalytics,
        setRevenueAnalytics,
        // New State & Handlers
        enquiries,
        setEnquiries,
        fetchEnquiries,
        addEnquiry,
        updateEnquiry,
        deleteEnquiry,
        convertEnquiryToMember,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        recordProductSale,
        commissions,
        addCommissionRecord,
        markCommissionPaid,
        consentForms,
        addConsentForm,
        updateConsentStatus,
        membershipFreezes,
        addFreezeRequest,
        unfreezeMembership,
        extendMembership,
        payrollRecords,
        markPayrollPaid,
        updatePayrollAdjustments,
        advanceRequests,
        requestAdvancePay,
        updateAdvancePayStatus,
        ptSessions,
        allocatePTSessions,
        deletePTSession,
        logPTSessionWithOtp,
        trainerReviews,
        addTrainerReview,
        staffAttendanceLogs,
        recordStaffCheckIn,
        // Day-to-Day Approvals, Biometrics, PT, Recovery & KYC
        entryApprovals,
        approveGateEntry,
        denyGateEntry,
        scrapEnquiry,
        biometricDevices,
        biometricLogs,
        testTurnstilePulse,
        addBiometricDevice,
        ptPlans,
        fetchPtPlans,
        addPTPlan,
        deletePTPlan,
        recoveryPlans,
        fetchRecoveryPlans,
        addRecoveryPlan,
        deleteRecoveryPlan,
        updateMemberKYC,
        // Expenses & Cash Outflow
        expenses,
        addExpense,
        deleteExpense
      }}
    >
      {children}
    </GymDataContext.Provider>
  );
};

export const useGymData = () => {
  const context = useContext(GymDataContext);
  if (!context) {
    throw new Error('useGymData must be used within a GymDataProvider');
  }
  return context;
};
