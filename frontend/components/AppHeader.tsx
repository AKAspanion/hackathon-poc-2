'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppNav } from '@/components/AppNav';

export function AppHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/weather-risk', label: 'Weather' },
    { href: '/shipping-risk', label: 'Shipment' },
    { href: '/news-risk', label: 'News' },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Predictive Supply Chain Agent
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Global Watchtower for Manufacturing Logistics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-1">
              {navLinks.map(({ href, label }) => {
                const isActive =
                  href === '/' ? pathname === '/' : pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <AppNav />
          </div>
        </div>
      </div>
    </header>
  );
}
