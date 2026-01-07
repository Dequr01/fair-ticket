"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Contract, BrowserProvider } from "ethers";
import FairTicketArtifact from "@/artifacts/src/contracts/FairTicket.sol/FairTicket.json";
import { QrCode, Plus, LayoutDashboard, Settings, Info, XCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { CONTRACT_ADDRESS, CHAIN_ID } from "@/config/contracts";
import { enqueue, processQueue } from "@/lib/offlineQueue";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Dashboard() {
  const { isConnected, connect, address, signer, isProviderAvailable } = useWallet();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventSupply, setNewEventSupply] = useState(100);
  const [supplyError, setSupplyError] = useState(false);
  const [mintAddress, setMintAddress] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderStudentId, setHolderStudentId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isBoothMode, setIsBoothMode] = useState(false);
  const [isGuestModeAttendee, setIsGuestModeAttendee] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isBrave, setIsBrave] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isBoothOperator, setIsBoothOperator] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    setIsBrave(!!(navigator as any).brave);
  }, []);

  useEffect(() => {
    if (isConnected && signer) {
      // Force a re-check of roles and events when signer is available
      checkBoothRole();
      loadEvents();

      // Process Offline Queue
      if (navigator.onLine) {
         const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
         processQueue(contract).then(() => {
             loadEvents();
         });
      }
    } else {
      // Reset states when disconnected
      setIsBoothOperator(false);
      setEvents([]);
      hasLoaded.current = false;
    }

    // Listen for network recovery
    const handleOnline = () => {
       if (isConnected && signer) {
          toast.info("Back Online! Syncing queued tickets...");
          const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
          processQueue(contract).then(() => {
             loadEvents();
             toast.success("Sync Complete");
          });
       }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isConnected, signer]);

  const checkBoothRole = async () => {
    if (!signer) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const role = await contract.BOOTH_OPERATOR_ROLE();
      const hasRole = await contract.hasRole(role, await signer.getAddress());
      setIsBoothOperator(hasRole);
    } catch (e: any) {
      // If it's a CALL_EXCEPTION or missing revert data, the contract isn't deployed on this chain.
      // We silenty fail here because loadEvents will trigger the main UI error state.
      if (e.code === "CALL_EXCEPTION" || e.message.includes("missing revert data")) {
        setIsBoothOperator(false);
      } else {
        console.error("Role check failed", e);
      }
    }
  };

  const grantBoothRole = async () => {
    if (!signer) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const BOOTH_OPERATOR_ROLE = await contract.BOOTH_OPERATOR_ROLE();
      const tx = await contract.grantRole(BOOTH_OPERATOR_ROLE, await signer.getAddress());
      await tx.wait();
      alert("You are now a Booth Operator!");
      setIsBoothOperator(true);
    } catch (e: any) {
      console.error(e);
      alert(`Role grant failed: ${e.reason || e.message}`);
    }
  };

  const loadEvents = async () => {
    if (!signer) return;
    setLoading(true);
    setConnectionError(null);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const organizerAddress = await address;
      const eventIds = await contract.getOrganizerEvents(organizerAddress);

      // Fetch all EventCreated logs for this organizer to get names efficiently
      const filter = contract.filters.EventCreated(null, organizerAddress);
      const logs = await contract.queryFilter(filter);
      const nameMap: Record<number, string> = {};

      logs.forEach(log => {
        const parsed = contract.interface.parseLog(log as any);
        if (parsed) {
          nameMap[Number(parsed.args.eventId)] = parsed.args.name;
        }
      });

      const loadedEvents = [];
      for (const id of eventIds) {
        const evt = await contract.events(id);
        loadedEvents.push({
          id: Number(evt.id),
          name: nameMap[Number(evt.id)] || "Unnamed Event",
          maxSupply: Number(evt.maxSupply),
          mintedCount: Number(evt.mintedCount),
          isActive: evt.isActive
        });
      }
      setEvents(loadedEvents);
      hasLoaded.current = true;
    } catch (e: any) {
      let errorMsg = e.reason || e.message || "Failed to connect to smart contract";

      const isMissingContract = e.code === "CALL_EXCEPTION" || e.message.includes("missing revert data");

      if (!isMissingContract) {
        console.error("Error loading events:", e);
      }

      if (e.code === "CALL_EXCEPTION" || e.message.includes("missing revert data")) {
        errorMsg = "Contract Not Found! Make sure you have deployed the contract and are on the correct network.";
        setShowSetupGuide(true);
        hasLoaded.current = false;
        setIsBoothOperator(false);
      }

      setConnectionError(errorMsg);
    }
    setLoading(false);
  };

  const createEvent = async () => {
    if (!signer || !newEventName) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const tx = await contract.createEvent(newEventName, newEventSupply);
      await tx.wait();
      toast.success("Event created successfully!");
      loadEvents();
      setNewEventName("");
      setShowCreateForm(false);
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.reason || e.message || "Unknown error";
      toast.error(`Failed to create event: ${errorMessage}`);
    }
  };

  const mintTicket = async (eventId: number) => {
    if (!signer || !mintAddress) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const tx = await contract.mintTicket(eventId, mintAddress);
      await tx.wait();
      toast.success("Ticket Minted Successfully!");
      loadEvents();
    } catch (e) {
      console.error(e);
      toast.error("Mint failed. Check console for details.");
    }
  };

  const assignTicket = async (eventId: number) => {
    // If not guest mode, require the wallet address. Always require Name and ID for Booth Mode.
    const isWalletMissing = !isGuestModeAttendee && !mintAddress;

    if (!signer || isWalletMissing || !holderName || !holderStudentId) {
      toast.error('Please fill all required fields for Booth Assignment');
      return;
    }

    try {
      const { keccak256, toUtf8Bytes } = await import('ethers');
      const nameHash = keccak256(toUtf8Bytes(holderName.trim()));
      const studentIdHash = keccak256(toUtf8Bytes(holderStudentId.trim()));

      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);

      let targetAddress = mintAddress;
      if (isGuestModeAttendee) {
        targetAddress = await contract.generateGuestAddress(nameHash, studentIdHash);
      }

      if (!targetAddress || targetAddress === '') {
        toast.error('Please provide a wallet address or use Guest Mode');
        return;
      }

      if (!navigator.onLine) {
        // Offline: enqueue assignment for later processing
        enqueue({
          eventId,
          targetAddress,
          nameHash: nameHash.toString(),
          studentIdHash: studentIdHash.toString()
        });
        toast.warning('You are offline. Assignment queued and will be processed when connection is restored.');
      } else {
        const tx = await contract.assignTicket(eventId, targetAddress, nameHash, studentIdHash);
        await tx.wait();
        toast.success(`Ticket Assigned! ${isGuestModeAttendee ? 'GuestID: ' + targetAddress : ''}`);
        loadEvents();
        setHolderName('');
        setHolderStudentId('');
        setMintAddress('');
      }
    } catch (e) {
      console.error(e);
      toast.error('Assignment failed. Are you a Booth Operator?');
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 pb-24 md:pb-8 p-4 md:p-8">
      {isConnected && connectionError && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-2xl mb-4 flex items-center gap-3 animate-in slide-in-from-top-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-400 font-bold">
              Connection Error: <span className="font-normal opacity-80">{connectionError}</span>
            </p>
          </div>

          <div className="bg-blue-900/10 border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full flex items-center justify-between p-5 hover:bg-blue-500/5 transition-colors"
            >
              <div className="flex items-center gap-4 text-blue-400">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Settings className={`w-5 h-5 ${showSetupGuide ? 'animate-spin' : ''}`} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Local Development Guide</h3>
                  <p className="text-xs text-blue-300/70">Required steps for Hardhat Local Node</p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest bg-blue-500/20 px-3 py-1 rounded-lg">
                {showSetupGuide ? "Hide Guide" : "Show Guide"}
              </span>
            </button>

            {showSetupGuide && (
              <div className="p-6 pt-0 grid md:grid-cols-2 gap-6 border-t border-blue-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-[10px]">1</span>
                    Start Local Chain
                  </h4>
                  <p className="text-xs text-gray-400">Run this in your project terminal to start the blockchain node:</p>
                  <code className="block bg-black p-3 rounded-xl border border-gray-800 text-teal-400 text-xs font-mono">
                    npx hardhat node --hostname 0.0.0.0
                  </code>

                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mt-6">
                    <span className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-[10px]">2</span>
                    Deploy Contract
                  </h4>
                  <p className="text-xs text-gray-400">In a <span className="text-white underline">new</span> terminal window, deploy the smart contract:</p>
                  <code className="block bg-black p-3 rounded-xl border border-gray-800 text-teal-400 text-xs font-mono">
                    npx hardhat run scripts/deploy.js --network local
                  </code>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-white text-black rounded-full flex items-center justify-center text-[10px]">3</span>
                    Sync MetaMask (Crucial)
                  </h4>
                  <p className="text-xs text-gray-400">If you get "Too many errors" or "RPC Error", you must reset MetaMask's local cache:</p>
                  <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                    <li>Open <span className="text-white">MetaMask</span></li>
                    <li>Go to <span className="text-white">Settings</span> &gt; <span className="text-white">Advanced</span></li>
                    <li>Click <span className="text-orange-400 font-bold">"Clear activity tab data"</span></li>
                  </ul>

                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mt-4">
                    <p className="text-[10px] text-orange-300 font-bold uppercase mb-1">Fixing RPC Lockout</p>
                    <p className="text-[10px] text-orange-400/70">MetaMask throttles requests if the contract address doesn't exist. Refresh the browser AFTER following Step 2.</p>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = "/";
                      }}
                      className="mt-3 w-full py-2 bg-orange-600/20 border border-orange-500/50 text-orange-400 text-[10px] font-bold rounded-lg hover:bg-orange-600/40 transition"
                    >
                      Hard Reset App State
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!isConnected && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className={`${!isProviderAvailable ? "bg-red-900/20 border-red-500/50" : "bg-purple-900/20 border-purple-500/50"} border p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 ${!isProviderAvailable ? "bg-red-500" : "bg-purple-500"} rounded-full animate-pulse`}></div>
              <p className={`text-sm ${!isProviderAvailable ? "text-red-300" : "text-purple-300"} text-center sm:text-left`}>
                {!isProviderAvailable ? (
                  isBrave ? (
                    <>
                      <span className="font-bold">Brave Detected:</span> Web3 provider missing. Please disable <span className="underline">Guest Mode</span> or enable <span className="underline">Brave Wallet</span>.
                    </>
                  ) : (
                    <>
                      <span className="font-bold">Provider Missing:</span> Please install <span className="underline">MetaMask</span> to interact with the blockchain.
                    </>
                  )
                ) : (
                  <>
                    <span className="font-bold">Guest Mode:</span> Connection required to create events or mint.
                  </>
                )}
              </p>
            </div>
            {isProviderAvailable && (
              <button
                onClick={connect}
                className="w-full sm:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition min-h-[44px]"
              >
                Connect Now
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-800 pb-6 gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-teal-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {!isBoothOperator && isConnected && (
              <button
                onClick={grantBoothRole}
                className="w-full sm:w-auto px-4 py-2 bg-orange-600/20 border border-orange-500/50 text-orange-400 text-xs font-bold rounded-xl hover:bg-orange-600/30 transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Become Booth Operator
              </button>
            )}
            <div className="flex items-center gap-4 w-full sm:w-auto bg-gray-900/50 p-2 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-500 font-mono truncate max-w-[150px] md:max-w-none">
                {isConnected ? address : "Guest User"}
              </span>
              <div className={`w-3 h-3 shrink-0 ${isConnected ? "bg-green-500" : "bg-gray-700"} rounded-full ${isConnected ? "animate-pulse" : ""}`}></div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Create Event Panel (Mobile Toggleable) */}
          <div className={`lg:col-span-1 space-y-4 ${!isConnected ? "opacity-50 pointer-events-none" : ""}`}>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="lg:hidden w-full py-4 bg-teal-600/20 border border-teal-500/50 text-teal-400 font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Plus className={`w-5 h-5 transition-transform ${showCreateForm ? 'rotate-45' : ''}`} />
              {showCreateForm ? 'Cancel' : 'Create New Event'}
            </button>

            <div className={`${showCreateForm ? 'block' : 'hidden'} lg:block bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl`}>
              <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-500" />
                New Event
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">Event Name</label>
                  <input
                    type="text"
                    placeholder="Graduation 2026"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-teal-500 outline-none transition-colors min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">Max Supply</label>
                  <input
                    type="number"
                    value={newEventSupply}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewEventSupply(val);
                      setSupplyError(val < 1);
                    }}
                    className={`w-full bg-black border ${supplyError ? 'border-red-500 animate-shake' : 'border-gray-700'} rounded-xl p-3 text-white focus:border-teal-500 outline-none transition-colors min-h-[48px]`}
                  />
                  {supplyError && (
                    <p className="text-red-500 text-[10px] mt-2 font-bold animate-fadeIn">
                      At least 1 ticket is required
                    </p>
                  )}
                </div>
                <button
                  onClick={createEvent}
                  disabled={supplyError}
                  className={`w-full py-4 ${supplyError ? 'bg-gray-800 cursor-not-allowed text-gray-500' : 'bg-teal-600 hover:bg-teal-500 text-white'} font-bold rounded-xl transition shadow-lg shadow-teal-900/20 min-h-[52px]`}
                >
                  Deploy Event
                </button>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-bold text-white">Your Collections</h2>
              {isConnected && events.length > 0 && <span className="text-xs text-gray-500">{events.length} active</span>}
            </div>

            {!isConnected ? (
              <div className="bg-gray-900/30 border border-dashed border-gray-800 p-8 md:p-12 rounded-3xl text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                  <Info className="w-8 h-8" />
                </div>
                <p className="text-gray-500 mb-6 max-w-xs mx-auto">Link your wallet to view and manage your smart contract events.</p>
                <button
                  onClick={connect}
                  className="px-8 py-3 bg-teal-500/10 border border-teal-500/50 text-teal-400 font-bold rounded-xl hover:bg-teal-500/20 transition min-h-[48px]"
                >
                  Link Wallet
                </button>
              </div>
            ) : loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 p-5 md:p-6 rounded-2xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-3 w-full">
                        <Skeleton className="h-8 w-1/3 bg-gray-800" />
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-20 bg-gray-800" />
                          <Skeleton className="h-4 w-32 bg-gray-800" />
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Skeleton className="h-11 w-24 rounded-xl bg-gray-800" />
                        <Skeleton className="h-11 w-24 rounded-xl bg-gray-800" />
                        <Skeleton className="h-11 w-24 rounded-xl bg-gray-800" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {events.length === 0 && (
                  <div className="text-center py-12 bg-gray-900/20 rounded-3xl border border-gray-800/50">
                    <p className="text-gray-500">No events found in your account.</p>
                  </div>
                )}
                {events.map(evt => (
                  <div key={evt.id} className="bg-gray-900 border border-gray-800 p-5 md:p-6 rounded-2xl transition-all hover:border-teal-500/30">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{evt.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Event #{evt.id}</span>
                          <p className="text-gray-400 text-xs">Capacity: <span className="text-white font-bold">{evt.mintedCount}</span> / {evt.maxSupply}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setSelectedEventId(selectedEventId === evt.id ? null : evt.id)}
                          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition min-h-[44px] ${selectedEventId === evt.id ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-750'}`}
                        >
                          {selectedEventId === evt.id ? "Close" : "Manage"}
                        </button>
                        <Link href={`/verify?event=${evt.id}`} className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 min-h-[44px]">
                          <QrCode className="w-4 h-4" />
                          Scan
                        </Link>
                        <Link href={`/dashboard/tickets?event=${evt.id}`} className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 min-h-[44px]">
                          <LayoutDashboard className="w-4 h-4" />
                          Design & Print
                        </Link>
                        <Link href={`/events/${evt.id}`} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-800 hover:bg-gray-750 text-teal-400 border border-teal-500/20 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 min-h-[44px]">
                          <ShieldCheck className="w-4 h-4" />
                          Report
                        </Link>
                      </div>
                    </div>

                    {/* Expandable Management Panel */}
                    {selectedEventId === evt.id && (
                      <div className="mt-6 pt-6 border-t border-gray-800 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                          <h3 className="text-lg font-bold text-teal-400">Inventory Control</h3>
                          <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-gray-800 w-full sm:w-auto">
                            <button
                              onClick={() => setIsBoothMode(false)}
                              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition min-h-[36px] ${!isBoothMode ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/40' : 'text-gray-500'}`}
                            >
                              Standard
                            </button>
                            <button
                              onClick={() => setIsBoothMode(true)}
                              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition min-h-[36px] ${isBoothMode ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-gray-500'}`}
                            >
                              Booth Mode
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {isBoothMode && (
                            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                              <input
                                type="checkbox"
                                id="guestToggle"
                                checked={isGuestModeAttendee}
                                onChange={(e) => setIsGuestModeAttendee(e.target.checked)}
                                className="w-5 h-5 accent-blue-500"
                              />
                              <label htmlFor="guestToggle" className="text-xs font-bold text-blue-300">
                                Attendee has no wallet (Generate GuestID)
                              </label>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Always show in Standard Mode. In Booth Mode, only hide if Guest ID is enabled. */}
                            {(!isBoothMode || !isGuestModeAttendee) && (
                              <div className="md:col-span-2">
                                <label className="block text-[10px] uppercase text-gray-500 mb-2 font-bold">Recipient Wallet</label>
                                <input
                                  type="text"
                                  placeholder="0x..."
                                  value={mintAddress}
                                  onChange={(e) => setMintAddress(e.target.value)}
                                  className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white font-mono text-sm focus:border-teal-500 outline-none transition-colors min-h-[48px]"
                                />
                              </div>
                            )}

                            {isBoothMode && (
                              <>
                                <div>
                                  <label className="block text-[10px] uppercase text-gray-500 mb-2 font-bold">Student Name</label>
                                  <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={holderName}
                                    onChange={(e) => setHolderName(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-colors min-h-[48px]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase text-gray-500 mb-2 font-bold">Student ID</label>
                                  <input
                                    type="text"
                                    placeholder="ID-00000"
                                    value={holderStudentId}
                                    onChange={(e) => setHolderStudentId(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-colors min-h-[48px]"
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => isBoothMode ? assignTicket(evt.id) : mintTicket(evt.id)}
                            className={`w-full py-4 font-bold rounded-2xl transition shadow-lg min-h-[56px] ${isBoothMode ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20' : 'bg-teal-500 hover:bg-teal-400 text-black shadow-teal-900/20'}`}
                          >
                            {isBoothMode ? "Issue Identity-Locked Ticket" : "Mint Public Ticket"}
                          </button>

                          {isBoothMode && (
                            <p className="text-[10px] text-orange-400/70 uppercase tracking-[0.2em] text-center font-bold">
                              🔒 Secure Hashed Assignment
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB for Scan (Global access) */}
      {isConnected && (
        <Link
          href="/verify"
          className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-teal-500 text-black rounded-full shadow-2xl shadow-teal-500/40 flex items-center justify-center transition-transform active:scale-90 z-50"
        >
          <QrCode className="w-8 h-8" />
        </Link>
      )}
    </div>
  );
}