"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";

type Variant = "danger" | "warning" | "info";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, { confirm: string; icon: string }> = {
  danger: {
    confirm: "border-red-600 text-red-500 hover:bg-red-950",
    icon: "text-red-500",
  },
  warning: {
    confirm: "border-yellow-600 text-yellow-500 hover:bg-yellow-950",
    icon: "text-yellow-500",
  },
  info: {
    confirm: "border-blue-600 text-blue-500 hover:bg-blue-950",
    icon: "text-blue-500",
  },
};

function WarningIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger",
}: ConfirmModalProps) {
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Mount/unmount animation
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus trap + keyboard
  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
        return;
      }
      if (e.key === "Tab") {
        const focusable = [confirmBtnRef.current, cancelBtnRef.current].filter(Boolean) as HTMLElement[];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onConfirm]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  if (!open && !visible) return null;

  const v = variantStyles[variant];

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? "bg-black/70 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div
        className={`w-full max-w-md border border-gray-800 bg-gray-950 p-6 transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`shrink-0 ${v.icon}`}>
            <WarningIcon />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-900 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`border px-4 py-2 text-sm font-medium transition-colors ${v.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
