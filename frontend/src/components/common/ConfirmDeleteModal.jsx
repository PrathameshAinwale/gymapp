import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';

/**
 * Reusable ConfirmDeleteModal for all user-facing deletion actions across the app.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {() => void} props.onClose - Action when cancelling or closing
 * @param {() => Promise<any> | any} props.onConfirm - Destructive action to execute
 * @param {string} [props.title='Confirm Deletion'] - Header title
 * @param {string} [props.recordName] - Human-readable identifier/name of the item
 * @param {string} [props.itemType='record'] - Type of item (e.g. "member", "enquiry", "plan")
 * @param {React.ReactNode} [props.message] - Custom main message
 * @param {React.ReactNode} [props.description] - Additional context/warning details
 * @param {boolean} [props.isDeleting=false] - External loading indicator
 * @param {string} [props.confirmText='Delete'] - Label for confirm button
 * @param {string} [props.cancelText='Cancel'] - Label for cancel button
 * @param {string} [props.maxWidth='max-w-md'] - Modal width styling
 */
export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  recordName,
  itemType = 'record',
  message,
  description,
  isDeleting: externalIsDeleting = false,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  maxWidth = 'max-w-md',
}) => {
  const [internalDeleting, setInternalDeleting] = useState(false);
  const isDeleting = externalIsDeleting || internalDeleting;

  if (!isOpen) return null;

  const handleConfirm = async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (isDeleting) return;

    try {
      setInternalDeleting(true);
      const result = onConfirm?.();
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (err) {
      console.error('Delete action failed:', err);
    } finally {
      setInternalDeleting(false);
    }
  };

  const handleCancel = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (isDeleting) return;
    onClose?.();
  };

  const defaultMessage = recordName
    ? `Are you sure you want to delete ${itemType ? `${itemType} ` : ''}"${recordName}"? This action may not be reversible.`
    : `Are you sure you want to delete this ${itemType}? This action may not be reversible.`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      maxWidth={maxWidth}
      isNested
    >
      <div className="space-y-4 py-2 text-center">
        {/* Warning Icon Badge */}
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          {isDeleting ? (
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-rose-600" />
          ) : (
            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </div>

        {/* Message and Description */}
        <div className="space-y-2 px-2">
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            {message || defaultMessage}
          </p>

          {description && (
            <div className="text-xs text-amber-700 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-left leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{description}</div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3 pt-3 px-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            className="w-1/2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-1/2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
