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
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Send,
  CheckCircle2,
  AlertCircle,
  RotateCw
} from 'lucide-react';

export const AboutPages = ({ activeTab = 'privacy-policy', setActiveTab }) => {
  const [currentSlug, setCurrentSlug] = useState(activeTab || 'privacy-policy');
  const [pageData, setPageData] = useState(null);
  const [allPages, setAllPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

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
        setAllPages(res.pages);
        setPageData(res.pages[currentSlug] || null);
      }
    } catch (err) {
      console.warn('Error fetching platform pages:', err);
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
    } else {
      // Fetch single page if not yet loaded
      (async () => {
        try {
          const res = await api.platform.getPage(currentSlug);
          if (res?.success && res?.page) {
            setPageData(res.page);
            setAllPages(prev => ({ ...prev, [currentSlug]: res.page }));
          }
        } catch (e) { }
      })();
    }
  }, [currentSlug]);

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

  const metadata = pageData?.metadata || {};
  const faqs = Array.isArray(metadata?.faqs) ? metadata.faqs : [];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 max-w-5xl mx-auto px-1 sm:px-0">
      {/* Top Breadcrumb & Navigation Tabs */}
      <div className="bg-white border border-slate-200 p-3 sm:p-5 rounded-2xl shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              {currentSlug === 'privacy-policy' && <Shield className="w-5 h-5" />}
              {currentSlug === 'terms-conditions' && <FileText className="w-5 h-5" />}
              {currentSlug === 'help-support' && <LifeBuoy className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {currentSlug === 'privacy-policy' && 'Privacy Policy'}
                {currentSlug === 'terms-conditions' && 'Terms and Conditions'}
                {currentSlug === 'help-support' && 'Help & Customer Support'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {currentSlug === 'privacy-policy' && 'How your personal, biometric and gym data is protected & stored.'}
                {currentSlug === 'terms-conditions' && 'Facility operating standards, membership rules and legal agreements.'}
                {currentSlug === 'help-support' && '24/7 technical desk, biometric troubleshooting, WhatsApp triggers & FAQs.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {metadata.last_updated && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                Updated: {metadata.last_updated}
              </span>
            )}
            <button
              onClick={loadPageContent}
              disabled={loading}
              title="Reload page data"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      {loading ? (
        <div className="bg-white border border-slate-200 p-12 rounded-2xl flex flex-col items-center justify-center gap-3">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-xs font-bold text-slate-500">Loading page details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: PRIVACY POLICY & TAB 2: TERMS */}
          {(currentSlug === 'privacy-policy' || currentSlug === 'terms-conditions') && (
            <div className="bg-white border border-slate-200 p-5 sm:p-8 rounded-2xl shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Official Platform Legal Document
                </span>
                {metadata.version && (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    Version {metadata.version}
                  </span>
                )}
              </div>

              {/* Render Structured Content */}
              <div className="prose prose-slate max-w-none text-slate-700 text-xs sm:text-sm leading-relaxed space-y-4">
                {(pageData?.content || '').split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-sm sm:text-base font-extrabold text-slate-900 pt-3 border-t border-slate-100 first:border-t-0 first:pt-0">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith('- ')) {
                    const bullets = paragraph.split('\n').filter(Boolean);
                    return (
                      <ul key={idx} className="space-y-1.5 pl-4 list-disc text-slate-600">
                        {bullets.map((b, bIdx) => (
                          <li key={bIdx}>{b.replace(/^[-\*]\s*/, '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={idx} className="text-slate-600 leading-normal">
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              {/* Footer Note */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-800">Legal Assurance:</strong> This policy applies to all cloud facilities hosted under ARCHFIT Platform. Changes to these policies will be broadcasted to facility administrators and reflected in this document.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HELP & SUPPORT */}
          {currentSlug === 'help-support' && (
            <div className="space-y-6">
              {/* Direct Support Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Email Support */}
                <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Email Support</h4>
                      <p className="text-[11px] text-slate-500">24h response for technical issues</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <a
                      href={`mailto:${metadata.support_email || 'support@archfit.com'}`}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>{metadata.support_email || 'support@archfit.com'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Phone Hotline */}
                <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-indigo-300 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Direct Phone Hotline</h4>
                      <p className="text-[11px] text-slate-500">Mon-Sat, 8:00 AM - 10:00 PM</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${(metadata.support_phone || '+91 98200 98200').replace(/\s+/g, '')}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <span>{metadata.support_phone || '+91 98200 98200'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* WhatsApp Desk */}
                <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs hover:border-teal-300 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">WhatsApp Priority Desk</h4>
                      <p className="text-[11px] text-slate-500">Instant turnstile & bio setup help</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <a
                      href={`https://wa.me/${(metadata.whatsapp_number || '919820098200').replace(/\D/g, '')}?text=Hello%20ARCHFIT%20Support%2C%20I%20need%20help%20with%20my%20gym`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <span>Chat on WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Operating Hours Banner */}
              {metadata.operating_hours && (
                <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Support Hours:</strong> {metadata.operating_hours}
                  </span>
                </div>
              )}

              {/* FAQs Accordion */}
              {faqs.length > 0 && (
                <div className="bg-white border border-slate-200 p-5 sm:p-7 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                      Frequently Asked Questions (FAQs)
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2">
                    {faqs.map((faq, fIdx) => {
                      const isOpen = openFaqIndex === fIdx;
                      return (
                        <div
                          key={fIdx}
                          className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? -1 : fIdx)}
                            className="w-full p-3.5 sm:p-4 text-left font-bold text-xs sm:text-sm text-slate-900 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <span>{faq.question}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="p-3.5 sm:p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Support Ticket Box */}
              <div className="bg-white border border-slate-200 p-5 sm:p-7 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-600" /> Submit a Support Request
                    </h3>
                    <p className="text-xs text-slate-500">Need specific help with hardware, reports, or billings? Drop us a note.</p>
                  </div>
                </div>

                {ticketSubmitted ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Your support ticket has been received! Our engineering desk will connect shortly.</span>
                  </div>
                ) : (
                  <form onSubmit={handleTicketSubmit} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={ticketForm.name}
                          onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile / Phone Number</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9820012345"
                          value={ticketForm.phone}
                          onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Topic / Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Assistance with turnstile biometric machine punch sync"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Message / Issue Details</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Describe what you need assistance with..."
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Support Request</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AboutPages;
