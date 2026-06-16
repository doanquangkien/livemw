"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function LockIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Login failed");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full bg-gray-950">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 border border-gray-700 mb-4">
            <LockIcon />
          </div>
          <h1 className="text-lg font-semibold tracking-wide">Admin Login</h1>
          <p className="text-xs text-gray-600 mt-1">Enter admin password to continue</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 text-base text-white placeholder-gray-500 outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleSubmit();
            }}
            disabled={loading}
            autoFocus
          />

          <button
            type="button"
            className="w-full border border-white py-2 text-sm font-medium hover:bg-white hover:text-black transition-colors disabled:opacity-30"
            onClick={handleSubmit}
            disabled={loading || !password}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
