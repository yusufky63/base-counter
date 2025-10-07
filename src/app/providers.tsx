"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import { FrameProvider } from "./providers/FrameProvider";
import FrameWalletProvider from "./providers/FrameWalletProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Toaster position="top-center" />
      <FrameWalletProvider>
        <FrameProvider>
          {children}
        </FrameProvider>
      </FrameWalletProvider>
    </ThemeProvider>
  );
}

// Global tip tanımlaması
declare global {
  interface Window {
    IS_WARPCAST_ENV?: boolean;
  }
}
