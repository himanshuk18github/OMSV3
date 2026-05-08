type InlineLoaderProps = {
  message?: string;
};

export default function InlineLoader({ message = "Loading..." }: InlineLoaderProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      <svg className="h-4 w-4 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
