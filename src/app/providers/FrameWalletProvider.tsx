"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Farcaster Mini App connector - dokümana göre
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

const BASE_RPC = "https://base-mainnet.g.alchemy.com/v2/tZlJB1-FKd6v-66GsIVID";

// Lazy connector initialization - timing sorunlarını önlemek için
const getConnectors = () => {
  const connectors = [];
  
  try {
    // Farcaster Mini App connector
    const farcasterConnector = farcasterMiniApp();
    connectors.push(farcasterConnector);
  } catch (error) {
    console.warn("Farcaster connector failed to initialize:", error);
  }
  
  try {
    // Injected connector
    const injectedConnector = injected();
    connectors.push(injectedConnector);
  } catch (error) {
    console.warn("Injected connector failed to initialize:", error);
  }
  
  try {
    // MetaMask connector
    const metaMaskConnector = metaMask();
    connectors.push(metaMaskConnector);
  } catch (error) {
    console.warn("MetaMask connector failed to initialize:", error);
  }
  
  // En az bir connector olmalı
  if (connectors.length === 0) {
    console.error("No valid connectors available, using fallback");
    try {
      connectors.push(injected());
    } catch (error) {
      console.error("Fallback connector also failed:", error);
    }
  }
  
  console.log(`Initialized ${connectors.length} connectors`);
  return connectors;
};

// Wagmi configuration following Farcaster Mini App docs
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(BASE_RPC, {
      timeout: 20000,
      retryCount: 3,
      fetchOptions: {
        cache: "no-cache",
      },
    }),
  },
  connectors: getConnectors(),
  ssr: false, // SSR'ı devre dışı bırak
});

// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function FrameWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
