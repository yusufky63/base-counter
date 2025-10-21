"use client";
import React, { useState, useEffect, useCallback } from "react";
import { ThemeContext } from "./context/ThemeContext";
import { toast } from "react-hot-toast";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseEther } from "viem/utils";
import { sdk } from "@farcaster/miniapp-sdk";
import Image from "next/image";
import appsData from "../../apps.json";

// Components - dokümana göre
import { useFrame } from "./providers/FrameProvider";
import LeaderboardModal from "./components/LeaderboardModal";
import WalletButton from "./components/WalletButton";

// Utils and contract
import { getContractAddress } from "./utils/ContractAddresses";
import counterABI from "./contract/ABI";
import { useCounter } from "./hooks/useCounter";

// Base  Chain ID
const BASE_CHAIN_ID = 8453;

// Contract leaderboard data interface
interface ContractLeaderboardItem {
  userAddress: string;
  contributions: number;
  lastUpdate: number;
}

// Leaderboard UI data interface
interface LeaderboardUIItem {
  address: string;
  userAddress: string;
  contributions: number;
  contribution: number;
  rank: number;
  username: string;
  isCurrentUser: boolean;
}

export default function BaseCounterApp() {
  const { isSDKLoaded, callReady } = useFrame();
  const [isAppReady, setIsAppReady] = useState(false);

  // Mobile için agresif ready() çağrısı - SDK yüklenir yüklenmez
  useEffect(() => {
    if (isSDKLoaded) {
      console.log(
        "🚀 SDK loaded, calling ready() immediately for mobile compatibility"
      );

      // Mobile için hiç beklemeden ready() çağır
      (async () => {
        try {
          await callReady();
          console.log("✅ Ready called successfully");
          setIsAppReady(true);
        } catch (error) {
          console.error("❌ Ready call failed:", error);
          // Yine de app'i göster
          setIsAppReady(true);
        }
      })();
    }
  }, [isSDKLoaded, callReady]);

  // Auto add Mini App on mount
  useEffect(() => {
    const autoAddMiniApp = async () => {
      try {
        // Wait a bit for the app to be ready
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await sdk.actions.addMiniApp();
      } catch (error) {
        console.error("Failed to add Mini App:", error);
        // Silently fail - this is expected for some users
      }
    };

    autoAddMiniApp();
  }, []); // Only run once on mount

  // Loading state - dokümana göre
  if (!isAppReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
        <div className="w-full max-w-md p-6 animate-pulse">
          {/* Header skeleton */}
          <div className="h-8 bg-gray-200 rounded mb-8"></div>

          {/* Counter display skeleton - Flip clock benzeri */}
          <div className="flex items-center justify-center gap-1 md:gap-2 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-12 h-16 md:w-16 md:h-20 bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-500 rounded-lg"
              ></div>
            ))}
          </div>

          {/* Action buttons skeleton */}
          <div className="flex justify-center space-x-4 mt-8">
            <div className="h-10 w-24 bg-gray-200 rounded-full"></div>
            <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render main app
  return <CounterApp />;
}

