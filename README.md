# FairTicket 🎟️
> **Ticketing. Trustless. Fraud-Proof.**

FairTicket is a next-generation ticketing platform built on the **Polygon Blockchain**. It solves the ticketing industry's biggest problems—scalping, fraud, and lack of transparency—by using NFTs and cryptographic proofs.

![Tech Stack](https://img.shields.io/badge/Tech-Next.js_15-black) ![Tech Stack](https://img.shields.io/badge/Tech-Solidity-gray) ![Tech Stack](https://img.shields.io/badge/Tech-Hardhat-yellow) ![Tech Stack](https://img.shields.io/badge/Network-Polygon-purple)

---

## 📚 **University Presentation Guide**
If you are a team member looking for the **Script**, **Talking Points**, or **Setup Instructions** for the final presentation, please read the dedicated guide:

👉 **[Read the FairTicket Presentation Guide](./FairTicket_Presentation_Guide.md)** 👈

*(Includes the "Hybrid Setup" instructions for connecting Vercel to Localhost)*

---

## 🚀 Quick Start (Local Development)

If you just want to run the code on your machine:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Local Blockchain
Open a terminal and run:
```bash
npx hardhat node
```

### 3. Deploy the Smart Contract
Open a **second** terminal and run:
```bash
npx hardhat run scripts/deploy.js --network local
```

### 4. Start the Frontend
Open a **third** terminal and run:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✨ Key Features

*   **Hybrid Booth Mode:** Assign tickets to users *without* crypto wallets using Identity Hashing (Name + Student ID).
*   **Anti-Scalp Verification:** "Challenge-Response" QR codes prevent screenshots and replay attacks.
*   **Ticket Studio:** Built-in designer to create custom, branded PDF tickets with blockchain verification codes.
*   **Offline Queue:** The system continues to work (queuing assignments) even if internet connectivity is lost at the venue.
*   **Public Audit:** A transparent, read-only view of the event registry for verifiability.

---

## 🛠️ Architecture

*   **Frontend:** Next.js 15 (App Router), Tailwind CSS, Framer Motion / Anime.js.
*   **Smart Contracts:** Solidity (OpenZeppelin ERC721), Hardhat.
*   **Interaction:** Ethers.js v6.
*   **Identity:** Keccak256 Hashing for privacy-preserving guest lists.

---

## 📄 License
MIT License. Free for educational and open-source use.
