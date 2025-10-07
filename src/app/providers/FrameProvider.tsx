"use client";

import React, { ReactNode, useContext, useEffect, useState, createContext } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

// Türler - dokümana göre
interface MiniAppUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  location?: {
    placeId: string;
    description: string;
  };
}

interface MiniAppContext {
  user: MiniAppUser;
  client: {
    platformType?: 'web' | 'mobile';
    clientFid: number;
    added: boolean;
    safeAreaInsets?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  location?: {
    type: string;
    [key: string]: unknown;
  };
}

interface FrameContextValue {
  isSDKLoaded: boolean;
  isInMiniApp: boolean;
  user: MiniAppUser | null;
  context: MiniAppContext | null;
  capabilities: string[];
  isReadyCalled: boolean;
  callReady: () => Promise<void>;
  addMiniApp: () => Promise<void>;
  composeCast: (params: Record<string, unknown>) => Promise<unknown>;
  haptics: {
    impact: (type: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => Promise<void>;
    notification: (type: 'success' | 'warning' | 'error') => Promise<void>;
    selection: () => Promise<void>;
  };
}

const FrameProviderContext = createContext<FrameContextValue | undefined>(
  undefined
);

export function useFrame() {
  const context = useContext(FrameProviderContext);
  if (context === undefined) {
    throw new Error("useFrame must be used within a FrameProvider");
  }
  return context;
}

interface FrameProviderProps {
  children: ReactNode;
}

export function FrameProvider({ children }: FrameProviderProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isReadyCalled, setIsReadyCalled] = useState(false);

  // SDK fonksiyonları - dokümana göre
  const addMiniApp = async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch (error) {
      console.error("Failed to add mini app:", error);
      throw error;
    }
  };

  const composeCast = async (params: Record<string, unknown>) => {
    try {
      return await sdk.actions.composeCast(params);
    } catch (error) {
      console.error("Failed to compose cast:", error);
      throw error;
    }
  };

  const haptics = {
    impact: async (type: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => {
      try {
        if (capabilities.includes('haptics.impactOccurred')) {
          await sdk.haptics.impactOccurred(type);
        }
      } catch (error) {
        console.log("Haptic feedback not available:", error);
      }
    },
    notification: async (type: 'success' | 'warning' | 'error') => {
      try {
        if (capabilities.includes('haptics.notificationOccurred')) {
          await sdk.haptics.notificationOccurred(type);
        }
      } catch (error) {
        console.log("Haptic notification not available:", error);
      }
    },
    selection: async () => {
      try {
        if (capabilities.includes('haptics.selectionChanged')) {
          await sdk.haptics.selectionChanged();
        }
      } catch (error) {
        console.log("Haptic selection not available:", error);
      }
    }
  };

  // Ready çağrısı - dokümana göre uygulama tam hazır olunca çağrılmalı
  const callReady = async () => {
    if (!isReadyCalled) {
      try {
        console.log("📱 Calling sdk.actions.ready() - Enhanced mobile compatibility");
        
        // Enhanced environment detection
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          typeof navigator !== 'undefined' ? navigator.userAgent : ''
        );
        
        const isIframe = typeof window !== 'undefined' && window.parent !== window;
        const isWebView = typeof window !== 'undefined' && 
          ((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView || 
           (navigator.userAgent.includes('wv')) ||
           (navigator.userAgent.includes('Version') && navigator.userAgent.includes('Mobile')));
        
        const isWarpcast = typeof window !== 'undefined' && 
          (window.location.href.includes('warpcast') || 
           document.referrer.includes('warpcast'));
        
        console.log("🔍 Environment details:", { 
          isMobile, 
          isIframe, 
          isWebView, 
          isWarpcast,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'N/A'
        });
        
        // Mobile-specific initialization delays
        if (isMobile) {
          console.log("📱 Mobile device - applying compatibility measures");
          
          if (isWebView) {
            console.log("📱 WebView detected - adding WebView initialization delay");
            await new Promise(resolve => setTimeout(resolve, 800)); // Longer delay for WebView
          } else {
            console.log("📱 Mobile browser - adding standard delay");
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // Extended timeout for mobile devices
        const timeoutDuration = isMobile ? 10000 : 5000; // 10s for mobile, 5s for desktop
        console.log(`⏱️ Setting ready() timeout: ${timeoutDuration}ms`);
        
        const readyPromise = sdk.actions.ready();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ready timeout')), timeoutDuration)
        );
        
        await Promise.race([readyPromise, timeoutPromise]);
        setIsReadyCalled(true);
        
        console.log("✅ sdk.actions.ready() completed successfully");
        
      } catch (error) {
        console.error("❌ Failed to call ready():", error);
        console.log("🔄 Marking as ready anyway for mobile compatibility");
        setIsReadyCalled(true); // Mark as called even if failed for compatibility
      }
    } else {
      console.log("⚠️ Ready already called, skipping duplicate call");
    }
  };

  // SDK başlatma - dokümana göre
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Mini app ortamını kontrol et - dokümana göre
        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        
        if (isMiniApp) {
          // Context'i al
          const sdkContext = await sdk.context;
          setContext(sdkContext as MiniAppContext);
          
          // Kullanıcı bilgilerini al
          if (sdkContext?.user) {
            setUser(sdkContext.user as MiniAppUser);
          }
          
          // Capabilities'i al - dokümana göre
          try {
            const caps = await sdk.getCapabilities();
            setCapabilities(caps);
          } catch (error) {
            console.log("Could not get capabilities:", error);
          }
        }
      } catch (err) {
        console.error("SDK initialization error:", err);
      } finally {
        setIsSDKLoaded(true);
      }
    };

    initializeSDK();
  }, []);

  return (
    <FrameProviderContext.Provider
      value={{
        context,
        isSDKLoaded,
        isInMiniApp,
        user,
        capabilities,
        isReadyCalled,
        callReady,
        addMiniApp,
        composeCast,
        haptics,
      }}
    >
      {children}
    </FrameProviderContext.Provider>
  );
} 