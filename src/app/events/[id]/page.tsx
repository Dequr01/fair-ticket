"use client";

import { useState, useEffect, use } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Contract } from "ethers";
import FairTicketArtifact from "@/artifacts/src/contracts/FairTicket.sol/FairTicket.json";
import { ArrowLeft, User, Ticket, Shield, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/config/contracts";

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isConnected, signer } = useWallet();
  const [eventData, setEventData] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected && signer) {
      loadEventDetails();
    }
  }, [isConnected, signer, id]);

  const loadEventDetails = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);

      // Load Event Info
      const evt = await contract.events(id);

      // Fetch name from logs (since it's not in storage)
      const filter = contract.filters.EventCreated(id);
      const logs = await contract.queryFilter(filter);
      let name = "Unnamed Event";
      if (logs.length > 0) {
        const parsed = contract.interface.parseLog(logs[0] as any);
        if (parsed) name = parsed.args.name;
      }

      setEventData({
        id: Number(evt.id),
        name: name,
        organizer: evt.organizer,
        maxSupply: Number(evt.maxSupply),
        mintedCount: Number(evt.mintedCount),
        isActive: evt.isActive
      });

      // Load Tickets for this event
      const ticketIds = await contract.getEventTickets(id);
      const ticketDetails = [];

      for (const tId of ticketIds) {
        const details = await contract.getTicketDetails(tId);
        // details[0] is TicketData struct, details[1] is owner address, details[2] is event name
        ticketDetails.push({
          id: Number(tId),
          owner: details[1],
          isScanned: details[0].isScanned,
          assignedBy: details[0].assignedBy,
          // Since we can't easily recover names from hashes on-chain without the original text,
          // for the prototype we use "Holder #ID" or show the address if it's a known guest address.
          // In a production system, this data would come from an indexed database (Subgraph).
          displayName: `Ticket Holder #${tId}`
        });
      }
      setTickets(ticketDetails);
    } catch (e: any) {
      console.error("Failed to load details", e);
      if (e.code === "CALL_EXCEPTION") {
        setEventData({ error: "Contract Mismatch. Did you redeploy? Please return to Dashboard." });
      }
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-16 h-16 text-gray-700 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Private Audit Page</h1>
        <p className="text-gray-500 mb-8 max-w-xs">Please link your organizer wallet to view the detailed audit logs for this event.</p>
        <Link href="/connect" className="w-full max-w-sm py-4 bg-teal-500 text-black font-bold rounded-2xl">
          Connect Now
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl hover:border-teal-500/50 transition-all text-sm font-bold"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-teal-500" />}
            {copied ? "Link Copied!" : "Copy Report Link"}
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-gray-500 animate-pulse">Fetching Audit Trail...</p>
          </div>
        ) : eventData ? (
          <div className="space-y-8">
            {/* Event Summary Card */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{eventData.name}</h1>
                  <div className="flex items-center gap-2 text-teal-400 mb-6">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Verified Event Audit</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Event Organizer (Admin)</p>
                        <p className="text-sm font-mono text-gray-300">{eventData.organizer}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-gray-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center min-w-[200px]">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Sales</p>
                  <p className="text-4xl font-bold text-white">{eventData.mintedCount}</p>
                  <p className="text-xs text-gray-500 mt-1">out of {eventData.maxSupply} tickets</p>
                </div>
              </div>
            </div>

            {/* Tickets List */}
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Ticket className="w-6 h-6 text-teal-500" />
                Attendee Registry
              </h2>

              <div className="grid gap-3">
                {tickets.length === 0 && (
                  <div className="p-12 border border-dashed border-gray-800 rounded-3xl text-center text-gray-500">
                    No tickets have been issued for this event yet.
                  </div>
                )}

                {tickets.map(ticket => (
                  <div key={ticket.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-all hover:border-gray-700">
                    <button
                      onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${ticket.isScanned ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}></div>
                        <div>
                          <p className="font-bold text-white">{ticket.displayName}</p>
                          <p className="text-[10px] text-gray-500 uppercase">Ticket ID: #{ticket.id} • {ticket.isScanned ? "Used" : "Active"}</p>
                        </div>
                      </div>
                      {expandedTicket === ticket.id ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>

                    {expandedTicket === ticket.id && (
                      <div className="px-5 pb-5 pt-0 border-t border-gray-800/50 animate-in slide-in-from-top-2 duration-200">
                        <div className="mt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/30 p-3 rounded-xl border border-gray-800">
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Holder Wallet</p>
                              <p className="text-xs font-mono text-teal-400 break-all">{ticket.owner}</p>
                            </div>
                            <div className="bg-black/30 p-3 rounded-xl border border-gray-800">
                              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Assigned By (Operator)</p>
                              <p className="text-xs font-mono text-orange-400 break-all">{ticket.assignedBy}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-red-500">Event Not Found</h2>
            <p className="text-gray-500 mt-2">The event ID requested does not exist on the blockchain.</p>
          </div>
        )}
      </div>
    </div>
  );
}
