"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { CHAIN_ID, SUPPORTED_NETWORKS } from "@/config/contracts";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  isProviderAvailable: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [isProviderAvailable, setIsProviderAvailable] = useState<boolean>(false);

  useEffect(() => {
    setIsProviderAvailable(typeof window !== "undefined" && !!window.ethereum);
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!window.ethereum) {
      // Check if mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Deep link to open the current URL in MetaMask's in-app browser
        const url = window.location.href.replace(/^https?:\/\//, "");
        window.location.href = `https://metamask.app.link/dapp/${url}`;
        return;
      }

      // Check for Brave
      const isBrave = !!(navigator as any).brave;
      if (isBrave) {
        alert("Brave Wallet not detected. Please ensure you are NOT in Guest Mode and have the Brave Wallet enabled in settings. Alternatively, install MetaMask.");
      } else {
        alert("Please install MetaMask or use a Web3-compatible browser!");
      }
      return;
    }

    try {
      const _provider = new BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _address = await _signer.getAddress();
      const _network = await _provider.getNetwork();

      setProvider(_provider);
      setSigner(_signer);
      setAddress(_address);
      setChainId(Number(_network.chainId));
    } catch (error) {
      console.error("Connection failed", error);
    }
  }, []);

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    const hexChainId = `0x${CHAIN_ID.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (error: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (error.code === 4902) {
          const network = SUPPORTED_NETWORKS[CHAIN_ID];
          if (network) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: hexChainId,
                  chainName: network.name,
                  nativeCurrency: network.currency,
                  rpcUrls: [network.rpcUrl],
                  blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : []
                }],
              });
            } catch (addError) {
              console.error("Failed to add network", addError);
            }
          } else {
            alert(`Please add the network with Chain ID ${CHAIN_ID} to your wallet.`);
          }
        }
        console.error("Network switch failed", error);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
        // Auto connect if authorized before
        window.ethereum.request({ method: 'eth_accounts' })
            .then((accounts: string[]) => {
                if (accounts.length > 0) connect();
            });

        window.ethereum.on('accountsChanged', () => connect());
        window.ethereum.on('chainChanged', () => connect());
    }
  }, [connect]);

  return {
    address,
    chainId,
    isConnected: !!address,
    isCorrectNetwork: chainId === CHAIN_ID,
    isProviderAvailable,
    provider,
    signer,
    connect,
    switchNetwork
  };
}
