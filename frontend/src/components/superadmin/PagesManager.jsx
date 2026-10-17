
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
    <div className="space-y-4 animate-fadeIn pb-16">

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Selectors */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
        <button
          type="button"
          onClick={() => handleSelectPage('privacy-policy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSlug === 'privacy-policy'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Shield className={`w-3.5 h-3.5 ${activeSlug === 'privacy-policy' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Privacy Policy</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPage('terms-conditions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSlug === 'terms-conditions'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 ${activeSlug === 'terms-conditions' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Terms and Conditions</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPage('help-support')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSlug === 'help-support'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <LifeBuoy className={`w-3.5 h-3.5 ${activeSlug === 'help-support' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Help and Support</span>
        </button>
      </div>

      {/* Editor Form */}
      {loading ? (
        <div className="p-12 rounded-xl bg-white border border-slate-200/80 flex flex-col items-center justify-center gap-2.5 shadow-xs">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-xs font-bold text-slate-500">Loading page editor...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Editing: {activeSlug === 'privacy-policy' ? 'Privacy Policy' : activeSlug === 'terms-conditions' ? 'Terms & Conditions' : 'Help & Support'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Slug key: <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono font-semibold">{activeSlug}</code></p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Live'}</span>
            </button>
          </div>

          {/* Page Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Page Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 font-bold"
            />
          </div>

          {/* Extra Metadata Fields for Help & Support */}
          {activeSlug === 'help-support' && (
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
              <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wide block">
                Direct Contact Channels &amp; Working Hours
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-emerald-600" /> Support Email
                  </label>
                  <input
                    type="email"
                    value={metadata.support_email || ''}
                    onChange={(e) => setMetadata({ ...metadata, support_email: e.target.value })}
                    placeholder="support@archfit.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-indigo-600" /> Support Phone
                  </label>
                  <input
                    type="text"
                    value={metadata.support_phone || ''}
                    onChange={(e) => setMetadata({ ...metadata, support_phone: e.target.value })}
                    placeholder="+91 98200 98200"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-teal-600" /> WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={metadata.whatsapp_number || ''}
                    onChange={(e) => setMetadata({ ...metadata, whatsapp_number: e.target.value })}
                    placeholder="+91 98200 98200"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Operating Support Hours
                </label>
                <input
                  type="text"
                  value={metadata.operating_hours || ''}
                  onChange={(e) => setMetadata({ ...metadata, operating_hours: e.target.value })}
                  placeholder="Monday - Saturday: 8:00 AM - 10:00 PM IST"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* FAQs Manager */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-700" />
                    <span>Frequently Asked Questions ({faqs.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-black text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add FAQ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-emerald-700 uppercase">FAQ #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(idx)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
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
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-slate-900"
                      />

                      <textarea
                        rows={2}
                        placeholder="Answer..."
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metadata for Privacy & Terms */}
          {activeSlug !== 'help-support' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Last Updated Date</label>
                <input
                  type="date"
                  value={metadata.last_updated || ''}
                  onChange={(e) => setMetadata({ ...metadata, last_updated: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Document Version</label>
                <input
                  type="text"
                  placeholder="e.g. 2.1"
                  value={metadata.version || ''}
                  onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          )}

          {/* Main Content Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Page Content Body (Markdown &amp; Text)</label>
            <textarea
              rows={12}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter page text sections, terms, and policies..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono leading-relaxed focus:bg-white focus:outline-none focus:border-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Supports markdown headers (### Section Title) and bullet lists (- Bullet Item).
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
