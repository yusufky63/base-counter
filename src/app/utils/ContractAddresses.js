import SupportedChains from "../config/chains";

  
const ContractAddresses = {
  Counter: Object.entries(SupportedChains).reduce((acc, [chainKey, chain]) => {
    if (chain.enabled && chain.contracts?.Counter) {
      acc[chainKey] = chain.contracts.Counter;
    }
    return acc;
  }, {}),
};

// Get contract address by chain ID
export const getContractAddress = (contractName, chainId) => {
  // Check if the chain is supported
  const chain = Object.values(SupportedChains).find(
    (chain) => chain.chainId === chainId
  );

  if (!chain) {
    console.error("[getContractAddress] Error: Unsupported chain");
    throw new Error("Unsupported chain");
  }

  if (!chain.enabled) {
    console.error("[getContractAddress] Error: Chain is not active");
    throw new Error("Chain is not active");
  }

  if (!chain.contracts.Counter) {
    console.error(
      "[getContractAddress] Error: This chain does not support the Counter feature"
    );
    throw new Error("This chain does not support the Counter feature");
  }

  // Find the chain name from the chain ID
  const chainKey = Object.entries(SupportedChains).find(
    ([, c]) => c.chainId === chainId
  )?.[0];

  if (!chainKey) {
    throw new Error("Chain name not found");
  }

  const contractAddress = ContractAddresses[contractName]?.[chainKey];

  if (!contractAddress) {
    console.error(
      `[getContractAddress] Error: ${chain.chainName} chain ${contractName} contract address not found`
    );
    throw new Error(
      `${chain.chainName} chain ${contractName} contract address not found`
    );
  }

  return contractAddress;
};

// Check if contract is deployed on chain
export const isContractDeployed = (contractName, chainId) => {
  const chainKey = Object.entries(SupportedChains).find(
    ([, chain]) => chain.chainId === chainId
  )?.[0];

  const isDeployed =
    !!chainKey &&
    !!ContractAddresses[contractName]?.[chainKey] &&
    ContractAddresses[contractName][chainKey] !== "";

  return isDeployed;
};

export default ContractAddresses;
