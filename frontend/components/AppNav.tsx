'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function AppNav() {
  const { isLoggedIn, oem, logout } = useAuth();

  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      <Link
        href="/"
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        Home
      </Link>
      {isLoggedIn ? (
        <>
          <Link
            href="/suppliers"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Suppliers
          </Link>
          <span className="text-gray-500 dark:text-gray-400 truncate max-w-[140px]" title={oem?.email}>
            {oem?.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Logout
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Login
        </Link>
      )}
    </nav>
  );
}
