import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Shield,
  FileText,
  LifeBuoy,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ExternalLink,
  ArrowRight,
  Send,
  CheckCircle2,
  AlertCircle,
  RotateCw
} from 'lucide-react';

const DEFAULT_PAGES_DATA = {
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: `At ARCHFIT, we are committed to protecting the privacy, security, and integrity of personal information for gym owners, managers, coaches, and athletes.

### 1. Information We Collect
We collect information necessary to provide gym management services, including:
- Contact Information: Full name, phone number, email address, and physical address.
- Membership & Attendance Data: Admission records, check-in timestamps, attendance punches, and RFID/Biometric access logs.
- Fitness & Health Profile: Body measurements, trainer notes, and customized workout/diet charts voluntarily shared.
- Financial Records: Invoices, receipt numbers, and billing history.

### 2. How We Use Your Data
Your information is used strictly to:
- Administer club operations, classes, personal training schedules, and gym memberships.
- Send transaction receipts, membership expiration alerts, and automated WhatsApp notifications.
- Ensure facility access security and prevent unauthorized entry.

### 3. Data Protection & Security
We implement enterprise-grade encryption (TLS/HTTPS), strict role-based access control, hashed passwords, and automated daily backups to safeguard all member and facility records.

### 4. Contact Us Regarding Privacy
For questions regarding data access, corrections, or privacy concerns, please contact our Data Protection Officer at privacy@archfit.com.`,
    metadata: {
      last_updated: '2026-10-01',
      effective_date: '2026-01-01',
      version: '2.1'
    }
  },
  'terms-conditions': {
    slug: 'terms-conditions',
    title: 'Terms and Conditions',
    content: `Welcome to ARCHFIT Club Management Platform. By accessing or using our application, websites, or services, you agree to comply with and be bound by the following Terms and Conditions.

### 1. Acceptance of Terms
These Terms apply to all facility owners, staff members, coaches, and gym athletes. If you disagree with any portion of these terms, please discontinue use immediately.

### 2. Facility Access & Membership Rules
- Members must scan active QR passes or biometric devices upon arrival.
- Memberships are strictly non-transferable unless explicitly processed through the official Membership Transfer workflow.
- Appropriate athletic attire and indoor training footwear are mandatory across all workout zones.

### 3. Billing, Fees & Cancellation
- Membership fees must be settled prior to or on the scheduled due date.
- Refund requests are subject to the specific refund and cancellation policy established by your facility management.

### 4. Health & Safety Disclaimer
Participation in athletic exercise and fitness programs involves inherent risk. Members must declare relevant medical conditions and acknowledge that facility workouts are undertaken at their own discretion.

### 5. Termination & Suspension
Facility owners reserve the right to suspend or terminate accounts that breach safety protocols, conduct guidelines, or terms of service.`,
    metadata: {
      last_updated: '2026-10-01',
      jurisdiction: 'India',
      version: '1.8'
    }
  },
  'help-support': {
    slug: 'help-support',
    title: 'Help & Customer Support',
    content: `Welcome to ARCHFIT Dedicated Support Center. Our team is committed to ensuring seamless 24/7 facility operations, hardware integrations, and billing workflows.

### Quick Assistance Channels
Need help with turnstile setup, biometric sync, WhatsApp templates, or member billing? Reach out through any of our direct support desks listed below.`,
    metadata: {
      support_email: 'contact.arch360@gmail.com',
      support_phone: '+91 7219111596',
      whatsapp_number: '+91 7219111596',
      operating_hours: 'Monday - Saturday: 9:30 AM - 5:30 PM IST'
    }
  }
};

