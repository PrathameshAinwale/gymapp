import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  Check,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Users,
  AlertTriangle,
  Flame,
  IndianRupee,
  CalendarCheck,
  Dumbbell,
  Calendar,
  Coins,
  Wrench,
  ShoppingBag,
  PauseCircle,
  FileText,
  Award,
  Layers
} from 'lucide-react';

export const ALL_STAT_CARD_DEFINITIONS = [
  {
    id: 'active_members',
    label: 'Active Members',
    shortLabel: 'Active',
    category: 'Operations',
    description: 'Enrolled members currently with an active gym pass',
    icon: Users,
    color: 'emerald',
    badge: 'Operations',
    tab: 'members',
    defaultActive: true,
    restricted: false
  },
  {
    id: 'renewals_due',
    label: 'Renewals Due / Expiring',
    shortLabel: 'Renewals',
    category: 'Retention',
    description: 'Members whose memberships have expired or expire this week',
    icon: AlertTriangle,
    color: 'amber',
    badge: 'Priority',
    tab: 'members',
    defaultActive: true,
    restricted: false
  },
  {
    id: 'hot_leads',
    label: 'Leads & Enquiries',
    shortLabel: 'Leads',
    category: 'Sales & CRM',
    description: 'Incoming prospect walk-ins and active sales enquiries',
    icon: Flame,
    color: 'rose',
    badge: 'CRM',
    tab: 'enquiries',
    defaultActive: true,
    restricted: false
  },
  {
    id: 'monthly_revenue',
    label: 'Monthly Collections / Revenue',
    shortLabel: 'Revenue',
    category: 'Finance',
    description: 'Total membership fees and invoices collected this month',
    icon: IndianRupee,
    color: 'emerald',
    badge: 'Finance',
    tab: 'financials',
    defaultActive: true,
    restricted: true // Hidden for managers
  },
  {
    id: 'total_members',
    label: 'Total Enrolled Members',
    shortLabel: 'All Members',
    category: 'Operations',
    description: 'All-time lifetime registered athlete accounts',
    icon: Users,
    color: 'indigo',
    badge: 'Directory',
    tab: 'members',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'today_checkins',
    label: "Today's Footfall & Check-ins",
    shortLabel: 'Check-Ins',
    category: 'Operations',
    description: 'Turnstile check-ins and member attendance today',
    icon: CalendarCheck,
    color: 'teal',
    badge: 'Floor',
    tab: 'attendance',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'pt_sessions',
    label: 'Active 1-on-1 PT Sessions',
    shortLabel: 'PT Tracker',
    category: 'Coaching',
    description: 'Personal training packages currently active with coaches',
    icon: Dumbbell,
    color: 'purple',
    badge: 'Training',
    tab: 'pt-sessions',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'classes_today',
    label: 'Batches & Scheduled Classes',
    shortLabel: 'Classes',
    category: 'Operations',
    description: 'Group fitness classes and studio sessions scheduled',
    icon: Calendar,
    color: 'blue',
    badge: 'Studio',
    tab: 'classes',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'pending_advance',
    label: 'Coach Advance Pay Requests',
    shortLabel: 'Advance Pay',
    category: 'Finance',
    description: 'Pending trainer salary advance approval requests',
    icon: Coins,
    color: 'amber',
    badge: 'Staff',
    tab: 'advance-pay',
    defaultActive: false,
    restricted: true
  },
  {
    id: 'equipment_alerts',
    label: 'Equipment & Maintenance',
    shortLabel: 'Equipment',
    category: 'Facilities',
    description: 'Gym machines needing maintenance or service inspection',
    icon: Wrench,
    color: 'orange',
    badge: 'Assets',
    tab: 'equipment',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'pro_shop',
    label: 'Pro Shop Low Stock Alerts',
    shortLabel: 'Pro Shop',
    category: 'Facilities',
    description: 'Merchandise or supplements needing immediate restock',
    icon: ShoppingBag,
    color: 'pink',
    badge: 'Store',
    tab: 'products',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'frozen_members',
    label: 'Frozen Memberships',
    shortLabel: 'On Freeze',
    category: 'Retention',
    description: 'Temporarily paused memberships on medical or travel hold',
    icon: PauseCircle,
    color: 'sky',
    badge: 'Passes',
    tab: 'membership-freeze',
    defaultActive: false,
    restricted: false
  },
  {
    id: 'unpaid_invoices',
    label: 'Unpaid / Pending Invoices',
    shortLabel: 'Unpaid Dues',
    category: 'Finance',
    description: 'Pending member fee dues and outstanding invoices',
    icon: FileText,
    color: 'rose',
    badge: 'Billing',
    tab: 'invoices',
    defaultActive: false,
    restricted: true
  },
  {
    id: 'coach_roster',
    label: 'Certified Coaches & Staff',
    shortLabel: 'Coaches',
    category: 'Coaching',
    description: 'Active gym trainers, physiotherapists and staff members',
    icon: Award,
    color: 'violet',
    badge: 'Team',
    tab: 'trainers',
    defaultActive: false,
    restricted: false
  }
];

export const DEFAULT_CARD_IDS = ['active_members', 'renewals_due', 'hot_leads', 'monthly_revenue'];
export const DEFAULT_MANAGER_CARD_IDS = ['active_members', 'renewals_due', 'hot_leads', 'today_checkins'];

export const CustomizeStatCardsModal = ({
  isOpen,
  onClose,
  selectedCardIds = [],
  onSave,
  canAccessFinancials = true,
  cardValues = {}
}) => {
  const [currentSelected, setCurrentSelected] = useState(selectedCardIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Filter out restricted cards if role has no financial access
  const availableCards = ALL_STAT_CARD_DEFINITIONS.filter(
    (card) => canAccessFinancials || !card.restricted
  );

  const categories = ['ALL', ...Array.from(new Set(availableCards.map((c) => c.category)))];

  const filteredCards = availableCards.filter((card) => {
    const matchesCategory = selectedCategory === 'ALL' || card.category === selectedCategory;
    const matchesSearch =
      card.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggle = (id) => {
    if (currentSelected.includes(id)) {
      // Keep at least 1 card
      if (currentSelected.length <= 1) return;
      setCurrentSelected(currentSelected.filter((item) => item !== id));
    } else {
      setCurrentSelected([...currentSelected, id]);
    }
  };

  const handleSelectAll = () => {
    setCurrentSelected(availableCards.map((c) => c.id));
  };

  const handleResetDefault = () => {
    const defaultIds = canAccessFinancials ? DEFAULT_CARD_IDS : DEFAULT_MANAGER_CARD_IDS;
    setCurrentSelected(defaultIds);
  };

  const handleSave = () => {
    onSave(currentSelected);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customise Dashboard Stat Cards"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Intro & Helper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Personalize Your Command Center</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select which metrics appear on your main dashboard overview ({currentSelected.length} of {availableCards.length} selected).
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              Select All
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cards by name or metric..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Selection Grid */}
        <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredCards.map((card) => {
              const Icon = card.icon;
              const isChecked = currentSelected.includes(card.id);
              const previewVal = cardValues[card.id] ?? '—';

              return (
                <div
                  key={card.id}
                  onClick={() => handleToggle(card.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isChecked
                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 leading-tight truncate">
                          {card.label}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {card.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {card.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400">Current Value:</span>
                        <span className="font-bold text-slate-800">{previewVal}</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                          → {card.tab}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No stat cards match "{searchTerm}"
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Clicking any card directs you straight to that page.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Save Layout</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
