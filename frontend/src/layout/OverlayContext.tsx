import React, { createContext, useContext, useState } from "react";

const OverlayContext = createContext<{
  overlayOpen: boolean;
  setOverlayOpen: (open: boolean) => void;
}>({
  overlayOpen: false,
  setOverlayOpen: () => {},
});

export const OverlayProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  return (
    <OverlayContext.Provider value={{ overlayOpen, setOverlayOpen }}>
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => useContext(OverlayContext);