import React from "react";
import Leaderboard from "./Leaderboard";
import { FiX } from "react-icons/fi";
import UserStats from "./UserStats";

const LeaderboardModal = ({
  theme,
  onClose,
  leaderboard,
  address,
  loading,
  userStats,
  userRank,
  rankDetails,
  contributionTarget,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 flex items-center justify-center p-2">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative w-full max-w-md h-auto max-h-[80vh] flex flex-col bg-white border border-gray-200 rounded-2xl shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium tracking-tight text-gray-800">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  Leaderboard
                </span>
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full transition-colors hover:bg-gray-100"
              >
                <FiX className="text-red-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            <UserStats 
              userStats={userStats} 
              userRank={userRank}
              contributionTarget={contributionTarget}
              rankDetails={rankDetails}
            />

            <Leaderboard
              theme={theme}
              loading={loading}
              leaderboard={leaderboard}
              userAddress={address}
              userStats={userStats}
              userRank={userRank}
              hideTitle={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
