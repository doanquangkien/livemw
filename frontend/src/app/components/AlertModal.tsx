"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Variant = "danger" | "warning" | "info" | "success";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  danger: "border-red-600 text-red-500 hover:bg-red-950",
  warning: "border-yellow-600 text-yellow-500 hover:bg-yellow-950",
  info: "border-blue-600 text-blue-500 hover:bg-blue-950",
  success: "border-green-600 text-green-500 hover:bg-green-950",
};

const variantIcons: Record<Variant, string> = {
  danger: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
  success: "text-green-500",
};

function AlertIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16h.01M12 8v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function AlertModal({
  open,
  onClose,
  title,
  message,
  variant = "info",
}: AlertModalProps) {
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const okBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    okBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open && !visible) return null;

  const Icon = variant === "success" ? CheckIcon : AlertIcon;

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
          <div className={`shrink-0 ${variantIcons[variant]}`}>
            <Icon />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            ref={okBtnRef}
            type="button"
            onClick={onClose}
            className={`border px-6 py-2 text-sm font-medium transition-colors ${variantStyles[variant]}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
