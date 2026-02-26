'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function AppNav() {
  const { isLoggedIn, oem, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  const handleSuppliersClick = () => {
    setProfileOpen(false);
  };

  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      {isLoggedIn ? (
        <>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
              <span className="truncate max-w-[160px]" title={oem?.email}>
                {oem?.email ?? 'Profile'}
              </span>
              <svg
                className={`h-4 w-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-full z-10 mt-1 min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-lg"
                role="menu"
              >
                <Link
                  href="/suppliers"
                  onClick={handleSuppliersClick}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  role="menuitem"
                >
                  Suppliers
                </Link>
                <div className="border-b border-gray-100 dark:border-gray-700 px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Signed in as
                  </p>
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={oem?.email}>
                    {oem?.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
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
