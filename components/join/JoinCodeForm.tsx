"use client";

import { useState } from "react";

type Props = {
  onSuccess: () => void;
};

export default function JoinCodeForm({ onSuccess }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setError("Invalid join code");
        return;
      }

      onSuccess(); // 👈 move to next step
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-[#111]"
      >
        <h1 className="mb-4 text-center text-2xl font-semibold text-gray-700">
          Enter join code:
        </h1>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABC123"
          className="w-full rounded-lg border px-4 py-3 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-[#181818]"
        />

        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}

        <button
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-cyan-600 py-3 text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Continue"}
        </button>
      </form>
    </div>
  );
}