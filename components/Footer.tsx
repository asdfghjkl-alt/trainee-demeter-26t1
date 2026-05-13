export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-black/8 dark:border-white/[.145] bg-white dark:bg-[#0a0a0a] py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {currentYear} Rendezvous. All rights reserved.
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center md:text-right">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Contributors:
          </span>{" "}
          Edward, Mark, Yuva, Aidan, Bryan
        </div>
      </div>
    </footer>
  );
}
