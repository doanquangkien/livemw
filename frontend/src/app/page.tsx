"use client";

import { useState } from "react";
import Image from "next/image";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import VodList from "@/app/components/VodList";
import AboutTab from "@/app/components/AboutTab";
import ContactTab from "@/app/components/ContactTab";

type Tab = "about" | "replays" | "contact";

function LiveIndicator() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export default function LandingPage() {
  const { status } = useLiveStatus();
  const isLive = status === "live";
  const isLoading = status === "loading";
  const [tab, setTab] = useState<Tab>("about");

  return (
    <main className="min-h-dvh bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black border-b border-gray-900">
        <div className="flex items-center justify-between px-4 py-2 lg:py-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="text-sm lg:text-lg font-semibold tracking-wide text-white">
              CHÚC CÁT TƯỜNG
            </span>
            <Image
              src="/logo.png"
              width={40}
              height={40}
              alt="Logo"
              className="w-7 h-7 lg:w-10 lg:h-10"
            />
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            {isLoading ? (
              <span className="text-gray-500">ĐANG KIỂM TRA...</span>
            ) : isLive ? (
              <>
                <LiveIndicator />
                <span className="text-red-500 font-bold">LIVE</span>
              </>
            ) : (
              <span className="text-gray-500">NGOẠI TUYẾN</span>
            )}
          </span>
        </div>
      </header>

      {/* 16:9 Backdrop — ALWAYS visible */}
      <div className="max-w-4xl mx-auto px-4 pt-4 lg:pt-6">
        <div className="relative w-full border border-gray-800 bg-gray-950" style={{ aspectRatio: "16/9" }}>
          {/* Background image with blur overlay */}
          <Image
            src="/offline-bg.png"
            fill
            className="object-cover"
            alt=""
            priority
          />
          {/* Dark overlay + blur */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Spinner />
                <span className="text-sm">Đang kiểm tra...</span>
              </div>
            ) : isLive ? (
              <a
                href="/live"
                className="inline-flex items-center gap-3 border border-red-500 px-6 py-3 lg:px-8 lg:py-4 text-sm lg:text-base font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LiveIndicator />
                ĐANG CÓ PHIÊN LIVE - BẤM VÀO ĐỂ XEM
              </a>
            ) : (
              <div className="text-center">
                <div className="text-gray-400 flex justify-center">
                  <OfflineIcon />
                </div>
                <p className="text-sm lg:text-base font-semibold text-white mt-4">
                  Hiện chưa có phiên live nào
                </p>
                <p className="text-xs lg:text-sm text-gray-500 mt-1">
                  Quay lại sau khi admin bắt đầu phiên live
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex border-b border-gray-800">
          <button
            type="button"
            onClick={() => setTab("about")}
            className={`px-6 py-3 text-sm lg:text-base font-semibold transition-colors duration-200 ${
              tab === "about"
                ? "text-white border-b-2 border-white"
                : "text-gray-500 border-b-2 border-transparent hover:text-gray-300"
            }`}
          >
            Giới thiệu
          </button>
          <button
            type="button"
            onClick={() => setTab("replays")}
            className={`px-6 py-3 text-sm lg:text-base font-semibold transition-colors duration-200 ${
              tab === "replays"
                ? "text-white border-b-2 border-white"
                : "text-gray-500 border-b-2 border-transparent hover:text-gray-300"
            }`}
          >
            Xem lại
          </button>
          <button
            type="button"
            onClick={() => setTab("contact")}
            className={`px-6 py-3 text-sm lg:text-base font-semibold transition-colors duration-200 ${
              tab === "contact"
                ? "text-white border-b-2 border-white"
                : "text-gray-500 border-b-2 border-transparent hover:text-gray-300"
            }`}
          >
            Liên hệ
          </button>
        </div>

        {/* Tab content */}
        <div className="min-h-[200px] py-4">
          {tab === "about" ? (
            <AboutTab />
          ) : tab === "replays" ? (
            <VodList />
          ) : (
            <ContactTab />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-900 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-700">
            © {new Date().getFullYear()} Doan Quang Luyen - All Rights Reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
