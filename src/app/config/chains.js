const SupportedChains = {
  base: {
    enabled: true,

    chainId: 8453,
    chainName: "Base",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: [
      "https://mainnet.base.org",
      "https://base.g.alchemy.com/v2/6hAsuhqJZ4ecT3Ld2GAy8W0RUeFPFmyl",
    ],
    blockExplorerUrls: ["https://basescan.org"],
    imageUrl:
      "https://raw.githubusercontent.com/zkcodex/zkCodex-Assets/refs/heads/main/Icons/base.png",
    contracts: {
      Counter: "0x65b296D7bb0994f6b6723aD0E22958EBcD35576E",
    },
  },
};

export default SupportedChains;

/**
 * Get chains that support a specific feature
 * @param {string} feature - Feature name to check for
 * @returns {string[]} Array of chain keys supporting the feature
 */
export const getSupportedChainsForFeature = (feature) => {
  return Object.entries(SupportedChains)
    .filter(([, chain]) => chain.enabled && chain.features[feature])
    .map(([key]) => key);
};

/**
 * Check if a feature is supported on a specific chain
 * @param {number} chainId - Chain ID to check
 * @param {string} feature - Feature name to check for
 * @returns {boolean} True if feature is supported
 */
export const isFeatureSupported = (chainId, feature) => {
  const chain = Object.values(SupportedChains).find(
    (chain) => chain.chainId === chainId
  );
  return (chain?.enabled && chain?.features[feature]) || false;
};

/**
 * Get the default chain
 * @returns {Object} Default chain configuration
 */
export const getDefaultChain = () => {
  return SupportedChains.base;
};

/**
 * Check if a chain is enabled
 * @param {number} chainId - Chain ID to check
 * @returns {boolean} True if chain is enabled
 */
export const isSupportedChain = (chainId) => {
  const chain = Object.values(SupportedChains).find(
    (chain) => chain.chainId === chainId
  );
  return chain?.enabled || false;
};
