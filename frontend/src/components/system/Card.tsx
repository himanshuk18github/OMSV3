import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padding?: "p-4" | "p-6" | "p-8";
};

export default function Card({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
  padding = "p-6",
}: CardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6">
          <div className="min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`${padding} ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
}