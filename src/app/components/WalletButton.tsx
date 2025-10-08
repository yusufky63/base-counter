"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
} from "wagmi";
import { base } from "wagmi/chains";
import { useSwitchChain } from "wagmi";
import { useFrame } from "../providers/FrameProvider";

export default function WalletButton() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { haptics, isInMiniApp } = useFrame();
  
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Wallet connection - geliştirilmiş connector seçimi
  const handleConnect = async () => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);
      await haptics.selection(); // Haptic feedback
      
      // Connector seçimi - Farcaster SDK dokümantasyonuna göre
      let selectedConnector = null;
      
      console.log("🔍 WalletButton - Environment check - isInMiniApp:", isInMiniApp);
      console.log("Available connectors:", connectors.map(c => ({ id: c.id, name: c.name })));
      
      if (isInMiniApp) {
        // Mini App ortamında - Farcaster connector öncelikli
        console.log("📱 Mini App environment - using Farcaster connector");
        selectedConnector = connectors.find(c => 
          c.id === 'farcaster' || 
          c.id === 'farcasterMiniApp' ||
          c.name === 'Farcaster'
        );
        
        if (!selectedConnector) {
          console.log("⚠️ Farcaster connector not found, falling back to injected");
          selectedConnector = connectors.find(c => c.id === 'injected');
        }
      } else {
        // Browser ortamında - injected connector öncelikli
        console.log("🌐 Browser environment - using injected connector");
        selectedConnector = connectors.find(c => c.id === 'injected');
        
        if (!selectedConnector) {
          console.log("⚠️ Injected connector not found, falling back to MetaMask");
          selectedConnector = connectors.find(c => 
            c.id === 'metaMask' || 
            c.id === 'metaMaskSDK' ||
            c.name === 'MetaMask'
          );
        }
      }
      
      // Fallback - ilk connector
      if (!selectedConnector) {
        console.log("⚠️ No preferred connector found, using first available");
        selectedConnector = connectors[0];
      }
      
      if (!selectedConnector) {
        throw new Error("No valid connector available");
      }
      
      console.log("Connecting with connector:", selectedConnector.id);
      await connect({ connector: selectedConnector });
      
      await haptics.notification('success');
    } catch (error) {
      console.error("Connection error:", error);
      await haptics.notification('error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnection
  const handleDisconnect = async () => {
    try {
      await haptics.impact('light');
      disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (!address) return;
    
    try {
      await navigator.clipboard.writeText(address);
      await haptics.selection();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  // Switch to Base
  const handleSwitchChain = async () => {
    try {
      await haptics.impact('medium');
      await switchChain({ chainId: base.id });
      await haptics.notification('success');
    } catch (error) {
      console.error("Chain switch failed:", error);
      await haptics.notification('error');
    }
  };

  // Loading state
  useEffect(() => {
    if (connectStatus === 'pending') {
      setIsConnecting(true);
    } else {
      setIsConnecting(false);
    }
  }, [connectStatus]);

  // Connected state
  if (isConnected && address) {
    const shortAddress = `${address.slice(0,3)}...${address.slice(-3)}`;
    const isCorrectChain = chainId === base.id;
    
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white shadow-sm transition-all ${
        isCorrectChain 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
          : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
      }`}>
        <span
          className="font-semibold text-xs sm:text-sm cursor-pointer hover:underline"
          onClick={handleCopyAddress}
          title={`${address} (click to copy)`}
        >
          {shortAddress}
        </span>
        
        {!isCorrectChain && (
          <button
            onClick={handleSwitchChain}
            className="px-2 py-1 text-xs sm:text-sm bg-white/20 hover:bg-white/30 rounded transition-colors"
            title="Switch to Base"
          >
            Switch Network
          </button>
        )}
        
        <button
          onClick={handleDisconnect}
          className="p-1 text-xs sm:text-sm hover:bg-white/20 rounded transition-colors"
          title="Disconnect wallet"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
          </svg>
        </button>
        
        {copied && (
          <span className="text-xs text-green-200 animate-fade-in">
            Copied!
          </span>
        )}
      </div>
    );
  }

  // Connecting state
  if (isConnecting) {
    return (
      <button 
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg opacity-75 cursor-not-allowed"
      >
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Connecting...
      </button>
    );
  }

  // Not connected state
  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 text-sm shadow-sm hover:shadow-md"
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      Connect Wallet
    </button>
  );
}
