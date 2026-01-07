"use client";

import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import { Wallet, User, Info, Fuel, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { useState, useEffect } from "react";

export default function ConnectPage() {
  const { isConnected, connect, address, isProviderAvailable } = useWallet();
  const [isBrave, setIsBrave] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsBrave(!!(navigator as any).brave);
    if (isConnected) {
      router.replace("/dashboard");
    }
  }, [isConnected, router]);

  const handleContinueAsGuest = () => {
    // Navigate to dashboard in guest mode
    router.push("/dashboard");
  };

  const handleConnect = async () => {
    await connect();
    // After connection, we might stay here to show "Success" or redirect
  };

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center p-6">
      <ParticleBackground />
      
      <div className="relative z-10 w-full max-w-2xl bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-teal-400 mb-3">Welcome to FairTicket</h1>
            <p className="text-gray-400">Choose how you want to interact with the protocol today.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Wallet Option */}
            <div 
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${
                isConnected 
                ? "border-teal-500 bg-teal-500/10" 
                : "border-gray-800 bg-gray-800/20 hover:border-teal-500/50 hover:bg-gray-800/40"
              }`}
              onClick={!isConnected ? handleConnect : undefined}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isConnected ? "bg-teal-500 text-black" : "bg-gray-700 text-teal-400"}`}>
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {isConnected ? "Wallet Linked" : "Link Wallet"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Required for Organizers, Operators, and Ticket Holders.
              </p>
              {isConnected ? (
                <div className="py-2 px-4 bg-black/50 rounded-lg border border-teal-500/30 w-full overflow-hidden">
                  <p className="text-[10px] uppercase text-teal-500 font-bold mb-1">Authenticated As</p>
                  <p className="text-xs font-mono truncate">{address}</p>
                  <p className="text-[10px] text-gray-400 mt-2">Status: Active (User 1)</p>
                  <Link href="/dashboard" className="mt-4 block w-full py-2 bg-teal-500 text-black font-bold rounded-lg text-sm hover:bg-teal-400 transition-colors">
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <button className={`mt-auto w-full py-3 font-bold rounded-xl transition-colors ${!isProviderAvailable ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-teal-500 text-black hover:bg-teal-400'}`}>
                    {!isProviderAvailable ? "Wallet Unavailable" : "Connect Wallet"}
                  </button>
                  <p className="mt-4 text-[10px] text-gray-500 italic">
                    {!isProviderAvailable 
                      ? (isBrave ? "Brave Guest Mode detected. Please use a normal window and enable Brave Wallet." : "Web3 browser or MetaMask extension required.")
                      : "Tip: If clicking doesn't work, open this site inside the MetaMask app's browser."}
                  </p>
                </>
              )}
            </div>

            {/* Guest Option */}
            <div 
              className="p-6 rounded-2xl border-2 border-gray-800 bg-gray-800/20 hover:border-purple-500/50 hover:bg-gray-800/40 transition-all cursor-pointer flex flex-col items-center text-center"
              onClick={handleContinueAsGuest}
            >
              <div className="w-16 h-16 rounded-full bg-gray-700 text-purple-400 flex items-center justify-center mb-4">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Guest / No Wallet</h3>
              <p className="text-sm text-gray-500 mb-4">
                For attendees without a crypto wallet. Your ticket is linked to your Student ID.
              </p>
              <button className="mt-auto w-full py-3 border border-gray-700 hover:border-purple-500/50 text-gray-300 font-bold rounded-xl transition-colors">
                Continue as Guest
              </button>
            </div>
          </div>

          {/* Fee Information Section */}
          <div className="bg-black/40 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 text-teal-400">
              <Info className="w-5 h-5" />
              <h4 className="font-bold">Project Economics & Fees</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <Fuel className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Estimated Gas Fee</p>
                  <p className="text-xs text-gray-500">~$0.01 - $0.05 per TX</p>
                  <p className="text-[10px] text-gray-600 mt-1">Paid to Polygon/Base Network for processing.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Minimum Wallet Balance</p>
                  <p className="text-xs text-gray-500">0.5 - 1.0 POL (or ETH on Base)</p>
                  <p className="text-[10px] text-gray-600 mt-1">Recommended for ~50 assignments/mints.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center text-xs">
              <div className="text-gray-500">
                <span className="text-purple-400 font-bold">Note:</span> Verify tickets is always gas-free for attendees (signatures only).
              </div>
              <Link href="/" className="text-teal-500 hover:underline">Back to Landing</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
