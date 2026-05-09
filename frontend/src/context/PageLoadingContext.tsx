import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";

interface PageLoadingContextType {
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined);

export const PageLoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPageLoading, setPageLoading] = useState(false);

  return (
    <PageLoadingContext.Provider value={{ isPageLoading, setPageLoading }}>
      {children}
    </PageLoadingContext.Provider>
  );
};

export const usePageLoading = () => {
  const context = useContext(PageLoadingContext);
  if (!context) {
    throw new Error("usePageLoading must be used within PageLoadingProvider");
  }
  return context;
};

/**
 * Hook to handle page data loading automatically.
 * Call this at the start of your data fetching, and it will:
 * 1. Set page loading to true immediately
 * 2. Return a function to call when loading is done
 * 
 * Usage:
 * const onLoadingComplete = usePageLoadingState();
 * 
 * useEffect(() => {
 *   const fetchData = async () => {
 *     try {
 *       const data = await api.get(...);
 *       setData(data);
 *     } finally {
 *       onLoadingComplete();
 *     }
 *   };
 *   fetchData();
 * }, []);
 */
export const usePageLoadingState = () => {
  const { setPageLoading } = usePageLoading();

  useEffect(() => {
    setPageLoading(true);
    return () => setPageLoading(false);
  }, [setPageLoading]);

  return useCallback(() => {
    setPageLoading(false);
  }, [setPageLoading]);
};
