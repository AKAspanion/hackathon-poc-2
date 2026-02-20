'use client';

import Link from 'next/link';

export function AppNav() {
  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      <Link
        href="/"
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Home
      </Link>
      <Link
        href="/onboarding"
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Onboarding
      </Link>
      <Link
        href="/dashboard"
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Suppliers Dashboard
      </Link>
    </nav>
  );
}
