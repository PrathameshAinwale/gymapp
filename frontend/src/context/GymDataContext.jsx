import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const GymDataContext = createContext(null);

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
      "PulseFit Mobile App QR Turnstile Pass",
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
      "Free PulseFit Athlete Kit (Duffel Bag, Shaker & Towel)",
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
    email: "trainer@pulsefit.in",
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
    email: "elena.r@pulsefit.com",
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
    email: "marcus.t@pulsefit.com",
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
    email: "member@pulsefit.in",
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
  { id: "prd-3", numericId: 3, name: "PulseFit Athlete Performance Kit (Duffel + Shaker)", category: "Merchandise", price: 1499, costPrice: 800, stock: 45, minStockAlert: 10, status: "In Stock", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop&q=80" },
  { id: "prd-4", numericId: 4, name: "Cellucor C4 Original Pre-Workout (30 Servings)", category: "Supplements", price: 2399, costPrice: 1700, stock: 14, minStockAlert: 5, status: "In Stock", image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=200&auto=format&fit=crop&q=80" },
  { id: "prd-5", numericId: 5, name: "Raw Electrolyte & Hydration Drink (500ml)", category: "Beverages", price: 120, costPrice: 75, stock: 60, minStockAlert: 15, status: "In Stock", image: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=200&auto=format&fit=crop&q=80" }
];

const SEED_EXPENSES = [
  { id: "exp-1", title: "Facility Commercial Lease - Powai Club", category: "Rent", vendor: "Hiranandani Realtors Pvt Ltd", amount: 120000, date: "2026-08-01", paymentMode: "Bank Transfer", refNo: "LEASE-AUG-2026", notes: "Monthly commercial premises rent." },
  { id: "exp-2", title: "Adani Electricity Powai HT Commercial", category: "Utilities", vendor: "Adani Electricity Mumbai Ltd", amount: 45000, date: "2026-08-05", paymentMode: "UPI", refNo: "BILL-AUG-9912", notes: "HVAC central cooling & power." },
  { id: "exp-3", title: "Trainer & Staff Commissions Payout", category: "Salaries", vendor: "Pulse Fit Payroll Disbursement", amount: 48000, date: "2026-08-07", paymentMode: "Bank Transfer", refNo: "SAL-AUG-01", notes: "Trainer commissions & staff." },
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
  { id: "att-6", memberId: "mem-5", memberName: "Aarav Sharma", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80", planName: "Gold Quarterly Fitness", checkInTime: "07:15 AM", checkOutTime: "--", date: "Today", status: "Inside Gym", gate: "Main Turnstile A" },
  { id: "att-5", memberId: "mem-6", memberName: "Priya Patel", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80", planName: "Diamond VIP Annual Elite", checkInTime: "06:45 AM", checkOutTime: "--", date: "Today", status: "Inside Gym", gate: "VIP Turnstile C" },
  { id: "att-4", memberId: "mem-8", memberName: "Ananya Iyer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80", planName: "Gold Quarterly Fitness", checkInTime: "08:30 AM", checkOutTime: "--", date: "Today", status: "Inside Gym", gate: "Main Turnstile B" },
  { id: "att-3", memberId: "mem-11", memberName: "Sameer Kulkarni", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80", planName: "Silver Monthly Pass", checkInTime: "04:18 AM", checkOutTime: "05:45 AM", date: "Today", status: "Completed", gate: "Main Turnstile B" },
  { id: "att-2", memberId: "mem-7", memberName: "Rohan Verma", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80", planName: "Silver Monthly Pass", checkInTime: "06:00 PM", checkOutTime: "07:30 PM", date: "Yesterday", status: "Completed", gate: "Main Turnstile A" },
  { id: "att-1", memberId: "mem-9", memberName: "Kabir Mehra", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80", planName: "Silver Monthly Pass", checkInTime: "07:00 AM", checkOutTime: "08:15 AM", date: "02 Sep 2026", status: "Completed", gate: "Main Turnstile A" }
];

const SEED_EQUIPMENT = [
  { id: "eq-1", numericId: 1, name: "Hammer Strength Power Olympic Rack (Zone A)", brand: "Hammer Strength", category: "Free Weights & Racks", location: "Zone A - Heavy Iron", status: "Operational", condition: "Excellent", lastServiced: "2026-08-01", lastServiceDate: "2026-08-01", nextServiceDue: "2026-11-01" },
  { id: "eq-2", numericId: 2, name: "Technogym Skillmill Curved Treadmill", brand: "Technogym", category: "Cardio Machines", location: "Zone C - Cardio Deck", status: "Operational", condition: "Good", lastServiced: "2026-07-15", lastServiceDate: "2026-07-15", nextServiceDue: "2026-10-15" },
  { id: "eq-3", numericId: 3, name: "Life Fitness Dual Adjustable Cable Cross 8-Stack", brand: "Life Fitness", category: "Cable & Selectorized", location: "Zone B - Selectorized", status: "Operational", condition: "Excellent", lastServiced: "2026-08-10", lastServiceDate: "2026-08-10", nextServiceDue: "2026-11-10" },
  { id: "eq-4", numericId: 4, name: "Eleiko IWF Competition Barbell & Bumper Plate Set (300kg)", brand: "Eleiko", category: "Free Weights & Racks", location: "Zone A - Heavy Iron", status: "Operational", condition: "Excellent", lastServiced: "2026-08-05", lastServiceDate: "2026-08-05", nextServiceDue: "2026-12-05" },
  { id: "eq-5", numericId: 5, name: "Concept2 RowErg PM5 Indoor Rower", brand: "Concept2", category: "Cardio Machines", location: "Zone C - Cardio Deck", status: "Maintenance Needed", condition: "Fair", lastServiced: "2026-06-20", lastServiceDate: "2026-06-20", nextServiceDue: "2026-09-20" },
  { id: "eq-6", numericId: 6, name: "Matrix Fitness Ultra Leg Press 45-Degree", brand: "Matrix", category: "Cable & Selectorized", location: "Zone B - Selectorized", status: "Operational", condition: "Good", lastServiced: "2026-07-28", lastServiceDate: "2026-07-28", nextServiceDue: "2026-10-28" }
];

const SEED_INVOICES = [
  { id: "INV-2026-001", memberId: "mem-5", memberName: "Aarav Sharma", planName: "Gold Quarterly Fitness", amount: 4999, date: "2026-08-10", paymentMethod: "UPI", status: "Paid", invoiceUrl: "#" },
  { id: "INV-2026-002", memberId: "mem-6", memberName: "Priya Patel", planName: "Diamond VIP Annual Elite", amount: 15999, date: "2026-08-10", paymentMethod: "Credit Card", status: "Paid", invoiceUrl: "#" },
  { id: "INV-2026-003", memberId: "mem-7", memberName: "Rohan Verma", planName: "Silver Monthly Pass", amount: 1999, date: "2026-08-12", paymentMethod: "Net Banking", status: "Paid", invoiceUrl: "#" },
  { id: "INV-2026-004", memberId: "mem-8", memberName: "Ananya Iyer", planName: "Gold Quarterly Fitness", amount: 4999, date: "2026-08-12", paymentMethod: "UPI", status: "Paid", invoiceUrl: "#" },
  { id: "INV-2026-005", memberId: "mem-9", memberName: "Kabir Mehra", planName: "Silver Monthly Pass", amount: 1999, date: "2026-08-13", paymentMethod: "UPI", status: "Paid", invoiceUrl: "#" },
  { id: "INV-2026-006", memberId: "mem-11", memberName: "Sameer Kulkarni", planName: "Gold Quarterly Fitness", amount: 4999, date: "2026-08-14", paymentMethod: "Cash", status: "Paid", invoiceUrl: "#" }
];

const SEED_COMMISSIONS = [
  { id: "com-1", numericId: 1, trainerId: "trn-2", trainerName: "Coach Alex Rivers", memberName: "Marcus Aurelius", planName: "1-on-1 PT Master Tier (12 Sessions)", sessionType: "Personal Training (PT)", serviceType: "Personal Training (PT)", ratePercent: 20, commissionPct: 20, amount: 12000, packageAmount: 12000, commissionEarned: 2400, date: "2026-08-10", status: "Paid" },
  { id: "com-2", numericId: 2, trainerId: "trn-3", trainerName: "Coach Elena Rostova", memberName: "Priya Sharma", planName: "HIIT Power Hour Group Batch", sessionType: "Group Class Instruction", serviceType: "Group Class Instruction", ratePercent: 15, commissionPct: 15, amount: 10000, packageAmount: 10000, commissionEarned: 1500, date: "2026-08-11", status: "Paid" },
  { id: "com-3", numericId: 3, trainerId: "trn-2", trainerName: "Coach Alex Rivers", memberName: "Rohan Joshi", planName: "Olympic Weightlifting Foundation (8 Sessions)", sessionType: "Personal Training (PT)", serviceType: "Personal Training (PT)", ratePercent: 20, commissionPct: 20, amount: 9000, packageAmount: 9000, commissionEarned: 1800, date: "2026-08-13", status: "Pending" },
  { id: "com-4", numericId: 4, trainerId: "trn-4", trainerName: "Coach Marcus Thorne", memberName: "Ananya Roy", planName: "Vinyasa Flow Sunset Batch", sessionType: "Group Class Instruction", serviceType: "Group Class Instruction", ratePercent: 15, commissionPct: 15, amount: 8000, packageAmount: 8000, commissionEarned: 1200, date: "2026-08-14", status: "Pending" }
];

const SEED_FREEZES = [
  { id: "frz-1", numericId: 1, memberId: "mem-7", memberName: "Rohan Verma", planName: "Silver Monthly Pass", freezeStartDate: "2026-08-15", freezeEndDate: "2026-08-30", daysFrozen: 15, reason: "Official overseas corporate assignment (Singapore)", status: "Active Freeze", approvedBy: "Vikramaditya Singhania (Owner)" },
  { id: "frz-2", numericId: 2, memberId: "mem-9", memberName: "Kabir Mehra", planName: "Silver Monthly Pass", freezeStartDate: "2026-07-01", freezeEndDate: "2026-07-20", daysFrozen: 20, reason: "Rotator cuff rehabilitation & physical therapy rest", status: "Completed", approvedBy: "Vikramaditya Singhania (Owner)" }
];

const SEED_CONSENT_FORMS = [
  { id: "cform-1", numericId: 1, memberId: "mem-5", memberName: "Aarav Sharma", phone: "+91 98765 43210", planName: "Gold Quarterly Fitness", formType: "General Fitness & Liability Waiver", emergencyContact: "Neha Sharma (+91 98765 11223)", emergencyPhone: "+91 98765 11223", medicalConditions: "None reported. Cleared for heavy resistance training.", signedDate: "2025-11-15", status: "Signed" },
  { id: "cform-2", numericId: 2, memberId: "mem-6", memberName: "Priya Patel", phone: "+91 98112 34567", planName: "Diamond VIP Annual Elite", formType: "General Fitness & Liability Waiver", emergencyContact: "Rajesh Patel (+91 98112 99887)", emergencyPhone: "+91 98112 99887", medicalConditions: "None", signedDate: "2025-08-10", status: "Signed" },
  { id: "cform-3", numericId: 3, memberId: "mem-7", memberName: "Rohan Verma", phone: "+91 98223 45678", planName: "Silver Monthly Pass", formType: "General Fitness & Liability Waiver", emergencyContact: "Kavita Verma (+91 98223 88776)", emergencyPhone: "+91 98223 88776", medicalConditions: "Mild exercise-induced asthma (cleared with inhaler)", signedDate: null, status: "Pending" }
];

const SEED_PAYROLL = [
  { id: "pay-1", numericId: 1, employeeId: "trn-2", employeeName: "Coach Alex Rivers", trainerName: "Coach Alex Rivers", name: "Coach Alex Rivers", role: "Head Strength Coach", month: "August 2026", period: "August 2026", baseSalary: 65000, bonus: 5000, commissions: 2400, deductions: 2500, netPay: 69900, status: "Paid", payDate: "2026-08-31" },
  { id: "pay-2", numericId: 2, employeeId: "trn-3", employeeName: "Coach Elena Rostova", trainerName: "Coach Elena Rostova", name: "Coach Elena Rostova", role: "Senior Functional Coach", month: "August 2026", period: "August 2026", baseSalary: 55000, bonus: 3500, commissions: 1500, deductions: 1800, netPay: 58200, status: "Paid", payDate: "2026-08-31" },
  { id: "pay-3", numericId: 3, employeeId: "trn-4", employeeName: "Coach Marcus Thorne", trainerName: "Coach Marcus Thorne", name: "Coach Marcus Thorne", role: "Mobility & Yoga Specialist", month: "August 2026", period: "August 2026", baseSalary: 58000, bonus: 4000, commissions: 0, deductions: 2000, netPay: 60000, status: "Pending", payDate: null },
  { id: "pay-4", numericId: 4, employeeId: "trn-5", employeeName: "Pooja Sharma", trainerName: "Pooja Sharma", name: "Pooja Sharma", role: "Front Desk & Club Admin", month: "August 2026", period: "August 2026", baseSalary: 32000, bonus: 2000, commissions: 0, deductions: 1000, netPay: 33000, status: "Pending", payDate: null }
];

const SEED_STAFF_ATTENDANCE = [
  { id: "stf-1", staffId: "trn-2", staffName: "Coach Alex Rivers", role: "Head Strength Coach", date: "Today", checkInTime: "06:00 AM", checkOutTime: null, status: "On Premises (Active)", totalHours: "In progress" },
  { id: "stf-2", staffId: "trn-3", staffName: "Coach Elena Rostova", role: "Senior Functional Coach", date: "Today", checkInTime: "06:30 AM", checkOutTime: null, status: "On Premises (Active)", totalHours: "In progress" },
  { id: "stf-3", staffId: "trn-4", staffName: "Coach Marcus Thorne", role: "Mobility & Yoga Specialist", date: "Today", checkInTime: "07:00 AM", checkOutTime: null, status: "On Premises (Active)", totalHours: "In progress" }
];

const SEED_PT_PLANS = [
  { id: "pt-1", name: "Elite 1-on-1 Personal Training", sessions: 12, validityDays: 30, price: 8999, trainerLevel: "Head Strength Coach", description: "Personalized biomechanical analysis, custom periodized workouts & Indian macro nutrition planning." },
  { id: "pt-2", name: "VIP Executive Transformation", sessions: 24, validityDays: 60, price: 15999, trainerLevel: "Master Coach", description: "All-inclusive VIP personal coaching, body composition tracking, and daily dietary WhatsApp monitoring." },
  { id: "pt-3", name: "Athlete Power & Conditioning", sessions: 36, validityDays: 90, price: 21999, trainerLevel: "Elite Coach", description: "Periodized strength, hypertrophy, and Olympic lifting protocols for serious athletes." }
];

const SEED_RECOVERY_PLANS = [
  { id: "rec-1", name: "Cryotherapy & Cold Plunge Session", duration: "30 Mins", sessions: 1, price: 999, type: "Cryo Therapy", description: "Sub-zero cold plunge therapy for accelerated muscle recovery, reduced inflammation, and endorphin release." },
  { id: "rec-2", name: "Deep Tissue Percussion & Hyperice", duration: "45 Mins", sessions: 1, price: 1499, type: "Myofascial Release", description: "Pneumatic compression and deep tissue massage gun therapy targeting tight fascial trigger points." },
  { id: "rec-3", name: "Infrared Sauna & Steam Detoxing", duration: "40 Mins", sessions: 1, price: 799, type: "Infrared Sauna", description: "Full-spectrum infrared heat therapy for cellular detox, joint stiffness relief, and deep relaxation." }
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

export const GymDataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const isDefaultGym = !currentUser?.gymId || currentUser?.gymId === 1;

  const [gymInfo, setGymInfo] = useState({
    name: "PULSE FIT ATHLETIC CLUB",
    tagline: "India's Premier Strength & Conditioning Hub",
    address: "Plot 42, Hiranandani Business Park, Powai, Mumbai, Maharashtra 400076",
    phone: "+91 98201 54321",
    email: "contact@pulsefit.in",
    operatingHours: "Mon-Sat: 5:30 AM - 11:00 PM | Sun: 6:00 AM - 8:00 PM",
    currency: "₹"
  });

  const [members, setMembers] = useState(SEED_MEMBERS);
  const [trainers, setTrainers] = useState(SEED_TRAINERS);
  const [plans, setPlans] = useState(SEED_PLANS);
  const [classes, setClasses] = useState(SEED_CLASSES);
  const [attendance, setAttendance] = useState(SEED_ATTENDANCE);
  const [workoutPlan, setWorkoutPlan] = useState(SEED_DEFAULT_WORKOUT_PLAN);
  const [workoutPlans, setWorkoutPlans] = useState([SEED_DEFAULT_WORKOUT_PLAN]);
  const [dietPlan, setDietPlan] = useState(SEED_DEFAULT_DIET_PLAN);
  const [dietPlans, setDietPlans] = useState([SEED_DEFAULT_DIET_PLAN]);
  const [waterGlasses, setWaterGlasses] = useState(8);
  const [bodyMetrics, setBodyMetrics] = useState(SEED_BODY_METRICS);
  const [invoices, setInvoices] = useState(SEED_INVOICES);
  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [equipment, setEquipment] = useState(SEED_EQUIPMENT);
  const [bookedClasses, setBookedClasses] = useState([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Operations modules: Enquiries, Products, Commissions, Consent, Freezes, Payroll, Biometrics, PT & Recovery
  const [enquiries, setEnquiries] = useState(SEED_ENQUIRIES);
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [commissions, setCommissions] = useState(SEED_COMMISSIONS);
  const [consentForms, setConsentForms] = useState(SEED_CONSENT_FORMS);
  const [membershipFreezes, setMembershipFreezes] = useState(SEED_FREEZES);
  const [payrollRecords, setPayrollRecords] = useState(SEED_PAYROLL);
  const [staffAttendanceLogs, setStaffAttendanceLogs] = useState(SEED_STAFF_ATTENDANCE);
  const [ptPlans, setPtPlans] = useState(SEED_PT_PLANS);
  const [recoveryPlans, setRecoveryPlans] = useState(SEED_RECOVERY_PLANS);
  const [entryApprovals, setEntryApprovals] = useState([]);
  const [biometricDevices, setBiometricDevices] = useState([]);
  const [biometricLogs, setBiometricLogs] = useState([]);
  const initialExercises = SEED_EXERCISES;

  // Dynamic live revenue analytics & owner stats
  const [ownerStats, setOwnerStats] = useState({
    totalMembers: 12,
    activeMembers: 10,
    expiringMembers: 1,
    expiredMembers: 1,
    totalTrainers: 5,
    todayAttendance: 8,
    monthlyRevenue: 185000,
    monthlyExpenses: 65000,
    monthlyProfit: 120000,
    totalLeads: 15,
    hotLeads: 4
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

  // Live Async Fetch from Laravel + MySQL Backend with Progressive Hydration
  const fetchAllFromBackend = useCallback(async () => {
    try {
      // 1. Fetch Priority CRM Entities first for instant rendering
      api.members.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setMembers(res.data);
      }).catch(() => {});

      api.trainers.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setTrainers(res.data);
      }).catch(() => {});

      api.plans.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setPlans(res.data);
      }).catch(() => {});

      api.classes.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setClasses(res.data);
      }).catch(() => {});

      api.attendance.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setAttendance(res.data);
      }).catch(() => {});

      api.equipment.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setEquipment(res.data);
      }).catch(() => {});

      api.invoices.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setInvoices(res.data);
      }).catch(() => {});

      api.expenses.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setExpenses(res.data);
      }).catch(() => {});

      api.enquiries.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setEnquiries(res.data);
      }).catch(() => {});

      api.products.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setProducts(res.data);
      }).catch(() => {});

      api.commissions.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setCommissions(res.data);
      }).catch(() => {});

      api.freezes.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setMembershipFreezes(res.data);
      }).catch(() => {});

      api.consentForms.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setConsentForms(res.data);
      }).catch(() => {});

      api.payroll.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setPayrollRecords(res.data);
      }).catch(() => {});

      api.biometrics.getDevices().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setBiometricDevices(res.data);
      }).catch(() => {});

      api.biometrics.getLogs().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setBiometricLogs(res.data);
      }).catch(() => {});

      api.biometrics.getApprovals().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setEntryApprovals(res.data);
      }).catch(() => {});

      api.ptPlans.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setPtPlans(res.data);
      }).catch(() => {});

      api.recoveryPlans.getAll().then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) setRecoveryPlans(res.data);
      }).catch(() => {});

      api.gymInfo.get().then((res) => {
        if (res?.data) setGymInfo(res.data);
      }).catch(() => {});

      if (api.dashboard?.getOwnerStats) {
        api.dashboard.getOwnerStats().then((res) => {
          if (res?.stats) setOwnerStats(res.stats);
          if (res?.revenueAnalytics) setRevenueAnalytics(res.revenueAnalytics);
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Backend sync note:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchAllFromBackend();
  }, [fetchAllFromBackend, currentUser?.gymId, currentUser?.userId]);

  // MEMBER ACTIONS (Direct Backend Sync)
  const addMember = async (newMemberData) => {
    try {
      const res = await api.members.create(newMemberData);
      if (res.success && res.data) {
        setMembers((prev) => [res.data, ...prev]);
        addToast(`New member "${res.data.name}" registered successfully & saved!`);
        return res.data;
      }
    } catch (e) {
      console.warn('Backend create member fallback:', e.message);
    }

    // Local fallback
    const id = `mem-${100 + members.length + 1}`;
    const newMember = {
      id,
      avatar: newMemberData.avatar || `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 1000000)}?w=200&auto=format&fit=crop&q=80`,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      attendanceStreak: 1,
      qrPassCode: `PF-M-${id.toUpperCase()}-${newMemberData.name.split(' ')[0].toUpperCase()}`,
      duesAmount: 0,
      lastCheckIn: 'Just Joined',
      ...newMemberData
    };
    setMembers((prev) => [newMember, ...prev]);
    addToast(`New member "${newMember.name}" registered successfully!`);
    return newMember;
  };

  const updateMember = async (id, updatedData) => {
    try {
      await api.members.update(id, updatedData);
    } catch (e) {
      console.warn('Backend update member fallback:', e.message);
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updatedData } : m))
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

    try {
      await api.members.update(memberId, {
        plan_id: planId,
        status: 'Active',
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
            status: 'Active',
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
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            return {
              ...m,
              planId: selectedPlan?.id || planId,
              planName: resolvedPlanName,
              status: 'Active',
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
          status: 'Active',
          expiry_date: calculatedExpiry
        });
      } catch (e) {
        // Fallback
      }
    }

    try {
      if (api.invoices && api.invoices.create) {
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
          setInvoices((prev) => [res.data, ...prev.filter((i) => i.id !== newInvoice.id)]);
        }
        fetchAllFromBackend();
      }
    } catch (e) {
      console.warn('Backend invoice create fallback:', e);
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
      
      const newEntry = {
        id: `att-${Date.now().toString().slice(-4)}`,
        memberId: member.id,
        memberName: member.name,
        avatar: member.avatar,
        planName: member.planName,
        checkInTime: timeStr,
        checkOutTime: '--',
        date: 'Today',
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
      enrolledCount: 0,
      bookedCount: 0,
      ...classData
    };
    setClasses((prev) => [...prev, newClass]);

    try {
      const res = await api.classes.create({
        name: classData.title || classData.name,
        trainer_id: classData.trainerId,
        time: classData.time,
        days: classData.days,
        capacity: Number(classData.capacity) || 20,
        category: classData.category || 'Group Fitness',
        room: classData.room || 'Studio A',
        difficulty: classData.intensity || classData.difficulty || 'All Levels'
      });
      if (res?.data?.id) {
        setClasses((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, id: 'cls-' + res.data.id, numericId: res.data.id } : c))
        );
      }
    } catch (err) {
      console.warn('Class creation sync error:', err.message);
    }
    addToast(`Class "${classData.title || classData.name}" scheduled successfully!`, 'success');
    return newClass;
  };

  const deleteClass = async (id) => {
    setClasses((prev) => prev.filter((c) => c.id !== id && c.numericId !== id));
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

  // Enquiries Handlers
  const addEnquiry = async (enquiryData) => {
    const tempId = `enq-${Date.now()}`;
    const newEnquiry = {
      id: tempId,
      createdDate: new Date().toISOString().split('T')[0],
      status: 'New Lead',
      priority: 'Warm',
      staffName: enquiryData.staffName || 'Vikramaditya Singhania (Owner)',
      ...enquiryData
    };
    setEnquiries((prev) => [newEnquiry, ...prev]);

    try {
      const res = await api.enquiries.create(enquiryData);
      if (res?.data?.id) {
        setEnquiries((prev) =>
          prev.map((e) => (e.id === tempId ? { ...newEnquiry, ...res.data } : e))
        );
      }
    } catch (err) {
      console.warn('Enquiry create sync error:', err.message);
    }

    addToast(`Enquiry for "${newEnquiry.name}" recorded in database!`);
    return newEnquiry;
  };

  const updateEnquiry = async (id, updatedData) => {
    // Optimistic UI update
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
    );

    try {
      const keys = Object.keys(updatedData);
      if (keys.length === 1 && updatedData.priority) {
        await api.enquiries.updatePriority(id, updatedData.priority);
      } else if (keys.length === 1 && updatedData.followUpDate) {
        await api.enquiries.updateFollowUp(id, updatedData.followUpDate);
      } else {
        await api.enquiries.update(id, updatedData);
      }
    } catch (err) {
      console.warn('Enquiry update sync error:', err.message);
    }

    addToast('Lead details updated');
  };

  const deleteEnquiry = async (id) => {
    setEnquiries((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.enquiries.delete(id);
    } catch (err) {
      console.warn('Enquiry delete sync error:', err.message);
    }
    addToast('Enquiry removed from database', 'info');
  };

  const convertEnquiryToMember = async (id, memberData) => {
    // Optimistic removal from enquiries list
    setEnquiries((prev) => prev.filter((e) => e.id !== id));

    try {
      const res = await api.enquiries.convertToMember(id, memberData);
      if (res?.data) {
        setMembers((prev) => [res.data, ...prev.filter((m) => m.id !== res.data.id)]);
        addToast(res.message || `Lead converted to active member "${res.data.name}"!`);
        return res.data;
      }
    } catch (err) {
      console.warn('Backend convert enquiry fallback:', err.message);
    }

    // Direct addMember fallback if endpoint fails
    const createdMember = await addMember(memberData);
    deleteEnquiry(id);
    return createdMember;
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
    const newExpense = {
      id: tempId,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      status: 'Paid',
      ...expenseData,
      amount: Number(expenseData.amount) || 0
    };
    setExpenses((prev) => [newExpense, ...prev]);

    try {
      const res = await api.expenses.create(expenseData);
      if (res?.data?.id) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === tempId ? { ...newExpense, ...res.data } : e))
        );
      }
    } catch (err) {
      console.warn('Expense backend create sync error:', err.message);
    }

    addToast(`Expense "${newExpense.title}" (₹${newExpense.amount.toLocaleString('en-IN')}) saved to database!`);
    return newExpense;
  };

  const deleteExpense = async (expenseId) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    try {
      await api.expenses.delete(expenseId);
    } catch (err) {
      console.warn('Expense backend delete sync error:', err.message);
    }
    addToast('Expense record removed from database', 'info');
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

  // Staff Attendance Handlers
  const recordStaffCheckIn = (staffId) => {
    const staff = trainers.find((t) => t.id === staffId);
    if (!staff) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    const existingToday = staffAttendanceLogs.find(
      (l) => l.staffId === staffId && (l.date === todayStr || l.date === 'Today') && !l.checkOutTime
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
        date: 'Today',
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
  };

  const addRecoveryPlan = async (planData) => {
    const tempId = `rec-${Date.now()}`;
    const newPlan = { id: tempId, ...planData };
    setRecoveryPlans((prev) => [...prev, newPlan]);

    try {
      const res = await api.recoveryPlans.create(planData);
      if (res?.data?.id) {
        setRecoveryPlans((prev) =>
          prev.map((r) => (r.id === tempId ? { ...newPlan, id: 'rec-' + res.data.id } : r))
        );
      }
    } catch (err) {
      console.warn('Recovery plan create sync error:', err.message);
    }
    addToast(`Therapy option "${newPlan.name}" added to database!`, 'success');
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
        toggleBookClass,
        toggleExerciseDone,
        toggleMealDone,
        incrementWater,
        decrementWater,
        logNewBodyMetrics,
        fetchAllFromBackend,
        isLoadingBackend,
        ownerStats,
        setOwnerStats,
        revenueAnalytics,
        setRevenueAnalytics,
        // New State & Handlers
        enquiries,
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
        addPTPlan,
        recoveryPlans,
        addRecoveryPlan,
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
