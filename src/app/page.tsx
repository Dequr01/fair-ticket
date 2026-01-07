"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import ParticleBackground from "@/components/ParticleBackground";
import { ArrowRight, ShieldCheck, QrCode, Ticket } from "lucide-react";

export default function Home() {
  const { isConnected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.replace("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <main className="relative min-h-screen flex flex-col text-white overflow-hidden">
      <ParticleBackground />
      
      {/* Navbar */}
      <nav className="relative z-10 p-4 md:p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-xl md:text-2xl font-bold tracking-tighter text-teal-400">FairTicket</div>
        <div className="flex gap-3 md:gap-6">
          <Link href="/about" className="hidden sm:block hover:text-teal-300 transition-colors py-2">About</Link>
          <Link href="/connect" className="bg-teal-500/10 border border-teal-500/50 px-3 py-1.5 md:px-4 md:py-2 rounded text-sm md:text-base hover:bg-teal-500/20 transition-all">
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-emerald-500 drop-shadow-[0_0_35px_rgba(52,211,153,0.5)] leading-tight">
            Ticketing.
            <br />
            <span className="text-white">Trustless.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Eliminate scalping and fraud with cryptographic proof of ownership. 
            Built on <span className="text-purple-400">Polygon</span> for the next generation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto sm:max-w-none">
            <Link href="/connect" className="group relative px-8 py-4 bg-teal-500 text-black font-bold text-lg rounded-full overflow-hidden hover:scale-105 transition-transform text-center min-h-[56px] flex items-center justify-center">
              <span className="relative z-10 flex items-center gap-2">
                Launch App <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
            
            <Link href="/verify" className="px-8 py-4 border border-gray-700 bg-black/50 backdrop-blur text-gray-300 font-bold text-lg rounded-full hover:bg-gray-800 transition-colors text-center min-h-[56px] flex items-center justify-center">
              Verify Ticket
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 bg-black/50 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<ShieldCheck className="w-10 h-10 text-teal-400" />}
            title="Fraud Proof"
            description="Every ticket is a unique NFT on the blockchain. Impossible to duplicate, impossible to fake."
          />
          <FeatureCard 
            icon={<QrCode className="w-10 h-10 text-purple-400" />}
            title="Secure Entry"
            description="Double-scan challenge-response verification ensures only the true owner enters."
          />
          <FeatureCard 
            icon={<Ticket className="w-10 h-10 text-pink-400" />}
            title="Multi-Tenant"
            description="Organizers manage their own events, inventory, and revenue with complete isolation."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 border border-gray-800 rounded-2xl bg-gray-900/50 hover:border-teal-500/30 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}