import Link from "next/link";
import { MoveLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-cyan-500/10 dark:bg-cyan-400/5 blur-2xl rounded-full w-28 h-28 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />

        {/* Floating icon */}
        <div className="relative bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-xl">
          <HelpCircle className="w-12 h-12 text-cyan-600 dark:text-cyan-400 animate-pulse" />
        </div>
      </div>

      <span className="text-sm font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase mb-3">
        404 Error
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-4">
        Page Not Found
      </h1>

      <p className="text-gray-500 dark:text-gray-400 max-w-md text-base leading-relaxed mb-8">
        Sorry, we couldn't find the page you're looking for. The link might be
        broken, or the room may have been completed and closed.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl text-white bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all"
      >
        <MoveLeft className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  );
}
