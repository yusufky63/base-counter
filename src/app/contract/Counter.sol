// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OnChainCounter is Pausable, Ownable {
    using Address for address payable;

    // Custom errors
    error InvalidAddress();
    error DirectDepositsNotAllowed();
    error IncorrectFee();
    error InvalidLeaderboardSize();
    error InvalidTopUsersCount();
    error InvalidFee();
    error FeeTransferFailed();

    // Constants
    uint256 private constant INITIAL_FEE = 0.00001 ether;
    uint256 private constant INITIAL_LEADERBOARD_SIZE = 50;
    uint256 public constant MIN_CONTRIBUTIONS_FOR_LEADERBOARD = 1;

    // State variables
    uint256 public counter;
    uint256 public fee;
    uint256 public maxLeaderboardSize;

    // Mappings
    mapping(address => UserStats) public userStats;
    mapping(address => uint256) private leaderboardPosition;

    // Events
    event CounterIncremented(address indexed user, uint256 newCount, uint256 timestamp, uint256 blockNumber);
    event LeaderboardUpdated(address indexed user, uint256 contributions, uint256 rank, uint256 timestamp, uint256 blockNumber);
    event FeeUpdated(uint256 oldFee, uint256 newFee, uint256 blockNumber);
    event LeaderboardSizeUpdated(uint256 oldSize, uint256 newSize, uint256 blockNumber);
    event Paused(uint256 timestamp);
    event Unpaused(uint256 timestamp);

    // Structures
    struct LeaderboardEntry {
        address user;
        uint256 score;
        uint256 lastUpdate;
    }
    LeaderboardEntry[] private leaderboard;
    uint256 public leaderboardSize;

    struct UserStats {
        uint256 contributions;
        bool inLeaderboard;
    }

    struct TopUserInfo {
        address user;
        uint256 score;
        uint256 lastUpdate;
    }

    constructor() Ownable(msg.sender) {
        fee = INITIAL_FEE;
        maxLeaderboardSize = INITIAL_LEADERBOARD_SIZE;
        leaderboardSize = 0;
    }

    modifier validAddress(address _address) {
        if (_address == address(0)) revert InvalidAddress();
        _;
    }

    function incrementCounter() external payable whenNotPaused {
        if (msg.value != fee) revert IncorrectFee();

        // Transfer fee directly to owner
        (bool success, ) = payable(owner()).call{value: msg.value}("");
        if (!success) revert FeeTransferFailed();

        counter++;
        _updateUserStats(msg.sender, 1);

        if (userStats[msg.sender].contributions >= MIN_CONTRIBUTIONS_FOR_LEADERBOARD || userStats[msg.sender].inLeaderboard) {
            emit CounterIncremented(msg.sender, counter, block.timestamp, block.number);
        }
    }

    function _updateUserStats(address user, uint256 incrementAmount) private {
        UserStats storage stats = userStats[user];
        stats.contributions += incrementAmount;

        if (stats.contributions >= MIN_CONTRIBUTIONS_FOR_LEADERBOARD) {
            _updateLeaderboard(user, stats.contributions);
        }
    }

    function _updateLeaderboard(address user, uint256 score) internal {
        if (user == address(0)) revert InvalidAddress();
        if (score < MIN_CONTRIBUTIONS_FOR_LEADERBOARD) return;

        bool userExists = userStats[user].inLeaderboard;
        uint256 existingPos = userExists ? leaderboardPosition[user] : type(uint256).max;
        uint256 oldRank = userExists ? existingPos + 1 : 0;

        if (userExists) {
            leaderboard[existingPos].score = score;
            leaderboard[existingPos].lastUpdate = block.timestamp;
            _heapifyDown(existingPos);
            _heapifyUp(existingPos);
        } else if (leaderboardSize < maxLeaderboardSize) {
            leaderboard.push(LeaderboardEntry({user: user, score: score, lastUpdate: block.timestamp}));
            leaderboardPosition[user] = leaderboardSize;
            leaderboardSize++;
            userStats[user].inLeaderboard = true;
        } else if (score > leaderboard[maxLeaderboardSize - 1].score) {
            address oldUser = leaderboard[maxLeaderboardSize - 1].user;
            userStats[oldUser].inLeaderboard = false;
            delete leaderboardPosition[oldUser];
            leaderboard[maxLeaderboardSize - 1] = LeaderboardEntry({user: user, score: score, lastUpdate: block.timestamp});
            leaderboardPosition[user] = maxLeaderboardSize - 1;
            _heapifyUp(maxLeaderboardSize - 1);
            userStats[user].inLeaderboard = true;
        }

        uint256 newRank = userStats[user].inLeaderboard ? leaderboardPosition[user] + 1 : 0;
        if (newRank > 0 && newRank != oldRank && (newRank <= 10 || oldRank == 0)) {
            emit LeaderboardUpdated(user, score, newRank, block.timestamp, block.number);
        }
    }

    function _heapifyUp(uint256 index) private {
        while (index > 0) {
            uint256 parentIdx = (index - 1) / 2;
            if (leaderboard[parentIdx].score >= leaderboard[index].score) break;
            _swapEntries(index, parentIdx);
            index = parentIdx;
        }
    }

    function _heapifyDown(uint256 index) private {
        uint256 length = leaderboardSize;
        while (true) {
            uint256 largest = index;
            uint256 leftChild = 2 * index + 1;
            uint256 rightChild = 2 * index + 2;

            if (leftChild < length && leaderboard[leftChild].score > leaderboard[largest].score) largest = leftChild;
            if (rightChild < length && leaderboard[rightChild].score > leaderboard[largest].score) largest = rightChild;
            if (largest == index) break;
            _swapEntries(index, largest);
            index = largest;
        }
    }

    function _swapEntries(uint256 i, uint256 j) private {
        if (leaderboard[i].user == address(0) || leaderboard[j].user == address(0)) revert InvalidAddress();
        LeaderboardEntry memory temp = leaderboard[i];
        leaderboard[i] = leaderboard[j];
        leaderboard[j] = temp;
        leaderboardPosition[leaderboard[i].user] = i;
        leaderboardPosition[leaderboard[j].user] = j;
    }

    function getUserRank(address user) external view validAddress(user) returns (uint256) {
        return userStats[user].inLeaderboard ? leaderboardPosition[user] + 1 : 0;
    }

    function getUserStats(address user) external view validAddress(user)
        returns (uint256 contributions, uint256 rank, bool inLeaderboard) {
        UserStats memory stats = userStats[user];
        uint256 userRank = stats.inLeaderboard ? leaderboardPosition[user] + 1 : 0;
        return (stats.contributions, userRank, stats.inLeaderboard);
    }

    function getTopUsers(uint256 n) external view returns (TopUserInfo[] memory topUsers) {
        if (n == 0 || n > leaderboardSize) revert InvalidTopUsersCount();
        topUsers = new TopUserInfo[](n);
        for (uint256 i = 0; i < n; i++) {
            topUsers[i] = TopUserInfo({
                user: leaderboard[i].user,
                score: leaderboard[i].score,
                lastUpdate: leaderboard[i].lastUpdate
            });
        }
    }

    function setFee(uint256 newFee) external onlyOwner {
        if (newFee == 0) revert InvalidFee();
        emit FeeUpdated(fee, newFee, block.number);
        fee = newFee;
    }

    receive() external payable {
        revert DirectDepositsNotAllowed();
    }

    function setMaxLeaderboardSize(uint256 newSize) external onlyOwner {
        if (newSize == 0 || newSize == maxLeaderboardSize) revert InvalidLeaderboardSize();

        uint256 oldSize = maxLeaderboardSize;
        maxLeaderboardSize = newSize;

        if (newSize < leaderboardSize) {
            for (uint256 i = newSize; i < leaderboardSize; i++) {
                address user = leaderboard[i].user;
                if (user != address(0)) {
                    userStats[user].inLeaderboard = false;
                    delete leaderboardPosition[user];
                }
                delete leaderboard[i];
            }
            leaderboardSize = newSize;
        }

        emit LeaderboardSizeUpdated(oldSize, newSize, block.number);
    }

    function getContributionTarget(address user) external view validAddress(user)
        returns (uint256 current, uint256 target, uint256 remaining) {
        UserStats storage stats = userStats[user];
        current = stats.contributions;
        target = MIN_CONTRIBUTIONS_FOR_LEADERBOARD;
        remaining = current >= target ? 0 : target - current;
    }

    function getUserRankDetails(address user) external view validAddress(user)
        returns (uint256 rank, uint256 nextRankDiff, address nextRankAddress) {
        rank = userStats[user].inLeaderboard ? leaderboardPosition[user] + 1 : 0;
        if (rank == 0 || rank == 1) return (rank, 0, address(0));
        address nextUser = leaderboard[rank - 2].user;
        uint256 nextUserScore = leaderboard[rank - 2].score;
        uint256 userScore = userStats[user].contributions;
        return (rank, nextUserScore > userScore ? nextUserScore - userScore : 0, nextUser);
    }

    function pause() external onlyOwner {
        _pause();
        emit Paused(block.timestamp);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit Unpaused(block.timestamp);
    }
}