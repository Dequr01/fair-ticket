import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-black text-gray-300 p-8 md:p-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-teal-500 mb-8 hover:underline">
          <ArrowLeft size={16} /> Back
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Why Blockchain Ticketing?</h1>
        
        <section className="space-y-8 text-lg leading-relaxed">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">The Scalping Problem</h2>
            <p>
              Traditional tickets are just database entries or static PDFs. They are easily copied, 
              forged, or sold multiple times by bad actors. Organizers lose control over the secondary market, 
              and fans get scammed.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">The FairTicket Solution</h2>
            <p>
              By minting tickets as Non-Fungible Tokens (NFTs) on the Polygon blockchain, we create a 
              physically unique digital asset.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-400">
              <li><strong className="text-white">True Ownership:</strong> You hold the ticket in your wallet, not an email.</li>
              <li><strong className="text-white">Fraud Proof:</strong> The blockchain prevents double-spending. If a ticket is scanned, the global state updates instantly.</li>
              <li><strong className="text-white">Programmable Rules:</strong> Organizers can enforce price caps or royalties on transfers.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">How Verification Works</h2>
            <p>
              We use a cryptographic challenge-response protocol. Unlike a static QR code, our scanner 
              challenges your wallet to sign a random "nonce" (number). This proves you not only 
              have the ticket ID but also control the private key that owns it.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
