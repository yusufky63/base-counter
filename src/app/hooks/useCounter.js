import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { getContractAddress } from "../utils/ContractAddresses";
import counterABI from "../contract/ABI";

// Cache süreleri (saniye cinsinden)
const CACHE_DURATION = {
  USER_STATS: 120, // 2 dakika
  LEADERBOARD: 600, // 10 dakika
  CONTRIBUTION: 300, // 5 dakika
};

const initialData = {
  userStats: null,
  leaderboard: [],
  userRank: null,
  lastUpdate: {
    userStats: 0,
    leaderboard: 0,
    contribution: 0,
  },
  contributionTarget: null,
  rankDetails: null,
};

// Sadece RPC provider kullanarak çalışan simplify edilmiş useCounter hook'u
export const useCounter = ({ chainId, address, isConnected }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [lastChainId, setLastChainId] = useState(chainId);

  const provider = useMemo(() => {
    try {
      return new ethers.providers.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/tZlJB1-FKd6v-66GsIVID");
    } catch (error) {
      console.error("Failed to create RPC provider:", error);
      return null;
    }
  }, []);

  // Contract address memoization
  const contractAddress = useMemo(() => {
    if (!chainId) return null;
    try {
      const address = getContractAddress("Counter", chainId);
      return address;
    } catch (error) {
      console.error("Contract address error:", error?.message);
      return null;
    }
  }, [chainId]);

  // Create ethers contract instance
  const ethersContract = useMemo(() => {
    if (!provider || !contractAddress) return null;
    try {
      return new ethers.Contract(contractAddress, counterABI, provider);
    } catch (error) {
      console.error("Failed to create contract instance:", error?.message);
      return null;
    }
  }, [provider, contractAddress]);

  // Reset data when network changes
  useEffect(() => {
    if (chainId !== lastChainId) {
      setData(initialData);
      setError(null);
      setLoading(true);
      setShouldRefresh(true);
      setLastChainId(chainId);
    }
  }, [chainId, lastChainId]);

  // Check if data needs refresh
  const needsRefresh = useCallback(
    (lastUpdate, cacheDuration) => {
      if (chainId !== lastChainId) return true;
      const now = Math.floor(Date.now() / 1000);
      return now - lastUpdate >= cacheDuration;
    },
    [chainId, lastChainId]
  );

  // Fetch user stats from blockchain
  const fetchUserStats = useCallback(async () => {
    try {
      if (!address || !ethersContract) return null;

      setLoading(true);

      // Use getUserStats function instead of userContributions
      const result = await ethersContract.getUserStats(address);
      const userStats = {
        address,
        contribution: result.contributions.toNumber(),
        rank: result.rank.toNumber(),
        inLeaderboard: result.inLeaderboard,
      };

      return userStats;
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw error;
    }
  }, [address, ethersContract]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      if (!ethersContract) return [];

      // Get leaderboard size
      const leaderboardSize = await ethersContract.leaderboardSize();

      // If leaderboardSize is zero, return empty array
      if (leaderboardSize.eq(0)) return [];

      // Use the FULL leaderboardSize value for getTopUsers
      const leaderboardData = await ethersContract.getTopUsers(leaderboardSize);

      // Format the data to match Leaderboard.js expectations
      const formatted = leaderboardData.map((entry) => {
        // Map contract fields to component expected fields
        return {
          userAddress: entry.user,
          contributions: entry.score.toNumber(),
          lastUpdate: entry.lastUpdate?.toNumber?.() ?? 0,
        };
      });

      // Sort by contributions (highest first)
      const sorted = formatted.sort(
        (a, b) => b.contributions - a.contributions
      );

      return sorted;
    } catch (error) {
      console.error("[LEADERBOARD] Error fetching leaderboard:", error);
      // Return empty array on error instead of throwing
      return [];
    }
  }, [ethersContract]);

  // Update user rank - calculate client-side due to contract sync issues
  const updateUserRank = useCallback(
    (leaderboard, userStats) => {
      if (!userStats || !address) return null;

      // First try contract rank if available
      if (userStats.rank > 0) {
        return userStats.rank;
      }

      // If contract rank is 0 but user has contributions, calculate client-side rank
      if (userStats.contribution > 0 && leaderboard.length > 0) {
        // Find user's position based on their contributions
        let rank = 1;
        for (const entry of leaderboard) {
          if (userStats.contribution < entry.contributions) {
            rank++;
          }
        }

        // If user should be in top 50, return the rank
        if (rank <= 50) {
          return rank;
        }
      }

      return null;
    },
    [address]
  );

  // Get contribution target from contract
  const fetchContributionTarget = useCallback(async () => {
    try {
      if (!address || !ethersContract) return null;

      const result = await ethersContract.getContributionTarget(address);

      return {
        current: result.current.toNumber(),
        target: result.target.toNumber(),
        needed: result.remaining.toNumber(),
        hasAchievedTarget: result.remaining.eq(0),
      };
    } catch (error) {
      console.error("Error fetching contribution target:", error);
      return null;
    }
  }, [address, ethersContract]);

  // Get detailed rank info from contract
  const fetchRankDetails = useCallback(async () => {
    try {
      if (!address || !ethersContract) return null;

      const result = await ethersContract.getUserRankDetails(address);

      return {
        rank: result.rank.toNumber() > 0 ? result.rank.toNumber() : null,
        nextRankDiff: result.nextRankDiff.toNumber(),
        nextRankAddress: result.nextRankAddress,
      };
    } catch (error) {
      console.error("Error fetching rank details:", error);
      return null;
    }
  }, [address, ethersContract]);

  // Main data refresh function
  const refreshData = useCallback(async () => {
    if (!provider || !contractAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = Math.floor(Date.now() / 1000);
      const updates = { ...data.lastUpdate };
      let updatedData = { ...data };

      // Refresh user stats if needed
      if (
        needsRefresh(data.lastUpdate.userStats, CACHE_DURATION.USER_STATS) &&
        address &&
        isConnected
      ) {
        const userStats = await fetchUserStats();
        updatedData.userStats = userStats;
        updates.userStats = now;
      }

      // Refresh leaderboard if needed
      if (
        needsRefresh(data.lastUpdate.leaderboard, CACHE_DURATION.LEADERBOARD)
      ) {
        const leaderboard = await fetchLeaderboard();
        console.log("[LEADERBOARD] refreshData fetched:", leaderboard);
        updatedData.leaderboard = leaderboard;
        updates.leaderboard = now;
      }

      // Update derived data if we have user stats
      if (updatedData.userStats && address && isConnected) {
        // Update user rank (already included in userStats)
        const userRank = updateUserRank(
          updatedData.leaderboard,
          updatedData.userStats
        );
        updatedData.userRank = userRank;

        // Get contribution target from contract
        if (
          needsRefresh(
            data.lastUpdate.contribution,
            CACHE_DURATION.CONTRIBUTION
          ) ||
          !data.contributionTarget
        ) {
          const contributionTarget = await fetchContributionTarget();
          updatedData.contributionTarget = contributionTarget;
          updates.contribution = now;
        }

        // Get rank details from contract
        const rankDetails = await fetchRankDetails();
        updatedData.rankDetails = rankDetails;
      }

      // Update data with new values and timestamps
      updatedData.lastUpdate = updates;
      setData(updatedData);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [
    provider,
    contractAddress,
    data,
    address,
    isConnected,
    needsRefresh,
    fetchUserStats,
    fetchLeaderboard,
    updateUserRank,
    fetchContributionTarget,
    fetchRankDetails,
  ]);

  // Process auto-refresh requests
  useEffect(() => {
    if (shouldRefresh) {
      refreshData();
      setShouldRefresh(false);
    }
  }, [shouldRefresh, refreshData]);

  // Initial data load and network change handler
  useEffect(() => {
    if (isConnected && provider && contractAddress) {
      setShouldRefresh(true);
    }
  }, [isConnected, provider, contractAddress, chainId]);

  return useMemo(
    () => ({
      userStats: data.userStats,
      leaderboard: data.leaderboard,
      userRank: data.userRank,
      contributionTarget: data.contributionTarget,
      rankDetails: data.rankDetails,
      loading,
      error,
      refreshData,
    }),
    [
      data.userStats,
      data.leaderboard,
      data.userRank,
      data.contributionTarget,
      data.rankDetails,
      loading,
      error,
      refreshData,
    ]
  );
};

export default useCounter;
