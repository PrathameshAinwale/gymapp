import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let activeModalStack = [];

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-xl',
  zIndexOverride = null,
  isNested = false
}) => {
  const modalIdRef = useRef(null);
  if (!modalIdRef.current) {
    modalIdRef.current = Math.random().toString(36).substring(2, 9);
  }
  const modalId = modalIdRef.current;
  const hasPushedHistoryRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Register this modal in the active modal stack
    activeModalStack.push({ id: modalId, onClose: onCloseRef });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Only the topmost modal handles Escape
        const top = activeModalStack[activeModalStack.length - 1];
        if (top?.id === modalId) {
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
          }
          onCloseRef.current?.();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      // Unregister from stack
      activeModalStack = activeModalStack.filter((m) => m.id !== modalId);
      if (activeModalStack.length === 0) {
        document.body.style.overflow = 'unset';
      }
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const stackIndex = activeModalStack.findIndex((m) => m.id === modalId);
  const calculatedZIndex = zIndexOverride || (stackIndex > 0 ? 10000 + stackIndex * 50 : 9999);

  const modalContent = (
    <div
      style={{ zIndex: calculatedZIndex }}
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 overflow-hidden"
    >
      {/* Viewport Backdrop */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onCloseRef.current?.();
        }}
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
            onClick={(e) => {
              e.stopPropagation();
              onCloseRef.current?.();
            }}
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

export default Modal;
