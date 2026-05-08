import React from "react";

interface PreloaderProps {
  isLoading?: boolean;
  fullScreen?: boolean;
  message?: string;
}

const Preloader: React.FC<PreloaderProps> = ({
  isLoading = true,
  fullScreen = true,
  message,
}) => {
  if (!isLoading) return null;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Spinner - Simple Round */}
      <div
        className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"
        style={{
          animation: "spin 1s linear infinite",
        }}
      />
      
      {/* Message */}
      {message && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </span>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
};

export default Preloader;
