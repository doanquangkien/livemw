"use client";

import { useState } from "react";
import Image from "next/image";

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between p-3 bg-black border border-gray-800">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-white mt-0.5 tracking-wide">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300"
        title="Sao chép"
      >
        {copied ? (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default function ContactTab() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="p-5 bg-gray-900 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-2 tracking-wide">LIÊN HỆ TRẠI GÀ CHÚC CÁT TƯỜNG</h2>
        <p className="text-sm text-gray-400 leading-relaxed text-justify">
          Anh em có nhu cầu giao lưu, mua bán chiến kê hoặc cần hỗ trợ tư vấn, vui lòng liên hệ trực tiếp qua các kênh chính thức dưới đây.
        </p>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone / Zalo */}
        <a
          href="tel:0703574569"
          className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 hover:bg-gray-800 transition-colors"
        >
          <div className="p-3 bg-blue-500/10 shrink-0">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Hotline / Zalo</h3>
            <p className="text-sm text-gray-300 mt-1">0703 574 569</p>
          </div>
        </a>

        {/* Bank Transfer */}
        <button
          onClick={() => setShowQR(true)}
          className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 hover:bg-gray-800 transition-colors w-full text-left"
        >
          <div className="p-3 bg-green-500/10 shrink-0">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Chuyển khoản</h3>
            <p className="text-xs text-gray-400 mt-1">Nhấn vào để lấy mã QR chuyển khoản</p>
          </div>
        </button>

        {/* Facebook */}
        <a
          href="https://www.facebook.com/chuc.cat.tuong"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 hover:bg-gray-800 transition-colors"
        >
          <div className="p-3 bg-blue-600/10 shrink-0">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Facebook</h3>
            <p className="text-sm text-gray-400 mt-1">Chúc Cát Tường</p>
          </div>
        </a>

        {/* Location */}
        <div className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 md:col-span-2">
          <div className="p-3 bg-red-500/10 shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Địa chỉ trại</h3>
            <p className="text-sm text-gray-300 mt-1">Xuân An - Gia Lai</p>
            <p className="text-xs text-gray-500 mt-0.5">(* Vui lòng liên hệ trước khi đến tham quan)</p>
          </div>
        </div>
      </div>

      {/* QR Code Modal Overlay */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-sm shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black/40">
              <h3 className="text-base font-bold text-white tracking-wide">THANH TOÁN QR</h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              <div className="bg-white p-3 mx-auto w-48 h-48 border-[4px] border-green-600 relative">
                <Image
                  src="https://img.vietqr.io/image/vcb-1034848391-compact2.png?amount=0&accountName=DOAN%20QUANG%20LUYEN"
                  alt="Mã QR Vietcombank"
                  fill
                  className="object-contain p-1"
                />
              </div>

              <div className="space-y-2">
                <CopyRow label="Ngân Hàng" value="Vietcombank" />
                <CopyRow label="Số Tài Khoản" value="1034848391" />
                <CopyRow label="Chủ Tài Khoản" value="DOAN QUANG LUYEN" />
              </div>

              <p className="text-xs text-center text-gray-500 mt-2">
                * Vui lòng kiểm tra kỹ tên chủ tài khoản trước khi chuyển.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
