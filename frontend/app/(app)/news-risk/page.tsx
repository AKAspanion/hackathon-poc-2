'use client';

export default function NewsPage() {
  return (
    <>
      <div className="">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          News Agent
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Supply chain & logistics news · Coming soon
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 border border-gray-200 dark:border-gray-700 border-dashed mt-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center min-h-[240px]">
            <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-4">
              <svg
                className="h-10 w-10 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                News Agent
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                This section will show supply chain and logistics news powered by the News Agent.
              </p>
            </div>
          </div>
      </div>
    </>
  );
}
