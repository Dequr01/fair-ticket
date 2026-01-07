"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useSearchParams } from "next/navigation";
import { Contract } from "ethers";
import FairTicketArtifact from "@/artifacts/src/contracts/FairTicket.sol/FairTicket.json";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, Image as ImageIcon, Type, Save, LayoutTemplate, Smartphone, QrCode, Download } from "lucide-react";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/config/contracts";
import anime from "animejs";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Skeleton } from "@/components/ui/Skeleton";

// --- Types ---

interface TicketDesign {
  bgImage: string | null; // Data URL
  textColor: string;
  accentColor: string;
  showEventName: boolean;
  showDate: boolean;
  showHolder: boolean;
  showId: boolean;
  layout: "classic" | "modern" | "minimal";
}

interface TicketData {
  tokenId: string;
  eventId: number;
  holder: string; // Wallet address
  holderNameHash: string;
  holderStudentIdHash: string;
  isScanned: boolean;
  // Resolved metadata (simulated for guest mode or fetched if we had a backend)
  resolvedName?: string; 
  resolvedStudentId?: string;
}

const DEFAULT_DESIGN: TicketDesign = {
  bgImage: null,
  textColor: "#ffffff",
  accentColor: "#14b8a6", // Teal-500
  showEventName: true,
  showDate: true,
  showHolder: true,
  showId: true,
  layout: "modern",
};

