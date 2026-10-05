import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileText,
  Shield,
  LifeBuoy,
  Save,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';

export const PagesManager = () => {
  const [activeSlug, setActiveSlug] = useState('privacy-policy');
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Form fields for active page
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState({});

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await api.superadmin.getPages();
      if (res?.success && res?.pages) {
        setPages(res.pages);
        populateForm(activeSlug, res.pages);
      }
    } catch (err) {
      console.warn('Error loading platform pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const populateForm = (slug, pagesData) => {
    const page = pagesData[slug] || {};
    setTitle(page.title || (slug === 'privacy-policy' ? 'Privacy Policy' : slug === 'terms-conditions' ? 'Terms and Conditions' : 'Help and Support'));
    setContent(page.content || '');
    setMetadata(page.metadata || {});
  };

  const handleSelectPage = (slug) => {
    setActiveSlug(slug);
    populateForm(slug, pages);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        title,
        content,
        metadata
      };
      const res = await api.superadmin.updatePage(activeSlug, payload);
      if (res?.success) {
        setPages(prev => ({ ...prev, [activeSlug]: res.page }));
        setToastMsg(`"${title}" saved successfully!`);
        setTimeout(() => setToastMsg(''), 3500);
      }
    } catch (err) {
      alert('Error updating page: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  // FAQ management for Help & Support
  const faqs = Array.isArray(metadata.faqs) ? metadata.faqs : [];

  const handleAddFaq = () => {
    const nextFaqs = [...faqs, { question: '', answer: '' }];
    setMetadata({ ...metadata, faqs: nextFaqs });
  };

  const handleUpdateFaq = (index, field, value) => {
    const nextFaqs = [...faqs];
    nextFaqs[index] = { ...nextFaqs[index], [field]: value };
    setMetadata({ ...metadata, faqs: nextFaqs });
  };

  const handleRemoveFaq = (index) => {
    const nextFaqs = faqs.filter((_, idx) => idx !== index);
    setMetadata({ ...metadata, faqs: nextFaqs });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#0e1017] border border-white/[0.08] shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>About &amp; Legal Content Management</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit the live text and contact details for Privacy Policy, Terms &amp; Conditions, and Help &amp; Support displayed across the platform.
            </p>
          </div>
        </div>

        <button
          onClick={loadPages}
          disabled={loading}
          title="Reload page data"
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Selectors */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#0e1017] border border-white/[0.08]">
        <button
          type="button"
          onClick={() => handleSelectPage('privacy-policy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSlug === 'privacy-policy'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Privacy Policy</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPage('terms-conditions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSlug === 'terms-conditions'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Terms and Conditions</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPage('help-support')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSlug === 'help-support'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Help and Support</span>
        </button>
      </div>

      {/* Editor Form */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-[#0e1017] border border-white/[0.08] flex flex-col items-center justify-center gap-3">
          <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs font-bold text-slate-400">Loading page editor...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-5 sm:p-7 rounded-2xl bg-[#0e1017] border border-white/[0.08] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h3 className="text-base font-extrabold text-white">
                Editing: {activeSlug === 'privacy-policy' ? 'Privacy Policy' : activeSlug === 'terms-conditions' ? 'Terms & Conditions' : 'Help & Support'}
              </h3>
              <p className="text-xs text-slate-400">Slug key: <code className="text-indigo-400 font-mono">{activeSlug}</code></p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Live'}</span>
            </button>
          </div>

          {/* Page Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Page Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
            />
          </div>

          {/* Extra Metadata Fields for Help & Support */}
          {activeSlug === 'help-support' && (
            <div className="p-4 rounded-xl bg-[#07080d] border border-white/[0.06] space-y-4">
              <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wide block">
                Direct Contact Channels &amp; Working Hours
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-emerald-400" /> Support Email
                  </label>
                  <input
                    type="email"
                    value={metadata.support_email || ''}
                    onChange={(e) => setMetadata({ ...metadata, support_email: e.target.value })}
                    placeholder="support@archfit.com"
                    className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-400" /> Support Phone
                  </label>
                  <input
                    type="text"
                    value={metadata.support_phone || ''}
                    onChange={(e) => setMetadata({ ...metadata, support_phone: e.target.value })}
                    placeholder="+91 98200 98200"
                    className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-teal-400" /> WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={metadata.whatsapp_number || ''}
                    onChange={(e) => setMetadata({ ...metadata, whatsapp_number: e.target.value })}
                    placeholder="+91 98200 98200"
                    className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-400" /> Operating Support Hours
                </label>
                <input
                  type="text"
                  value={metadata.operating_hours || ''}
                  onChange={(e) => setMetadata({ ...metadata, operating_hours: e.target.value })}
                  placeholder="Monday - Saturday: 8:00 AM - 10:00 PM IST"
                  className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* FAQs Manager */}
              <div className="pt-2 border-t border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Frequently Asked Questions ({faqs.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add FAQ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/50 border border-white/[0.08] space-y-2 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase">FAQ #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(idx)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                          title="Remove FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Question (e.g. How do I setup biometric machines?)"
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0e1017] border border-white/[0.08] rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                      />

                      <textarea
                        rows={2}
                        placeholder="Answer..."
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0e1017] border border-white/[0.08] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metadata for Privacy & Terms */}
          {activeSlug !== 'help-support' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-[#07080d] border border-white/[0.06]">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Last Updated Date</label>
                <input
                  type="date"
                  value={metadata.last_updated || ''}
                  onChange={(e) => setMetadata({ ...metadata, last_updated: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Document Version</label>
                <input
                  type="text"
                  placeholder="e.g. 2.1"
                  value={metadata.version || ''}
                  onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Main Content Body */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Page Content Body (Markdown &amp; Text)</label>
            <textarea
              rows={12}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter page text sections, terms, and policies..."
              className="w-full px-4 py-3 bg-[#07080d] border border-white/[0.09] rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Supports markdown headers (### Section Title) and bullet lists (- Bullet Item).
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 inline mr-1.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Live'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default PagesManager;