const TAB_OPTIONS = [
  { slug: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
  { slug: 'terms-conditions', label: 'Terms & Conditions', icon: FileText },
  { slug: 'help-support', label: 'Help & Support', icon: LifeBuoy }
];

export const AboutPages = ({ activeTab = 'privacy-policy', setActiveTab }) => {
  const [currentSlug, setCurrentSlug] = useState(activeTab || 'privacy-policy');
  const [pageData, setPageData] = useState(DEFAULT_PAGES_DATA[activeTab] || DEFAULT_PAGES_DATA['privacy-policy']);
  const [allPages, setAllPages] = useState(DEFAULT_PAGES_DATA);
  const [loading, setLoading] = useState(false);

  // Ticket form state for Help & Support
  const [ticketForm, setTicketForm] = useState({ name: '', phone: '', subject: '', message: '' });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  useEffect(() => {
    if (activeTab && ['privacy-policy', 'terms-conditions', 'help-support'].includes(activeTab)) {
      setCurrentSlug(activeTab);
    }
  }, [activeTab]);

  const loadPageContent = async () => {
    setLoading(true);
    try {
      const res = await api.platform.getPages();
      if (res?.success && res?.pages) {
        setAllPages(prev => ({ ...prev, ...res.pages }));
        if (res.pages[currentSlug]) {
          setPageData(res.pages[currentSlug]);
        }
      }
    } catch (err) {
      console.warn('Error fetching platform pages, using fallback content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageContent();
  }, []);

  useEffect(() => {
    if (allPages[currentSlug]) {
      setPageData(allPages[currentSlug]);
    } else if (DEFAULT_PAGES_DATA[currentSlug]) {
      setPageData(DEFAULT_PAGES_DATA[currentSlug]);
    } else {
      (async () => {
        try {
          const res = await api.platform.getPage(currentSlug);
          if (res?.success && res?.page) {
            setPageData(res.page);
            setAllPages(prev => ({ ...prev, [currentSlug]: res.page }));
          }
        } catch (_) {}
      })();
    }
  }, [currentSlug, allPages]);

  const handleTabSwitch = (slug) => {
    setCurrentSlug(slug);
    if (setActiveTab) setActiveTab(slug);
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.message.trim()) return;
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketForm({ name: '', phone: '', subject: '', message: '' });
      setTicketSubmitted(false);
    }, 4000);
  };

  const defaultMeta = DEFAULT_PAGES_DATA[currentSlug]?.metadata || {};
  const rawMeta = (pageData?.metadata && typeof pageData.metadata === 'object') ? pageData.metadata : {};

  // Ignore legacy placeholder values so user-configured metadata is properly displayed
  const isLegacyPlaceholder = (val) => {
    if (!val || typeof val !== 'string') return !val;
    const s = val.trim().toLowerCase();
    return (
      s === 'support@archfit.com' ||
      s === '+91 98200 98200' ||
      s === '9820098200' ||
      s === '+91 9820098200' ||
      s === 'monday - saturday: 8:00 am - 10:00 pm ist' ||
      s === '+91' ||
      s === '+91 '
    );
  };

  const metadata = {
    ...defaultMeta,
    ...Object.fromEntries(
      Object.entries(rawMeta).filter(([_, v]) => v && !isLegacyPlaceholder(v))
    )
  };

  return (
    <div className="space-y-2.5 sm:space-y-4 animate-fadeIn pb-16 w-full max-w-5xl mx-auto px-1 sm:px-0">
      {/* 1. Top Header & Segmented Navigation Bar */}
      <div className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs space-y-2.5 sm:space-y-3">
        {/* Header Row: Icon, Title & Meta */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              {currentSlug === 'privacy-policy' && <Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
              {currentSlug === 'terms-conditions' && <FileText className="w-4 h-4 sm:w-5 sm:h-5" />}
              {currentSlug === 'help-support' && <LifeBuoy className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-normal leading-tight truncate">
                {currentSlug === 'privacy-policy' && 'Privacy Policy'}
                {currentSlug === 'terms-conditions' && 'Terms and Conditions'}
                {currentSlug === 'help-support' && 'Help & Customer Support'}
              </h1>
              <p className="text-2xs text-slate-500 font-medium truncate mt-0.5">
                {currentSlug === 'privacy-policy' && 'How your personal, biometric and gym data is protected & stored.'}
                {currentSlug === 'terms-conditions' && 'Facility operating standards, membership rules and legal agreements.'}
                {currentSlug === 'help-support' && '24/7 technical desk, biometric setup & support tickets.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {metadata.last_updated && (
              <span className="hidden sm:inline-flex text-2xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                Updated: {metadata.last_updated}
              </span>
            )}
            <button
              type="button"
              onClick={loadPageContent}
              disabled={loading}
              title="Reload page data"
              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer flex items-center justify-center active:scale-95 shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Responsive Segmented Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 overflow-x-auto scrollbar-none w-full">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentSlug === tab.slug;
            return (
              <button
                key={tab.slug}
                type="button"
                onClick={() => handleTabSwitch(tab.slug)}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Content Card */}
      {loading ? (
        <div className="bg-white border border-slate-200/90 p-8 sm:p-12 rounded-xl sm:rounded-2xl shadow-2xs flex flex-col items-center justify-center gap-2.5">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-slate-500">Loading page details...</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* TAB 1: PRIVACY POLICY & TAB 2: TERMS */}
          {(currentSlug === 'privacy-policy' || currentSlug === 'terms-conditions') && (
            <div className="bg-white border border-slate-200/90 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xs space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Official Platform Legal Document
                </span>
                {metadata.version && (
                  <span className="text-2xs font-mono font-semibold text-slate-400">
                    v{metadata.version}
                  </span>
                )}
              </div>

              {/* Render Structured Content */}
              <div className="text-slate-700 text-xs sm:text-sm leading-relaxed space-y-3">
                {(pageData?.content || '').split('\n\n').map((paragraph, idx) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;

                  if (trimmed.startsWith('### ')) {
                    return (
                      <h2
                        key={idx}
                        className="text-xs sm:text-sm font-bold text-slate-900 pt-2.5 border-t border-slate-100 first:border-t-0 first:pt-0 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{trimmed.replace('### ', '')}</span>
                      </h2>
                    );
                  }

                  if (trimmed.startsWith('- ')) {
                    const bullets = trimmed.split('\n').filter(Boolean);
                    return (
                      <ul key={idx} className="space-y-1.5 pl-2 text-slate-600">
                        {bullets.map((b, bIdx) => {
                          const cleanBullet = b.replace(/^[-\*]\s*/, '');
                          const colonIndex = cleanBullet.indexOf(':');
                          if (colonIndex > 0) {
                            const label = cleanBullet.slice(0, colonIndex);
                            const text = cleanBullet.slice(colonIndex + 1);
                            return (
                              <li key={bIdx} className="flex items-start gap-1.5 text-xs">
                                <span className="text-emerald-500 mt-1 shrink-0">•</span>
                                <div>
                                  <strong className="text-slate-800 font-semibold">{label}:</strong>
                                  <span className="text-slate-600 ml-1">{text}</span>
                                </div>
                              </li>
                            );
                          }
                          return (
                            <li key={bIdx} className="flex items-start gap-1.5 text-xs">
                              <span className="text-emerald-500 mt-1 shrink-0">•</span>
                              <span>{cleanBullet}</span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }

                  return (
                    <p key={idx} className="text-xs text-slate-600 leading-normal">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Footer Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-2xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 font-semibold">Legal Assurance:</strong> This policy applies to all cloud facilities hosted under ARCHFIT Platform. Changes to these policies will be broadcasted to facility administrators and reflected in this document.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HELP & SUPPORT */}
          {currentSlug === 'help-support' && (
            <div className="space-y-2.5 sm:space-y-4">
              {/* Direct Support Channels (Compact 3-Card Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {/* Email Support */}
                <div className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">Email Desk</h3>
                      <p className="text-2xs text-slate-500 truncate">24h response time</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <a
                      href={`mailto:${metadata.support_email || 'contact.arch360@gmail.com'}`}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{metadata.support_email || 'contact.arch360@gmail.com'}</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Phone Hotline */}
                <div className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:border-indigo-300 transition-colors flex flex-col justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">Phone Hotline</h3>
                      <p className="text-2xs text-slate-500 truncate">{metadata.operating_hours || 'Mon-Sat, 9:30 AM - 5:30 PM IST'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <a
                      href={`tel:${(metadata.support_phone || '+91 7219111596').replace(/\s+/g, '')}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{metadata.support_phone || '+91 7219111596'}</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* WhatsApp Desk */}
                <div className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs hover:border-teal-300 transition-colors flex flex-col justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">WhatsApp Desk</h3>
                      <p className="text-2xs text-slate-500 truncate">Instant turnstile & bio help</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <a
                      href={`https://wa.me/${(metadata.whatsapp_number || '+91 7219111596').replace(/\D/g, '')}?text=Hello%20ARCHFIT%20Support%2C%20I%20need%20help%20with%20my%20gym`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{metadata.whatsapp_number || '+91 7219111596'}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AboutPages;
