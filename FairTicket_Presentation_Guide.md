# FairTicket: The Ultimate Presentation Guide 🎓
> **Tagline:** Ticketing. Trustless. Fraud-Proof.
> **Status:** Production Ready (Hybrid Setup)

---

## 1. Project Overview (The "Elevator Pitch")
**FairTicket** is a decentralized ticketing platform built on the Polygon Blockchain. unlike traditional tickets (PDFs) which can be copied and sold to multiple people, FairTicket uses **NFTs (Non-Fungible Tokens)** to ensure every ticket is unique and impossible to fake.

### The Problem it Solves:
*   ❌ **Scalping:** Bots buying all tickets instantly.
*   ❌ **Fraud:** One PDF ticket sold to 10 different people.
*   ❌ **Dependency:** Relying on centralized servers that crash during high traffic.

### The Solution:
*   ✅ **Blockchain Ownership:** You own the ticket in your wallet.
*   ✅ **Identity Locking:** Tickets can be locked to a Student ID (Anti-Scalping).
*   ✅ **Offline-Ready:** Works even if the internet cuts out at the gate.

---

## 2. Technical Architecture (For the "Tech Guy" Slide)

We use a **Hybrid Architecture** to combine the speed of the web with the security of the blockchain.

*   **Frontend:** Next.js 15 (React) + Tailwind CSS (Modern, Fast UI).
*   **Blockchain:** Ethereum/Polygon (Smart Contracts written in Solidity).
*   **Bridge:** Local Tunneling (Ngrok/LocalTunnel) to connect the Cloud (Vercel) to our Local Blockchain.
*   **Storage:** On-chain storage for ownership; LocalStorage for offline queues.

---

## 3. Key Features & Talking Points

### A. The "Booth Mode" (Bridging Web2 & Web3)
*   **Concept:** Not everyone has a Crypto Wallet.
*   **Innovation:** We allow "Booth Operators" to issue tickets linked to a **Student Name & ID**.
*   **Tech:** We hash the data (`keccak256(Name + ID)`) and store it on the blockchain. The user doesn't need a phone or wallet—just their physical ID card to enter.

### B. The "Challenge-Response" Scanner
*   **Concept:** Preventing screenshots.
*   **Flow:**
    1.  Scanner generates a random code (Nonce).
    2.  User scans it.
    3.  User signs it with their private key.
    4.  Blockchain verifies the signature.
*   **Result:** A screenshot of a QR code is useless because it cannot "sign" the new random code.

### C. Offline Queue System
*   **Concept:** Internet at festivals/events is often bad.
*   **Tech:** If the Booth Operator loses internet, tickets are saved locally. As soon as connection returns, the system automatically syncs with the blockchain.

### D. Ticket Studio
*   **Concept:** NFTs shouldn't be boring.
*   **Feature:** A full drag-and-drop designer to upload custom event backgrounds and generate printable PDF tickets with embedded Blockchain QR codes.

---

## 4. The "Smooth Sailing" Demo Script 🎭
*Follow this script exactly for your presentation.*

### Pre-Flight Checklist (Do this BEFORE opening the laptop)
1.  **Laptop:** Plugged in, Screen Sleep Disabled.
2.  **Terminal 1:** `npx hardhat node --hostname 0.0.0.0` (The Blockchain)
3.  **Terminal 2:** `npx localtunnel --port 8545` (The Bridge)
4.  **Terminal 3:** `npx hardhat run scripts/deploy.js --network local` (Deploy Contract)
5.  **Vercel:** Update `NEXT_PUBLIC_RPC_URL` with the link from Terminal 2. Redeploy.

### Step 1: The Organizer (Dashboard)
1.  Open the Vercel Link.
2.  Connect Wallet (MetaMask).
3.  **Action:** Create a new Event (e.g., "Graduation Ball 2026").
4.  **Talking Point:** "Notice how the event is immediately deployed to the blockchain."

### Step 2: Issuing Tickets (Booth Mode)
1.  Go to **Manage Event** -> Toggle **Booth Mode**.
2.  **Scenario:** "A student, John Doe, walks up to the counter. He has cash but no crypto wallet."
3.  Check **"Attendee has no wallet"**.
4.  Enter Name: `John Doe` | Student ID: `ID-123`.
5.  Click **Issue Identity-Locked Ticket**.
6.  **Talking Point:** "We just created a blockchain asset linked to his physical identity, without him needing to know what crypto is."

### Step 3: Design & Print
1.  Click **Design & Print**.
2.  Upload a background image (use a cool event photo).
3.  Click **Save PDF**.
4.  **Talking Point:** "We generate a professional PDF ticket that John can print out. This QR code holds his identity hash."

### Step 4: The Gate (Verification)
1.  Open the **Scan** page (or use a phone).
2.  **Scenario:** "John arrives at the gate."
3.  **Action:** Scan the QR code from the screen/PDF.
4.  **System Prompt:** "Guest Check-In Detected."
5.  **Action:** Enter `John Doe` and `ID-123` (Must match exactly!).
6.  Click **Verify**.
7.  **Result:** Green Screen "ACCESS GRANTED".
8.  **Talking Point:** "The blockchain verified that this physical person matches the digital asset. No scalper could have stolen this ticket."

### Step 5: Public Audit (Transparency)
1.  Go back to Dashboard -> Click **Report**.
2.  Show the list of tickets.
3.  **Talking Point:** "This ledger is public. Anyone can verify how many tickets were sold and who entered, ensuring zero corruption."

---

## 5. Troubleshooting (Emergency Guide) 🚨

**Q: "Execution Reverted" / "Identity Mismatch"**
*   **Cause:** You typed the name differently (e.g., extra space).
*   **Fix:** Refresh page, ensure you type "John Doe" exactly as you did when minting.

**Q: "Failed to Fetch" or "Network Error"**
*   **Cause:** The Tunnel URL changed or expired.
*   **Fix:** Check Terminal 2. Is `localtunnel` running? Copy the URL again, put it in Vercel settings, and Redeploy.

**Q: "Nonce too high" in MetaMask**
*   **Cause:** You restarted the blockchain but MetaMask remembers the old one.
*   **Fix:** MetaMask -> Settings -> Advanced -> **Clear Activity Tab Data**.
