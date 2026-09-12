import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  const hasPushedHistoryRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };

    const handlePopState = () => {
      // Back pressed while modal was open
      hasPushedHistoryRef.current = false;
      onCloseRef.current?.();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    // Push modal state so back button closes the modal first
    window.history.pushState({ isModal: true, app: 'gym' }, '');
    hasPushedHistoryRef.current = true;

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);

      // If closed by button/code (not by popstate), cleanly pop the pushed modal entry
      if (hasPushedHistoryRef.current) {
        hasPushedHistoryRef.current = false;
        if (window.history.state?.isModal) {
          window.history.back();
        }
      }
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
      {/* Viewport Backdrop */}
      <div
        onClick={() => onCloseRef.current?.()}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fadeIn"
      />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 animate-scaleUp my-auto max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <h3 className="font-heading text-sm sm:text-base font-bold text-slate-900 tracking-wide truncate pr-2">
            {title}
          </h3>
          <button
            onClick={() => onCloseRef.current?.()}
            type="button"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 active:scale-95"
            title="Close dialog"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