// Ana Counter bileşeni
function CounterApp() {
  const { theme } = React.useContext(ThemeContext);
  const { isInMiniApp, context, haptics } = useFrame();
  const { address, isConnected, status } = useAccount();
  const { connect, connectors } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, error: writeError } = useWriteContract();

  // Connector initialization state
  const [connectorsReady, setConnectorsReady] = useState(false);

  // Counter hook
  const {
    userStats,
    userRank,
    contributionTarget,
    rankDetails,
    leaderboard: hookLeaderboard,
    refreshData,
  } = useCounter({
    chainId: BASE_CHAIN_ID,
    address,
    isConnected,
  });

  // State
  const [counter, setCounter] = useState("0");
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isMoreAppsOpen, setIsMoreAppsOpen] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [lastTransactionError, setLastTransactionError] = useState<
    string | null
  >(null);

  // Apps data from JSON - otomatik olarak güncellenir
  const apps = appsData;
  const [leaderboard, setLeaderboard] = useState<LeaderboardUIItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // Farcaster compose cast function
  const handleComposeCast = async () => {
    try {
      const result = await sdk.actions.composeCast({
        text: `I just contributed to the Base Counter! Current count: ${counter.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          ","
        )} 🎯`,
        embeds: [window.location.href],
      });

      if (result?.cast) {
        console.log("Cast posted successfully:", result.cast.hash);
        toast.success("Cast posted successfully!");
      }
    } catch (error) {
      console.error("Failed to compose cast:", error);
      // Don't show error to user - this is expected for some users
    }
  };

  // Transaction timeout ref
  const transactionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Processed hash ref - loop'u önlemek için
  const processedHashRef = React.useRef<string | null>(null);

  // Contract address
  const contractAddress = React.useMemo(() => {
    try {
      const address = getContractAddress("Counter", BASE_CHAIN_ID);
      console.log("📋 Contract address loaded:", address);
      return address;
    } catch (error) {
      console.error("❌ Contract address error:", error);
      toast.error("Contract address not found");
      return null;
    }
  }, []);

  // Network switch - SADECE BASE'A İZİN VER
  const handleNetworkSwitch = useCallback(async () => {
    try {
      toast.loading("Switching to Base...", { id: "network-switch" });
      await switchChain({ chainId: BASE_CHAIN_ID });
      toast.dismiss("network-switch");
      toast.success("Switched to Base!");
      try {
        await haptics.notification("success");
      } catch (error) {
        console.log("Haptic notification failed:", error);
      }
    } catch (error) {
      toast.dismiss("network-switch");
      console.error("Network switch failed:", error);
      toast.error("Please manually switch to Base");
      try {
        await haptics.notification("error");
      } catch (hapticError) {
        console.log("Haptic error failed:", hapticError);
      }
    }
  }, [switchChain, haptics]);

  // Wallet connection - Farcaster SDK dokümantasyonuna göre
  const handleWalletConnect = useCallback(async () => {
    try {
      // Haptic feedback
      try {
        await haptics.selection();
      } catch (error) {
        console.log("Haptic selection failed:", error);
      }

      if (isConnected) {
        // Zaten bağlı ama ağı kontrol et
        if (chainId !== BASE_CHAIN_ID) {
          await handleNetworkSwitch();
        }
        return;
      }

      // Connector'ların hazır olup olmadığını kontrol et
      if (!connectors || connectors.length === 0) {
        console.warn("No connectors available, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 saniye bekle
        if (!connectors || connectors.length === 0) {
          throw new Error("Connectors not initialized");
        }
      }

      // Connector seçimi - Farcaster SDK dokümantasyonuna göre
      let selectedConnector = null;

      console.log(
        "🔍 WalletConnect - Environment check - isInMiniApp:",
        isInMiniApp
      );
      console.log(
        "Available connectors:",
        connectors.map((c) => ({ id: c.id, name: c.name }))
      );

      if (isInMiniApp) {
        // Mini App ortamında - Farcaster connector öncelikli
        console.log("📱 Mini App environment - using Farcaster connector");
        selectedConnector = connectors.find(
          (c) =>
            c.id === "farcaster" ||
            c.id === "farcasterMiniApp" ||
            c.name === "Farcaster" ||
            c.name?.toLowerCase().includes("farcaster")
        );

        if (!selectedConnector) {
          console.log(
            "⚠️ Farcaster connector not found, falling back to injected"
          );
          selectedConnector = connectors.find((c) => c.id === "injected");
        }
      } else {
        // Browser ortamında - injected connector öncelikli
        console.log("🌐 Browser environment - using injected connector");
        selectedConnector = connectors.find((c) => c.id === "injected");

        if (!selectedConnector) {
          console.log(
            "⚠️ Injected connector not found, falling back to MetaMask"
          );
          selectedConnector = connectors.find(
            (c) =>
              c.id === "metaMask" ||
              c.id === "metaMaskSDK" ||
              c.name === "MetaMask"
          );
        }
      }

      // Fallback
      if (!selectedConnector) {
        console.log("⚠️ No preferred connector found, using first available");
        selectedConnector = connectors[0];
      }

      console.log("🔌 Connecting with connector:", selectedConnector.id);
      await connect({ connector: selectedConnector });

      // Bağlandıktan sonra hemen Base ağına switch et
      setTimeout(() => {
        if (chainId !== BASE_CHAIN_ID) {
          handleNetworkSwitch();
        }
      }, 1000);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      try {
        await haptics.notification("error");
      } catch (hapticError) {
        console.log("Haptic error failed:", hapticError);
      }
      toast.error("Failed to connect wallet");
    }
  }, [
    isInMiniApp,
    connectors,
    connect,
    haptics,
    chainId,
    isConnected,
    handleNetworkSwitch,
  ]);

  // Counter artırma - geliştirilmiş error handling ve retry
  const handleIncrement = async (retryCount = 0) => {
    console.log("🚀 handleIncrement called with retryCount:", retryCount);
    console.log("Contract address:", contractAddress);
    console.log("Is transaction pending:", isTransactionPending);

    if (!contractAddress || isTransactionPending) {
      console.log(
        "❌ Early return - contractAddress:",
        !!contractAddress,
        "isTransactionPending:",
        isTransactionPending
      );
      return;
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 saniye

    try {
      // Haptic feedback
      try {
        await haptics.impact("medium");
      } catch (error) {
        console.log("Haptic impact failed:", error);
      }

      // Wallet bağlantısını kontrol et
      console.log("🔍 Wallet connection check:");
      console.log("- isConnected:", isConnected);
      console.log("- address:", address);
      console.log("- chainId:", chainId);

      if (!isConnected) {
        console.log("🔌 Wallet not connected, attempting to connect...");
        toast.loading("Connecting wallet...", { id: "wallet-connect" });
        try {
          await handleWalletConnect();
          toast.dismiss("wallet-connect");
        } catch (connectError) {
          console.error("Wallet connection failed:", connectError);
          toast.dismiss("wallet-connect");
          toast.error("Failed to connect wallet");
        }
        return;
      }

      // Chain kontrolü - SADECE BASE KABUL ET
      if (chainId !== BASE_CHAIN_ID) {
        await handleNetworkSwitch();
        return;
      }

      // writeContract hook'unun hazır olup olmadığını kontrol et
      if (!writeContract) {
        console.error("writeContract hook not ready");
        if (retryCount < MAX_RETRIES) {
          console.log(
            `writeContract not ready, retrying in ${RETRY_DELAY}ms... (attempt ${
              retryCount + 1
            }/${MAX_RETRIES})`
          );
          setTimeout(() => handleIncrement(retryCount + 1), RETRY_DELAY);
          return;
        }
        toast.error("Wallet connection not ready, please try again");
        return;
      }

      // Connector validation
      if (!connectorsReady) {
        console.error("Connectors not fully initialized");
        if (retryCount < MAX_RETRIES) {
          console.log(
            `Connectors not ready, retrying in ${RETRY_DELAY}ms... (attempt ${
              retryCount + 1
            }/${MAX_RETRIES})`
          );
          setTimeout(() => handleIncrement(retryCount + 1), RETRY_DELAY);
          return;
        }
        toast.error("Wallet is initializing, please wait and try again");
        return;
      }

      if (connectors.length === 0) {
        console.error("No connectors available");
        toast.error("Wallet connectors not available");
        return;
      }

      // Connector kontrolü - Farcaster SDK dokümantasyonuna göre
      let currentConnector = null;

      console.log("🔍 Environment check - isInMiniApp:", isInMiniApp);
      console.log(
        "Available connectors:",
        connectors.map((c) => ({ id: c.id, name: c.name }))
      );

      if (isInMiniApp) {
        // Mini App ortamında - Farcaster connector öncelikli
        console.log(
          "📱 Mini App environment detected - using Farcaster connector"
        );
        currentConnector = connectors.find(
          (c) =>
            c.id === "farcaster" ||
            c.id === "farcasterMiniApp" ||
            c.name === "Farcaster"
        );

        if (!currentConnector) {
          console.log(
            "⚠️ Farcaster connector not found, falling back to injected"
          );
          currentConnector = connectors.find((c) => c.id === "injected");
        }
      } else {
        // Browser ortamında - injected connector öncelikli
        console.log(
          "🌐 Browser environment detected - using injected connector"
        );
        currentConnector = connectors.find((c) => c.id === "injected");

        if (!currentConnector) {
          console.log(
            "⚠️ Injected connector not found, falling back to MetaMask"
          );
          currentConnector = connectors.find(
            (c) =>
              c.id === "metaMask" ||
              c.id === "metaMaskSDK" ||
              c.name === "MetaMask"
          );
        }
      }

      // Fallback - ilk geçerli connector
      if (!currentConnector) {
        console.log("⚠️ No preferred connector found, using first available");
        currentConnector = connectors[0];
      }

      if (!currentConnector) {
        console.error("No valid connector found");
        toast.error("No wallet connector available");
        return;
      }

      setIsTransactionPending(true);
      toast.loading("Sending transaction...", { id: "tx-loading" });

      // Yeni transaction başladı - previous hash'i temizle
      processedHashRef.current = null;

      // Daha uzun timeout - 10 saniye
      transactionTimeoutRef.current = setTimeout(() => {
        console.warn("Transaction timeout - auto clearing");
        toast.dismiss("tx-loading");
        setIsTransactionPending(false);
      }, 10000);

      try {
        // Transaction gönder - extra validation
        console.log("📤 Sending transaction to contract:", contractAddress);
        console.log("Using connector:", currentConnector.id);
        console.log("Is connected:", isConnected);
        console.log("Address:", address);
        console.log("Chain ID:", chainId);
        console.log("WriteContract function:", typeof writeContract);

        const txParams = {
          address: contractAddress,
          abi: counterABI,
          functionName: "incrementCounter",
          value: parseEther("0.0000001"), // 0.00001 BASE fee
        };

        console.log("Transaction params:", txParams);

        // writeContract'ı çağırmadan önce son kontrol
        if (typeof writeContract !== "function") {
          throw new Error("writeContract is not a function");
        }

        writeContract(txParams);
      } catch (writeError: unknown) {
        // writeContract'tan gelen immediate hata
        if (transactionTimeoutRef.current) {
          clearTimeout(transactionTimeoutRef.current);
          transactionTimeoutRef.current = null;
        }

        console.error("WriteContract immediate error:", writeError);

        // Immediate cancel detection
        const errorMessage =
          (
            writeError as Error & { message?: string }
          )?.message?.toLowerCase() || "";
        const errorCode = (writeError as Error & { code?: number | string })
          ?.code;
        const isCancelledImmediate =
          errorMessage.includes("user rejected") ||
          errorMessage.includes("cancelled") ||
          errorCode === 4001;

        // Connector hatası kontrolü
        const isConnectorError =
          errorMessage.includes("getchainid") ||
          errorMessage.includes("connector") ||
          errorMessage.includes("not a function");

        toast.dismiss("tx-loading");

        if (isCancelledImmediate) {
          console.log("🚫 Transaction cancelled immediately");
          try {
            await haptics.notification("warning");
          } catch (error) {
            console.log("Haptic warning failed:", error);
          }
        } else if (isConnectorError && retryCount < MAX_RETRIES) {
          console.log(
            `Connector error detected, retrying in ${RETRY_DELAY}ms... (attempt ${
              retryCount + 1
            }/${MAX_RETRIES})`
          );
          setTimeout(() => handleIncrement(retryCount + 1), RETRY_DELAY);
          return;
        } else {
          const errorMsg = "Failed to send transaction";
          setLastTransactionError(errorMsg);
          toast.error(errorMsg, { duration: 3000 });
          try {
            await haptics.notification("error");
          } catch (error) {
            console.log("Haptic error failed:", error);
          }
        }
        setIsTransactionPending(false);
      }
    } catch (error: unknown) {
      if (transactionTimeoutRef.current) {
        clearTimeout(transactionTimeoutRef.current);
        transactionTimeoutRef.current = null;
      }

      console.error("Setup error:", error);
      toast.dismiss("tx-loading");

      // Connector hatası kontrolü
      const errorMessage = (error as Error)?.message?.toLowerCase() || "";
      const isConnectorError =
        errorMessage.includes("getchainid") ||
        errorMessage.includes("connector") ||
        errorMessage.includes("not a function");

      if (isConnectorError && retryCount < MAX_RETRIES) {
        console.log(
          `Connector error detected, retrying in ${RETRY_DELAY}ms... (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`
        );
        setTimeout(() => handleIncrement(retryCount + 1), RETRY_DELAY);
        return;
      }

      const errorMsg = "Transaction setup failed";
      setLastTransactionError(errorMsg);
      toast.error(errorMsg);
      try {
        await haptics.notification("error");
      } catch (hapticError) {
        console.log("Haptic error failed:", hapticError);
      }
      setIsTransactionPending(false);
    }
  };

  // Counter değerini getir
  const fetchCounter = useCallback(async () => {
    if (!contractAddress) return;

    try {
      const response = await fetch("https://base-mainnet.g.alchemy.com/v2/tZlJB1-FKd6v-66GsIVID", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: contractAddress,
              data: "0x61bc221a", // counter() function signature
            },
            "latest",
          ],
        }),
      });

      const data = await response.json();
      if (data.result) {
        const value = parseInt(data.result, 16).toString();
        setCounter(value);
      }
    } catch (error) {
      console.error("Failed to fetch counter:", error);
    }
  }, [contractAddress]);

  // Leaderboard yükle - gerçek contract verilerini kullan
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      // Hook'tan gelen gerçek contract verisini kullan
      if (hookLeaderboard && hookLeaderboard.length > 0) {
        // Contract verisini UI formatına dönüştür
        const formattedLeaderboard = hookLeaderboard.map(
          (item: ContractLeaderboardItem, index: number) => {
            const shortAddress = `${item.userAddress.slice(
              0,
              6
            )}...${item.userAddress.slice(-4)}`;
            const isCurrentUser = address
              ? item.userAddress.toLowerCase() === address.toLowerCase()
              : false;

            // Username olarak kısa wallet adresi kullan
            const username = isCurrentUser ? "you" : shortAddress.toLowerCase();

            return {
              address: shortAddress,
              userAddress: item.userAddress, // Leaderboard.js için
              contributions: Number(item.contributions), // Leaderboard.js için
              contribution: Number(item.contributions),
              rank: index + 1, // Zaten sıralanmış olarak geliyor
              username: username,
              isCurrentUser: isCurrentUser,
            };
          }
        );

        console.log("🏆 Formatted leaderboard data:", formattedLeaderboard);
        setLeaderboard(formattedLeaderboard);
      } else {
        // Contract'ta henüz veri yoksa boş array
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [hookLeaderboard, address]);

  // Wallet bağlantı durumu değişikliklerini takip et
  const [previousAddress, setPreviousAddress] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (status === "connected" && isConnected && address) {
      // Sadece gerçekten yeni bir bağlantı olduğunda toast göster
      if (previousAddress !== address) {
        console.log("✅ Wallet connected successfully:", address);
        toast.success("Wallet connected!");
        try {
          haptics.notification("success");
        } catch (error) {
          console.log("Haptic notification failed:", error);
        }
        setPreviousAddress(address);
      }
    } else if (status === "disconnected") {
      console.log("❌ Wallet disconnected");
      setPreviousAddress(undefined);
      // Disconnect toast'ı gösterme, sadece log
    }
  }, [status, isConnected, address, haptics, previousAddress]);

  // Transaction sonuçlarını handle et
  useEffect(() => {
    if (hash && processedHashRef.current !== hash) {
      // Bu hash'i daha önce işlemedik, işle ve kaydet
      processedHashRef.current = hash;

      // Timeout'u temizle - işlem başarılı
      if (transactionTimeoutRef.current) {
        clearTimeout(transactionTimeoutRef.current);
        transactionTimeoutRef.current = null;
      }

      console.log("✅ Transaction sent:", hash);
      toast.dismiss("tx-loading");
      toast.success("Transaction sent!", { duration: 2000 });
      setLastTransactionError(null); // Clear any previous errors

      // Haptic feedback'i güvenli şekilde çağır
      (async () => {
        try {
          await haptics.notification("success");
        } catch (error) {
          console.log("Haptic notification failed:", error);
        }
      })();

      // Counter'ı güncelle ve leaderboard'ı refresh et
      setTimeout(() => {
        try {
          fetchCounter();
          refreshData(); // Contract verilerini yenile
        } catch (error) {
          console.error("Failed to refresh data:", error);
        }
        setIsTransactionPending(false);

        // Transaction tamamlandı - otomatik Add Mini App artık FarcasterActions'ta
      }, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, haptics]); // fetchCounter ve refreshData kasıtlı olarak dependency'de değil - loop'u önlemek için

  useEffect(() => {
    if (writeError) {
      // Timeout'u temizle - işlem hata verdi
      if (transactionTimeoutRef.current) {
        clearTimeout(transactionTimeoutRef.current);
        transactionTimeoutRef.current = null;
      }

      console.error("Transaction failed:", writeError);
      toast.dismiss("tx-loading");

      // Genişletilmiş cancel detection
      const errorMessage = writeError.message?.toLowerCase() || "";
      const errorName =
        (writeError as Error & { name?: string })?.name?.toLowerCase() || "";
      const errorCode = (writeError as Error & { code?: number | string })
        ?.code;

      const isCancelled =
        errorMessage.includes("user rejected") ||
        errorMessage.includes("user denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("rejected by user") ||
        errorMessage.includes("user cancelled") ||
        errorMessage.includes("rejected the request") ||
        errorMessage.includes("transaction rejected") ||
        errorMessage.includes("user rejected transaction") ||
        errorMessage.includes("denied by the user") ||
        errorMessage.includes("cancelled by user") ||
        errorName.includes("userrejected") ||
        errorCode === 4001 || // MetaMask user rejection code
        errorCode === "ACTION_REJECTED"; // WalletConnect rejection

      if (isCancelled) {
        console.log(
          "✅ Transaction cancelled by user - loading cleared immediately"
        );
        (async () => {
          try {
            await haptics.notification("warning");
          } catch (error) {
            console.log("Haptic warning failed:", error);
          }
        })();
      } else {
        toast.error("Transaction failed", { duration: 3000 });
        (async () => {
          try {
            await haptics.notification("error");
          } catch (error) {
            console.log("Haptic error failed:", error);
          }
        })();
      }
      setIsTransactionPending(false);
    }
  }, [writeError, haptics]);

  // Counter'ı periyodik olarak güncelle
  useEffect(() => {
    fetchCounter();
    const interval = setInterval(fetchCounter, 15000);
    return () => clearInterval(interval);
  }, [contractAddress, fetchCounter]);

  // Hook'tan gelen leaderboard verisini otomatik güncelle
  useEffect(() => {
    if (hookLeaderboard) {
      fetchLeaderboard();
    }
  }, [hookLeaderboard, fetchLeaderboard]);

  // Cleanup - component unmount olduğunda timeout'u temizle
  useEffect(() => {
    return () => {
      if (transactionTimeoutRef.current) {
        clearTimeout(transactionTimeoutRef.current);
        transactionTimeoutRef.current = null;
      }
    };
  }, []);

  // Connector initialization watcher - connector'ların hazır olmasını bekle
  useEffect(() => {
    const checkConnectors = async () => {
      if (connectors && connectors.length > 0) {
        console.log("🔌 Checking connectors readiness...");

        // Connector'ların initialize olması için kısa bir süre bekle
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // En az bir connector'ın getChainId metoduna sahip olup olmadığını kontrol et
        const readyConnectors = connectors.filter(
          (connector) => connector && typeof connector.getChainId === "function"
        );

        if (readyConnectors.length > 0) {
          console.log("✅ Connectors ready:", readyConnectors.length);
          setConnectorsReady(true);

          // Mini App'te otomatik bağlantı - Farcaster SDK dokümantasyonuna göre
          if (isInMiniApp && !isConnected) {
            console.log(
              "📱 Mini App detected - attempting auto-connect with Farcaster"
            );
            try {
              // Kısa bir gecikme ile otomatik bağlantı
              setTimeout(async () => {
                try {
                  await handleWalletConnect();
                } catch (error) {
                  console.log("Auto-connect failed:", error);
                }
              }, 1500);
            } catch (error) {
              console.log("Auto-connect setup failed:", error);
            }
          }
        } else {
          console.log("⚠️ Connectors not fully initialized, retrying...");
          // 2 saniye sonra tekrar kontrol et
          setTimeout(checkConnectors, 2000);
        }
      }
    };

    if (!connectorsReady) {
      checkConnectors();
    }
  }, [
    connectors,
    connectorsReady,
    isInMiniApp,
    isConnected,
    handleWalletConnect,
  ]);

  useEffect(() => {
    if (!isInitialDataLoaded) {
      // Sadece initial data yüklendi işaretini yap
      setIsInitialDataLoaded(true);
    }
  }, [isInitialDataLoaded]);

  // SafeAreaInsets - dokümana göre
  const safeAreaStyle = React.useMemo(() => {
    if (isInMiniApp && context?.client?.safeAreaInsets) {
      const insets = context.client.safeAreaInsets;
      return {
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      };
    }
    return {};
  }, [isInMiniApp, context]);

  return (
    <div
      className="min-h-screen flex flex-col bg-white text-gray-900"
      style={safeAreaStyle}
    >
      {/* Header */}
      <div className="w-full p-2 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3 border-4 border-blue-600 rounded-md ">
            <h1 className="text-sm md:text-base font-bold text-blue-600 tracking-wide px-2">
              Base
            </h1>
            <div className="px-2 py-1 bg-blue-600 border border-blue-600  shadow-sm">
              <h1 className="text-sm md:text-lg font-bold text-white tracking-wide">
                Counter
              </h1>
            </div>
          </div>
          <WalletButton />
        </div>
      </div>

      {/* Main Counter */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className={`cursor-pointer py-8 px-6 text-center transition-all duration-300 ${
            isTransactionPending || !connectorsReady
              ? "pointer-events-none opacity-70 scale-95"
              : "hover:scale-105 active:scale-95"
          }`}
          onClick={
            connectorsReady
              ? () => {
                  console.log("🖱️ Counter button clicked!");
                  console.log("Connectors ready:", connectorsReady);
                  console.log("Is connected:", isConnected);
                  console.log("Address:", address);
                  console.log("Chain ID:", chainId);
                  handleIncrement();
                }
              : undefined
          }
        >
          {/* Chain warning */}
          {isConnected && chainId !== BASE_CHAIN_ID && (
            <div className="mb-6 p-3 bg-orange-100 border border-orange-300 rounded-lg">
              <div className="text-orange-800 text-sm font-medium">
                ⚠️ Wrong Network
              </div>
              <div className="text-orange-600 text-xs mt-1">
                Please switch to Base
              </div>
            </div>
          )}

          {/* Counter value - Flip clock benzeri tasarım */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-1 md:gap-2">
              {counter
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                .split("")
                .map((digit, index, array) => {
                  const isComma = digit === ",";
                  const isLastDigit = index === array.length - 1;
                  const shouldShowDot =
                    !isComma &&
                    !isLastDigit &&
                    array[index + 1] !== "," &&
                    (array.length - index - 1) % 3 === 0 &&
                    array.length - index - 1 > 0;

                  return (
                    <React.Fragment key={`${digit}-${index}`}>
                      {!isComma && (
                        <div
                          className={`
                          relative overflow-hidden rounded-lg shadow-lg transition-all duration-500 ease-out
                          w-12 h-16 md:w-16 md:h-20
                          bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-500
                          ${
                            isTransactionPending
                              ? "animate-pulse scale-95"
                              : "hover:shadow-xl hover:scale-105"
                          }
                          animate-in slide-in-from-bottom-2 fade-in duration-300
                        `}
                          style={{
                            animationDelay: `${index * 100}ms`,
                          }}
                        >
                          {/* Flip clock benzeri kart tasarımı */}
                          <div className="absolute inset-0 bg-gradient-to-b from-blue-600 to-blue-700 rounded-lg"></div>

                          {/* Üst kısım - hafif daha açık */}
                          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-blue-500 to-blue-600 rounded-t-lg"></div>

                          {/* Orta çizgi - flip clock benzeri */}
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400 transform -translate-y-1/2"></div>

                          {/* Alt kısım - hafif daha koyu */}
                          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-700 to-blue-600 rounded-b-lg"></div>

                          {/* Rakam */}
                          <div className="relative z-10 flex items-center justify-center h-full">
                            <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                              {digit}
                            </span>
                          </div>

                          {/* Hover efekti */}
                          <div className="absolute inset-0 bg-gradient-to-b from-blue-400/20 to-transparent rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></div>

                          {/* Shine efekti */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
                        </div>
                      )}

                      {/* Nokta ayracı - büyük sayılarda */}
                      {shouldShowDot && (
                        <div className="flex items-center justify-center w-2 h-2 md:w-3 md:h-3">
                          <div className="w-1 h-1 md:w-2 md:h-2 bg-blue-400 rounded-full"></div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
            </div>
          </div>

          <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
            {isTransactionPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                Transaction pending...
              </>
            ) : !connectorsReady ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                Initializing wallet...
              </>
            ) : isConnected ? (
              "Tap to increment"
            ) : (
              "Connect wallet to increment"
            )}
          </div>

          {/* Retry button for failed transactions */}
          {lastTransactionError && !isTransactionPending && connectorsReady && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setLastTransactionError(null);
                  handleIncrement();
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full p-3 space-y-2 bg-white border-t border-gray-100">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => {
              setIsLeaderboardOpen(true);
              fetchLeaderboard();
            }}
            className="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium"
          >
            Leaderboard
          </button>
          <button
            onClick={handleComposeCast}
            className="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium"
          >
            Share Cast
          </button>
          <button
            onClick={() => setIsMoreAppsOpen(true)}
            className="px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 font-medium"
          >
            More Apps
          </button>
        </div>
      </div>

      {/* Modals */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          onClose={() => setIsLeaderboardOpen(false)}
          leaderboard={leaderboard}
          loading={leaderboardLoading}
          theme={theme}
          address={address}
          userStats={userStats}
          userRank={userRank}
          rankDetails={rankDetails}
          contributionTarget={contributionTarget}
        />
      )}

      {/* More Apps Modal */}
      {isMoreAppsOpen && (
        <div className="fixed inset-0 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">More Apps</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMoreAppsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href="https://farcaster.xyz/codexsha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                >
                  Follow @codexsha
                </a>
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={app.icon}
                          alt={app.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">
                          {app.name}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {app.description}
                        </p>
                      </div>
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
                      >
                        <svg
                          width="10"
                          height="10"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
