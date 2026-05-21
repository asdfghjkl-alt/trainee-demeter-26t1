"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  code: string;
}

export default function ShareRoomCard({ code }: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareUrl, setShareUrl] = useState(`/rooms/${code}/join`);

  // Runs only on the client — avoids SSR/hydration mismatch
  useEffect(() => {
    setShareUrl(`${window.location.origin}/rooms/${code}/join`);
  }, [code]);

  const copyToClipboard = async (text: string, which: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    if (which === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111] p-5 space-y-4">
      {/* Room Code */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-1">
            Room Code
          </p>
          <p className="text-3xl font-bold tracking-widest text-cyan-600 dark:text-cyan-400">
            {code}
          </p>
        </div>
        <button
          onClick={() => copyToClipboard(code, "code")}
          className="btn flex items-center gap-2 text-sm border-gray-300 dark:border-gray-700"
          aria-label="Copy room code"
        >
          {copiedCode ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copiedCode ? "Copied!" : "Copy code"}
        </button>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-4">
        <QRCode
          value={shareUrl}
          size={160}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
        />  
      </div>

      {/* Shareable Link */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] px-4 py-3">
        <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
        <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
          {shareUrl}
        </p>
        <button
          onClick={() => copyToClipboard(shareUrl, "link")}
          className="btn flex items-center gap-1 text-xs border-gray-300 dark:border-gray-700 shrink-0"
          aria-label="Copy share link"
        >
          {copiedLink ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copiedLink ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
