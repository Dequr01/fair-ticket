"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Fingerprint, X, Loader2 } from "lucide-react";
import Link from "next/link";

import { CONTRACT_ADDRESS } from "@/config/contracts";

function SignContent() {
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId");
  const nonce = searchParams.get("nonce");

  const { isConnected, connect, signer, address, chainId } = useWallet();
  const [signature, setSignature] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signProof = async () => {
    if (!signer || !tokenId || !nonce) return;
    setLoading(true);
    try {
      const _deadline = Math.floor(Date.now() / 1000) + 60;
      setDeadline(_deadline);
      
      const { solidityPackedKeccak256, getBytes } = await import("ethers");
      const messageHash = solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "address", "uint256"],
        [tokenId, nonce, _deadline, CONTRACT_ADDRESS, chainId]
      );

      const sig = await signer.signMessage(getBytes(messageHash));
      setSignature(sig);
    } catch (e: any) {
      console.error(e);
      setError("Signature rejected by wallet.");
    }
    setLoading(false);
  };

  if (!tokenId || !nonce) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 text-center">
       <X className="w-12 h-12 text-red-500 mb-4" />
       <p>Invalid Challenge Parameters.</p>
       <Link href="/" className="mt-4 text-teal-500 underline">Return Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
           <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
              <Fingerprint className="w-8 h-8" />
           </div>
           <h1 className="text-3xl font-bold tracking-tight mb-2">Sign Proof</h1>
           <p className="text-gray-500 text-sm">Verify ownership of Ticket #{tokenId}</p>
        </div>
        
        <div className="bg-gray-900/50 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-2xl">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
               <span>Token ID</span>
               <span className="text-white">#{tokenId}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
               <span>Session</span>
               <span className="text-white font-mono">{nonce}</span>
            </div>
          </div>

          {!isConnected ? (
            <button 
              onClick={connect} 
              className="w-full py-4 bg-teal-500 text-black font-bold rounded-2xl shadow-lg shadow-teal-900/20 active:scale-95 transition-transform min-h-[56px]"
            >
              Connect Wallet
            </button>
          ) : !signature ? (
            <div className="space-y-6">
               <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl flex items-start gap-3">
                  <Shield className="w-5 h-5 text-teal-400 shrink-0" />
                  <p className="text-xs text-teal-100/70 leading-relaxed">
                    This signature is a "Proof of Ownership" and does not cost any gas. It confirms you own this ticket.
                  </p>
               </div>
               <button 
                disabled={loading}
                onClick={signProof} 
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 min-h-[56px]"
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Verification"}
               </button>
               {error && <p className="text-red-400 text-[10px] text-center uppercase font-bold tracking-wider">{error}</p>}
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center">
               <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-xl">
                  <QRCodeSVG 
                      value={JSON.stringify({ signature, deadline })} 
                      size={200} 
                  />
               </div>
               <h3 className="text-green-400 font-bold text-lg mb-1">Proof Ready</h3>
               <p className="text-gray-500 text-xs mb-6">Show this QR to the gatekeeper scanner.</p>
               <Link href="/dashboard" className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em] hover:text-white transition-colors">
                  Close Session
               </Link>
            </div>
          )}
        </div>

        {!signature && (
          <Link href="/" className="mt-10 flex items-center justify-center gap-2 text-gray-600 text-sm font-bold">
            <X className="w-4 h-4" /> Cancel Request
          </Link>
        )}
      </div>
    </div>
  );
}

export default function SignPage() {
    return (
        <Suspense fallback={<div className="text-white">Loading...</div>}>
            <SignContent />
        </Suspense>
    );
}
