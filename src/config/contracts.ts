export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 31337;

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer?: string;
}

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    name: "Hardhat Local (Tunnel)",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  137: {
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    currency: { name: "POL", symbol: "POL", decimals: 18 },
    blockExplorer: "https://polygonscan.com"
  },
  80002: {
    name: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    currency: { name: "POL", symbol: "POL", decimals: 18 },
    blockExplorer: "https://amoy.polygonscan.com"
  },
  8453: {
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorer: "https://basescan.org"
  },
  84532: {
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorer: "https://sepolia.basescan.org"
  }
};