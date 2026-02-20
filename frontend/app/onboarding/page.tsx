'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { suppliersApi } from '@/lib/api';
import { AppNav } from '@/components/AppNav';

export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => suppliersApi.uploadCsv(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        uploadMutation.reset();
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    uploadMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isSuccess = uploadMutation.isSuccess && uploadMutation.data;
  const created = uploadMutation.data?.created ?? 0;
  const errors = uploadMutation.data?.errors ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Supplier Onboarding
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload a CSV of suppliers (name, location, commodities, etc.)
              </p>
            </div>
            <AppNav />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isSuccess ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <span className="text-4xl mb-4 block">📄</span>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {selectedFile
                    ? selectedFile.name
                    : 'Drop your CSV here or click to browse'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  CSV with columns: name, location, city, country, region, commodities
                </p>
              </label>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Choose file
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile || uploadMutation.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload suppliers'}
              </button>
            </div>

            {uploadMutation.isError && (
              <div className="px-6 pb-6">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {uploadMutation.error instanceof Error
                    ? uploadMutation.error.message
                    : 'Upload failed'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-4">✅</span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upload complete
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                <strong>{created}</strong> supplier{created !== 1 ? 's' : ''} added.
              </p>
            </div>
            {errors.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Warnings ({errors.length})
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                  {errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {errors.length > 10 && (
                    <li>… and {errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                View Suppliers Dashboard
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Upload another file
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