function TicketDesignerContent() {
  const { isConnected, signer, address } = useWallet();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Design State
  const [design, setDesign] = useState<TicketDesign>(DEFAULT_DESIGN);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState<number>(0);

  // Refs for animation
  const ticketRef = useRef<HTMLDivElement>(null);

  // Load Design from LocalStorage when Event ID changes
  useEffect(() => {
    if (selectedEventId) {
      const saved = localStorage.getItem(`ticketDesign_${selectedEventId}`);
      if (saved) {
        try {
          setDesign(JSON.parse(saved));
          toast.success("Loaded saved design!");
        } catch (e) {
          console.error("Failed to parse saved design", e);
        }
      } else {
        setDesign(DEFAULT_DESIGN);
      }
    }
  }, [selectedEventId]);

  // Save Design to LocalStorage on change
  useEffect(() => {
    if (selectedEventId && design !== DEFAULT_DESIGN) {
      const handler = setTimeout(() => {
        localStorage.setItem(`ticketDesign_${selectedEventId}`, JSON.stringify(design));
      }, 1000); // Debounce save
      return () => clearTimeout(handler);
    }
  }, [design, selectedEventId]);

  useEffect(() => {
    if (isConnected && signer) {
      loadEvents();
    }
  }, [isConnected, signer]);

  useEffect(() => {
    if (selectedEventId !== null) {
      loadTickets(selectedEventId);
    }
  }, [selectedEventId]);

  // Animation effect on design change
  useEffect(() => {
    if (ticketRef.current) {
      anime({
        targets: ticketRef.current,
        scale: [0.95, 1],
        opacity: [0.8, 1],
        duration: 400,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  }, [design.layout, selectedTicketIndex]);

  const loadEvents = async () => {
    if (!signer) return;
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const organizerAddress = await address;
      const eventIds = await contract.getOrganizerEvents(organizerAddress);
      
      // Fetch event names (simplified from dashboard logic)
      const filter = contract.filters.EventCreated(null, organizerAddress);
      const logs = await contract.queryFilter(filter);
      const nameMap: Record<number, string> = {};
      logs.forEach(log => {
        const parsed = contract.interface.parseLog(log as any);
        if (parsed) nameMap[Number(parsed.args.eventId)] = parsed.args.name;
      });

      const loadedEvents = [];
      for (const id of eventIds) {
        loadedEvents.push({
          id: Number(id),
          name: nameMap[Number(id)] || "Unnamed Event",
        });
      }
      setEvents(loadedEvents);
      
      const queryEventId = searchParams.get("event");
      if (queryEventId) {
        setSelectedEventId(Number(queryEventId));
      } else if (loadedEvents.length > 0) {
        setSelectedEventId(loadedEvents[0].id);
      }
    } catch (e) {
      console.error("Error loading events", e);
    }
  };

  const loadTickets = async (eventId: number) => {
    if (!signer) return;
    setLoading(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, FairTicketArtifact.abi, signer);
      const tokenIds = await contract.getEventTickets(eventId);
      
      const loadedTickets: TicketData[] = [];
      // Limit to first 20 for performance in designer
      const limit = tokenIds.length > 20 ? 20 : tokenIds.length;
      
      for (let i = 0; i < limit; i++) {
        const tid = tokenIds[i];
        const [tData, owner] = await contract.getTicketDetails(tid);
        loadedTickets.push({
          tokenId: tid.toString(),
          eventId: Number(tData.eventId),
          holder: owner,
          holderNameHash: tData.holderNameHash,
          holderStudentIdHash: tData.holderStudentIdHash,
          isScanned: tData.isScanned,
          // In a real app, we would decrypt/fetch the real name if stored off-chain.
          // For now, we show placeholders or "Guest" if it's a guest ticket.
          resolvedName: tData.holderNameHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? "Identity Locked" : "Standard Ticket",
        });
      }
      setTickets(loadedTickets);
    } catch (e) {
      console.error("Error loading tickets", e);
    }
    setLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDesign(prev => ({ ...prev, bgImage: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current || tickets.length === 0) {
      toast.error("No tickets to generate");
      return;
    }
    
    const loadingToast = toast.loading("Generating PDF Bundle...");

    try {
      // Use A4 landscape dimensions (approx 297mm x 210mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Render the current ticket view to canvas
      // Note: In a real batch scenario, we would iterate through all tickets and render them hidden.
      // For this prototype, we'll render the *current preview* as a high-res asset.
      
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // 2x scale for crisp text
        useCORS: true, // Allow loading cross-origin images if configured
        backgroundColor: null
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = 297; 
      const pdfHeight = 210;
      
      // Calculate aspect ratio to fit (Ticket is roughly 2:1)
      // We'll place it centered
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = 200; // 200mm wide
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.text(`Event #${selectedEventId} - Ticket #${tickets[selectedTicketIndex].tokenId}`, 10, 10);
      
      pdf.save(`Ticket-${tickets[selectedTicketIndex].tokenId}.pdf`);
      toast.success("PDF Downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const currentTicket = tickets[selectedTicketIndex];
  const currentEvent = events.find(e => e.id === selectedEventId);

  // --- Render Components ---

  const TicketPreview = () => (
    <div 
      ref={ticketRef}
      className={`relative w-full aspect-[2/1] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 bg-black print:border-none print:shadow-none print:rounded-none`}
      style={{ 
        backgroundColor: design.bgImage ? 'transparent' : '#111',
      }}
    >
      {design.bgImage && (
        <img 
          src={design.bgImage} 
          alt="Ticket Background" 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-60" 
        />
      )}

      {/* Modern Layout */}
      {design.layout === 'modern' && (
        <div className="relative z-10 w-full h-full flex p-6 print:p-8">
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {design.showEventName && (
                <h2 className="text-2xl font-bold uppercase tracking-tighter mb-1" style={{ color: design.textColor }}>
                  {currentEvent?.name || "Event Name"}
                </h2>
              )}
              {design.showDate && (
                <p className="text-sm font-bold opacity-80" style={{ color: design.textColor }}>
                  {new Date().toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-1">
              {design.showHolder && (
                <div>
                   <p className="text-[10px] uppercase opacity-60 font-bold" style={{ color: design.textColor }}>Ticket Holder</p>
                   <p className="font-mono text-xs truncate w-32 md:w-48" style={{ color: design.accentColor }}>
                     {currentTicket?.holder || "0x..."}
                   </p>
                </div>
              )}
              {design.showId && currentTicket?.resolvedName && (
                 <p className="text-xs font-bold badge inline-block px-2 py-0.5 rounded bg-white/10 backdrop-blur-md" style={{ color: design.textColor }}>
                   {currentTicket.resolvedName}
                 </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end justify-center pl-6 border-l border-white/10 border-dashed">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <QRCodeSVG 
                value={JSON.stringify({ tokenId: currentTicket?.tokenId || "0" })}
                size={120}
                level="M"
              />
            </div>
            <p className="mt-2 text-[10px] font-mono text-center font-bold" style={{ color: design.textColor }}>
              #{currentTicket?.tokenId || "000"}
            </p>
          </div>
        </div>
      )}

      {/* Classic Layout */}
      {design.layout === 'classic' && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center p-6 border-4 border-double" style={{ borderColor: design.accentColor }}>
            {design.showEventName && (
                <h2 className="text-3xl font-serif font-bold mb-4" style={{ color: design.textColor }}>
                  {currentEvent?.name}
                </h2>
            )}
            <div className="bg-white p-2 mb-4 border-2 border-black">
               <QRCodeSVG value={JSON.stringify({ tokenId: currentTicket?.tokenId || "0" })} size={100} />
            </div>
            {design.showHolder && (
               <p className="text-xs font-mono" style={{ color: design.textColor }}>ADMIT ONE: {currentTicket?.holder?.slice(0, 8)}...</p>
            )}
        </div>
      )}
      
       {/* Minimal Layout */}
       {design.layout === 'minimal' && (
        <div className="relative z-10 w-full h-full flex items-center justify-between p-8">
            <div className="text-left">
                {design.showEventName && <h2 className="text-4xl font-black tracking-tighter" style={{ color: design.textColor }}>{currentEvent?.name}</h2>}
            </div>
            <div className="bg-white p-1">
               <QRCodeSVG value={JSON.stringify({ tokenId: currentTicket?.tokenId || "0" })} size={140} />
            </div>
        </div>
      )}

      {/* Brand Watermark */}
      <div className="absolute bottom-3 right-4 text-[8px] opacity-40 uppercase tracking-widest font-bold z-20" style={{ color: design.textColor }}>
        FairTicket Verified
      </div>
    </div>
  );

  if (!isConnected) return (
     <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
            <p className="mb-4">Connect wallet to design tickets.</p>
            <Link href="/dashboard" className="text-teal-400 hover:underline">Back to Dashboard</Link>
        </div>
     </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 p-4 md:p-8">
      {/* Hide Header on Print */}
      <header className="flex items-center justify-between mb-8 print:hidden">
        <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-gray-900 rounded-xl hover:bg-gray-800 transition">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-purple-500" />
                Ticket Studio
            </h1>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-6 py-2 bg-gray-800 text-teal-400 font-bold rounded-xl hover:bg-gray-700 transition border border-teal-500/30"
            >
                <Download className="w-4 h-4" />
                Save PDF
            </button>
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-500 transition shadow-lg shadow-teal-900/20"
            >
                <Printer className="w-4 h-4" />
                Print Tickets
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls Panel - Hidden on Print */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          
          {/* Event Selector */}
          <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Select Event</label>
            <select 
                value={selectedEventId || ""} 
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="w-full bg-black border border-gray-700 text-white p-3 rounded-xl focus:border-purple-500 outline-none"
            >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* Design Controls */}
          <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white">Visuals</h3>
            </div>
            
            {/* Background Upload */}
            <div>
                <label className="block text-xs text-gray-400 mb-2">Background Image</label>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20"
                />
            </div>

            {/* Layout Toggle */}
            <div>
                <label className="block text-xs text-gray-400 mb-2">Layout Style</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['classic', 'modern', 'minimal'] as const).map((l) => (
                        <button
                            key={l}
                            onClick={() => setDesign(d => ({ ...d, layout: l }))}
                            className={`py-2 text-xs font-bold rounded-lg capitalize border ${design.layout === l ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black border-gray-700 text-gray-500'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-2">Text Color</label>
                    <div className="flex items-center gap-2 bg-black p-2 rounded-xl border border-gray-700">
                        <input 
                            type="color" 
                            value={design.textColor}
                            onChange={(e) => setDesign(d => ({ ...d, textColor: e.target.value }))}
                            className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                        />
                        <span className="text-xs font-mono">{design.textColor}</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-2">Accent Color</label>
                    <div className="flex items-center gap-2 bg-black p-2 rounded-xl border border-gray-700">
                        <input 
                            type="color" 
                            value={design.accentColor}
                            onChange={(e) => setDesign(d => ({ ...d, accentColor: e.target.value }))}
                            className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                        />
                        <span className="text-xs font-mono">{design.accentColor}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Field Toggles */}
          <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800">
             <div className="flex items-center gap-2 mb-4">
                <Type className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white">Fields</h3>
            </div>
            <div className="space-y-3">
                {[ 
                    { key: 'showEventName', label: 'Event Name' },
                    { key: 'showDate', label: 'Date' },
                    { key: 'showHolder', label: 'Wallet Address' },
                    { key: 'showId', label: 'Ticket ID' },
                ].map((field) => (
                    <div key={field.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{field.label}</span>
                        <input 
                            type="checkbox"
                            checked={(design as any)[field.key]}
                            onChange={(e) => setDesign(d => ({ ...d, [field.key]: e.target.checked }))}
                            className="w-4 h-4 accent-purple-500 rounded"
                        />
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8">
            <div className="sticky top-8">
                <div className="flex items-center justify-between mb-4 print:hidden">
                    <h2 className="text-lg font-bold text-white">Live Preview</h2>
                    <div className="flex gap-2">
                        <button 
                            disabled={selectedTicketIndex === 0}
                            onClick={() => setSelectedTicketIndex(i => i - 1)}
                            className="px-3 py-1 bg-gray-800 rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span className="text-xs flex items-center text-gray-400">
                            Ticket {selectedTicketIndex + 1} of {tickets.length}
                        </span>
                        <button 
                            disabled={selectedTicketIndex >= tickets.length - 1}
                            onClick={() => setSelectedTicketIndex(i => i + 1)}
                            className="px-3 py-1 bg-gray-800 rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="w-full aspect-[2/1] rounded-3xl overflow-hidden border border-gray-800 bg-black relative">
                       <Skeleton className="w-full h-full absolute inset-0 opacity-20" />
                       <div className="relative z-10 w-full h-full flex p-6">
                          <div className="flex-1 space-y-4">
                             <Skeleton className="h-8 w-3/4 bg-gray-800" />
                             <Skeleton className="h-4 w-1/4 bg-gray-800" />
                             <div className="mt-8 space-y-2">
                                <Skeleton className="h-3 w-20 bg-gray-800" />
                                <Skeleton className="h-4 w-40 bg-gray-800" />
                             </div>
                          </div>
                          <div className="flex flex-col items-end justify-center pl-6 border-l border-white/10">
                             <Skeleton className="w-28 h-28 rounded-xl bg-gray-800" />
                             <Skeleton className="h-3 w-16 mt-2 bg-gray-800" />
                          </div>
                       </div>
                    </div>
                ) : (
                    tickets.length > 0 ? (
                        <>
                         <TicketPreview />
                         <div className="mt-8 text-center text-gray-500 text-xs print:hidden">
                            <p>Tip: Use landscape mode when printing for best results.</p>
                         </div>
                        </>
                    ) : (
                         <div className="w-full aspect-[2/1] bg-gray-900/50 border border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-500">
                            <QrCode className="w-12 h-12 mb-4 opacity-50" />
                            <p>No tickets found for this event.</p>
                            <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 mt-2 text-sm">Mint some tickets first</Link>
                         </div>
                    )
                )}
            </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
            body {
                background: white;
                color: black;
            }
            .print\:hidden {
                display: none !important;
            }
            .print\:border-none {
                border: none !important;
            }
            .print\:shadow-none {
                box-shadow: none !important;
            }
            .print\:rounded-none {
                border-radius: 0 !important;
            }
            .print\:p-8 {
                padding: 2rem !important;
            }
        }
      `}</style>
    </div>
  );
}

export default function TicketDesignerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Designer...</div>}>
      <TicketDesignerContent />
    </Suspense>
  );
}
