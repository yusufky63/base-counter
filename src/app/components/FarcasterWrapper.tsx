"use client"
import React, { useEffect, ReactNode, useState } from "react";

interface SafeAreaProps {
  children: ReactNode;
  insets?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

// Safe Area Container for properly displaying content in Farcaster client
export const SafeAreaContainer: React.FC<SafeAreaProps> = ({
  children,
  insets = { top: 0, bottom: 0, left: 0, right: 0 }
}) => {
  return (
    <div
      style={{
        paddingTop: `${insets?.top || 0}px`,
        paddingBottom: `${insets?.bottom || 0}px`,
        paddingLeft: `${insets?.left || 0}px`,
        paddingRight: `${insets?.right || 0}px`,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
};

interface FarcasterWrapperProps {
  children: ReactNode;
}

// Main Farcaster integration component
export const FarcasterWrapper: React.FC<FarcasterWrapperProps> = ({ children }) => {
  const [insets, setInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  useEffect(() => {
    // Sadece insets ayarı için kullanılacak, ortam kontrolü yapılmayacak
    setInsets({
      top: 0,
      bottom: 24,
      left: 0,
      right: 0
    });
  }, []);

  return <SafeAreaContainer insets={insets}>{children}</SafeAreaContainer>;
};

export default FarcasterWrapper; 