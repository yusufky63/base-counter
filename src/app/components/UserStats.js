import React from "react";

const StatCard = ({ value, label, color = "text-blue-600" }) => (
  <div className="rounded-xl border border-blue-200 bg-white p-3 hover:border-blue-300 hover:shadow-md transition-all">
    <div className="flex items-center space-x-4">
      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <span className="text-md">🎯</span>
      </div>
      <div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  </div>
);

const UserStats = ({ userStats, userRank, contributionTarget }) => {
  if (!userStats) {
    return null;
  }

  return (
    <div className="my-1 rounded-xl   bg-white w-full">
      <div className="p-1">
        <h3 className="text-base font-bold text-blue-600 mb-2">Your Stats</h3>
        <div className="space-y-2">
          <StatCard
            value={userStats.contribution || 0}
            label="Contributions"
            color="text-blue-600"
          />

          {userRank && (
            <StatCard
              value={`#${userRank}`}
              label="Current Rank"
              color="text-green-600"
            />
          )}

          {contributionTarget && typeof contributionTarget === "number" && (
            <StatCard
              value={contributionTarget}
              label="Next Target"
              color="text-orange-600"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default UserStats;
