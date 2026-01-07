"use client";

import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "@/hooks/useWallet";
import { Contract } from "ethers";
import FairTicketArtifact from "@/artifacts/src/contracts/FairTicket.sol/FairTicket.json";
import { ArrowLeft, Scan, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

import { CONTRACT_ADDRESS } from "@/config/contracts";
import { useScannerSound } from "@/hooks/useScannerSound";

export default function VerifyPage() {
  const { isConnected, connect, signer, isProviderAvailable } = useWallet();
  const [isBrave, setIsBrave] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const playSound = useScannerSound();

  useEffect(() => {
    setIsBrave(!!(navigator as any).brave);
  }, []);

  const [step, setStep] = useState<"IDLE" | "CHALLENGE" | "VERIFYING" | "SUCCESS" | "ERROR" | "GUEST_VERIFY">("IDLE");
  
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState("");

  // Guest Identity Fields
  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");

  useEffect(() => {
    const readerElement = document.getElementById("reader");
    if (!readerElement || step !== "IDLE") return;

    const scanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 15, 
        qrbox: (viewWidth, viewHeight) => {
            const minSize = Math.min(viewWidth, viewHeight);
            return { width: minSize * 0.7, height: minSize * 0.7 };
        },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(onScanSuccess, (err) => {});

    function onScanSuccess(decodedText: string) {
      handleScan(decodedText);
    }

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isConnected, step]);

  const handleScan = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (step === "IDLE" && parsed.tokenId) {
        setTicketId(parsed.tokenId);
        
        // Check if it's a Guest Ticket (deterministic address)
        const { Contract, keccak256, toUtf8Bytes } = await import("ethers");
        const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
        
        const [ticketData, owner] = await contract.getTicketDetails(parsed.tokenId);
        
        // If owner matches the deterministic guest address for its own hashes
        const guestAddr = await contract.generateGuestAddress(ticketData.holderNameHash, ticketData.holderStudentIdHash);
        
        if (owner.toLowerCase() === guestAddr.toLowerCase()) {
           setStep("GUEST_VERIFY");
        } else {
           const newNonce = Math.floor(Math.random() * 1000000).toString();
           setNonce(newNonce);
           setStep("CHALLENGE");
        }
      }
      else if (step === "CHALLENGE" && parsed.signature && parsed.deadline) {
        setStep("VERIFYING");
        await verifyOnChain(parsed.signature, parsed.deadline);
      }
    } catch (e) {
      console.error("Invalid QR Format", e);
    }
  };

  const checkInGuestOnChain = async () => {
    if (!signer || !ticketId || !guestName || !guestId) return;
    try {
      setStep("VERIFYING");
      const { Contract, keccak256, toUtf8Bytes } = await import("ethers");
      const cleanName = guestName.trim();
      const cleanId = guestId.trim();
      
      const nameHash = keccak256(toUtf8Bytes(cleanName));
      const studentIdHash = keccak256(toUtf8Bytes(cleanId));

      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      
      // Pre-check: Verify hashes match BEFORE sending transaction
      setVerificationStatus("Verifying Identity...");
      const [ticketData] = await contract.getTicketDetails(ticketId);
      
      if (ticketData.holderNameHash !== nameHash || ticketData.holderStudentIdHash !== studentIdHash) {
         playSound('error');
         setVerificationStatus("Identity Mismatch: Name or ID is incorrect.");
         setStep("ERROR");
         return;
      }

      setVerificationStatus("Confirming Entry...");
      
      const tx = await contract.checkInGuest(ticketId, nameHash, studentIdHash);
      await tx.wait();
      
      playSound('success');
      setStep("SUCCESS");
    } catch (e: any) {
      console.error(e);
      const reason = e.reason || e.message || "Guest Verification Failed";
      playSound('error');
      setVerificationStatus(reason);
      setStep("ERROR");
    }
  };

  const verifyOnChain = async (signature: string, deadline: number) => {
    if (!signer || !ticketId || !nonce) return;
    try {
      const { Contract, Interface } = await import("ethers");
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const iface = new Interface(FairTicketArtifact.abi);
      setVerificationStatus("Consulting Ledger...");
      
      const tx = await contract.verifyTicket(ticketId, nonce, deadline, signature);
      setVerificationStatus("Finalizing...");
      const receipt = await tx.wait();

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "VerificationFailed") throw new Error(`Verification Failed: ${parsed.args[1]}`);
          if (parsed?.name === "TicketLocked") {
             const unlockDate = new Date(Number(parsed.args[1]) * 1000);
             throw new Error(`Locked until ${unlockDate.toLocaleTimeString()}`);
          }
        } catch (e) {
          if (e instanceof Error && (e.message.includes("Verification Failed") || e.message.includes("Locked"))) throw e;
        }
      }
      playSound('success');
      setStep("SUCCESS");
    } catch (e: any) {
      const reason = e.reason || e.message || "Verification Failed";
      playSound('error');
      setVerificationStatus(reason);
      setStep("ERROR");
    }
  };

  const reset = () => {
    setStep("IDLE");
    setTicketId(null);
    setNonce(null);
    setScanResult(null);
    setVerificationStatus("");
    setGuestName("");
    setGuestId("");
  };

  if (!isConnected) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
       <Scan className={`w-16 h-16 ${!isProviderAvailable ? "text-red-900/50" : "text-gray-700"} mb-6`} />
       <h1 className="text-2xl font-bold text-white mb-2">Gatekeeper Auth</h1>
       <p className="text-gray-500 mb-8 max-w-xs">
         {!isProviderAvailable 
           ? (isBrave ? "Brave Wallet not detected. Please disable Guest Mode and enable Brave Wallet to verify tickets." : "A Web3-compatible browser or MetaMask is required to verify tickets.")
           : "Connecting your organizer wallet is required to submit verification proofs to the blockchain."}
       </p>
       {isProviderAvailable ? (
         <button onClick={connect} className="w-full max-w-sm py-4 bg-teal-500 text-black font-bold rounded-2xl min-h-[56px] shadow-lg shadow-teal-900/20">
           Connect Wallet
         </button>
       ) : (
         <div className="w-full max-w-sm p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-300 text-sm font-bold">
           Web3 Provider Missing
         </div>
       )}
       <Link href="/" className="mt-6 text-gray-500 flex items-center gap-2">
         <ArrowLeft className="w-4 h-4" /> Exit
       </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center pt-6 px-4 pb-12">
      <header className="w-full max-w-md flex justify-between items-center mb-8 px-2">
         <Link href="/dashboard" className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
         </Link>
         <h1 className="text-lg font-bold tracking-tight uppercase text-teal-500">Gate Scanner</h1>
         <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* Main UI Container */}
      <div className="w-full max-w-md flex flex-col items-center">
          {step === "IDLE" && (
            <div className="text-center mb-6">
               <p className="text-gray-400 text-sm">Align the attendee's Ticket QR within the frame</p>
            </div>
          )}
          
          {step === "CHALLENGE" && (
            <div className="bg-gray-900 border border-teal-500/30 p-8 rounded-3xl text-center mb-8 w-full shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold text-teal-400 mb-2">Identity Proof</h2>
              <p className="mb-6 text-xs text-gray-400">Attendee must scan this to sign the challenge</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                <QRCodeSVG 
                    value={JSON.stringify({ 
                        type: "CHALLENGE", 
                        url: `${window.location.origin}/sign?tokenId=${ticketId}&nonce=${nonce}` 
                    })} 
                    size={220} 
                />
              </div>
              <p className="mt-6 text-xs font-mono text-gray-600 bg-black/50 py-2 rounded-lg">Session ID: {nonce}</p>
              <div className="mt-6 flex items-center justify-center gap-3 text-teal-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Waiting for Response...</span>
              </div>
            </div>
          )}

          {step === "GUEST_VERIFY" && (
            <div className="bg-gray-900 border border-purple-500/30 p-8 rounded-3xl text-center mb-8 w-full shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold text-purple-400 mb-2">Guest Check-In</h2>
              <p className="mb-6 text-xs text-gray-400">Verify physical Student ID and enter details</p>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Full Name</label>
                  <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="As shown on ID"
                    className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1 font-bold">Student ID</label>
                  <input 
                    type="text" 
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    placeholder="ID Number"
                    className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none"
                  />
                </div>
                <button 
                  onClick={checkInGuestOnChain}
                  className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl min-h-[56px] shadow-lg shadow-purple-900/20 mt-4"
                >
                  Verify & Check In
                </button>
                <button onClick={reset} className="w-full py-2 text-gray-500 text-xs font-bold uppercase tracking-widest text-center">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === "VERIFYING" && (
            <div className="flex flex-col items-center justify-center py-20">
                 <div className="w-20 h-20 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-6"></div>
                 <p className="text-xl font-bold text-teal-400 animate-pulse">{verificationStatus}</p>
                 <p className="text-gray-500 text-sm mt-2">Checking Polygon Mainnet...</p>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="bg-green-900/10 border border-green-500/50 p-10 rounded-3xl text-center w-full shadow-2xl animate-in zoom-in-95">
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-green-400 mb-2">ACCESS GRANTED</h2>
                <p className="text-gray-400 mb-8">Ticket #{ticketId} is valid and owner verified.</p>
                <button onClick={reset} className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl min-h-[56px] shadow-lg shadow-green-900/20">
                  Ready for Next
                </button>
            </div>
          )}

          {step === "ERROR" && (
            <div className="bg-red-900/10 border border-red-500/50 p-10 rounded-3xl text-center w-full shadow-2xl animate-in zoom-in-95">
                <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-red-400 mb-2">ENTRY DENIED</h2>
                <p className="text-red-200/70 mb-8 font-medium">{verificationStatus}</p>
                <button onClick={reset} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl min-h-[56px] shadow-lg shadow-red-900/20">
                  Retry Scanner
                </button>
            </div>
          )}

          {/* Scanner view: hidden when showing success/error/challenge to save battery/performance */}
          {(step === "IDLE" || step === "CHALLENGE" || step === "VERIFYING") && (
             <div className="w-full mt-4">
                <div id="reader" className="w-full overflow-hidden rounded-3xl border-2 border-gray-800 bg-gray-900/50 shadow-inner"></div>
                {step === "CHALLENGE" && (
                   <button onClick={reset} className="w-full mt-6 py-3 text-gray-500 text-sm font-bold border border-gray-800 rounded-xl">
                      Cancel Scanning
                   </button>
                )}
             </div>
          )}
      </div>
    </div>
  );
}
