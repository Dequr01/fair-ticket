"use client";

import { useWallet } from "@/hooks/useWallet";
import { CHAIN_ID, SUPPORTED_NETWORKS } from "@/config/contracts";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isCorrectNetwork, switchNetwork } = useWallet();

  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-orange-500/50 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Wrong Network Detected</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            FairTicket is deployed on <span className="text-orange-400 font-bold">{SUPPORTED_NETWORKS[CHAIN_ID]?.name || "Unknown Network"}</span>. 
            Please switch your wallet to continue using the application.
          </p>
          <button 
            onClick={switchNetwork}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
          >
            <RefreshCw className="w-5 h-5" />
            Switch Network
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
