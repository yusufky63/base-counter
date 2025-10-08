import React, { useState, useMemo } from "react";

const MIN_CONTRIBUTIONS_FOR_LEADERBOARD = 0; // Minimum number of contributions

const Leaderboard = ({
  leaderboard = [],
  userAddress,
  userStats,
  userRank,
  loading,
  hideTitle = false,
}) => {
  console.log(leaderboard);
  const [page, setPage] = useState(0);
  const itemsPerPage = 5;

  // Process and memoize leaderboard data
  const processedLeaderboard = useMemo(() => {
    if (!Array.isArray(leaderboard)) return [];
    console.log("[Leaderboard.js] Incoming data:", leaderboard);

    let processedData = leaderboard.filter(
      (user) =>
        user &&
        user.userAddress &&
        user.userAddress !== "0x0000000000000000000000000000000000000000" &&
        Number(user.contributions) >= MIN_CONTRIBUTIONS_FOR_LEADERBOARD
    );

    // Add user to leaderboard if they have contributions but aren't in the list
    if (userStats && userRank && userAddress && userStats.contribution > 0) {
      const userInLeaderboard = processedData.find(
        (user) => user.userAddress?.toLowerCase() === userAddress.toLowerCase()
      );

      if (!userInLeaderboard) {
        processedData.push({
          userAddress: userAddress,
          contributions: userStats.contribution,
          lastUpdate: Date.now(),
        });
      }
    }

    return processedData.sort(
      (a, b) => Number(b.contributions) - Number(a.contributions)
    );
  }, [leaderboard, userStats, userRank, userAddress]);

  // Loading skeleton UI
  if (loading) {
    return (
      <div className="p-3 rounded-2xl border border-blue-200 bg-white shadow-md">
        {!hideTitle && (
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-1/3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg"></div>
            <div className="h-6 w-1/4 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full"></div>
          </div>
        )}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 mb-4 animate-pulse"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-100 to-blue-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-blue-100 to-blue-200 rounded w-1/4"></div>
              <div className="h-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!processedLeaderboard.length) {
    return (
      <div className="p-3 rounded-2xl border border-blue-200 bg-white shadow-md">
        {!hideTitle && (
          <h2 className="text-xl font-bold mb-3 text-blue-600">Leaderboard</h2>
        )}
        <div className="text-center py-8 text-gray-500">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-lg mb-2">No one is on the leaderboard yet</p>
          <p className="text-sm opacity-75">
            Be the first leader! You can enter the list by making at least{" "}
            {MIN_CONTRIBUTIONS_FOR_LEADERBOARD} contribution
            {MIN_CONTRIBUTIONS_FOR_LEADERBOARD > 1 ? "s" : ""}.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(processedLeaderboard.length / itemsPerPage);
  const currentPageData = processedLeaderboard.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  const formatAddress = (address) => {
    if (!address) return "Unknown";
    if (address === userAddress) return "You";
    return `${address.slice(0, 3)}...${address.slice(-4)}`;
  };

  const getPositionEmoji = (position) => {
    if (position === 1) return "👑";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return position;
  };

  return (
    <div className="p-2 rounded-2xl   bg-white ">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-blue-600">Leaderboard</h2>
        <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
          Total: {processedLeaderboard.length} User
          {processedLeaderboard.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="space-y-1">
        {currentPageData.map((user, index) => {
          const position = page * itemsPerPage + index + 1;
          const isCurrentUser = user.userAddress === userAddress;

          return (
            <div
              key={user.userAddress}
              className={`relative group flex items-center p-2 rounded-xl border transition-all ${
                isCurrentUser
                  ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${
                  position <= 3
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                } font-bold text-base sm:text-lg`}
              >
                {getPositionEmoji(position)}
              </div>

              <div className="ml-3 flex-grow min-w-0">
                <div
                  className={`font-medium truncate text-xs sm:text-sm ${
                    isCurrentUser ? "text-blue-600 font-bold" : "text-gray-900"
                  }`}
                >
                  {formatAddress(user.userAddress)}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                  <span className="text-xs sm:text-sm text-gray-500">
                    {Number(user.contributions).toLocaleString()} contribution
                    {Number(user.contributions) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 rounded-xl transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none bg-blue-50/50" />
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-row justify-between items-center">
          <div className="text-xs sm:text-sm text-gray-600">
            {page + 1} / {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed text-xs sm:text-sm text-blue-600 transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed text-xs sm:text-sm text-blue-600 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
