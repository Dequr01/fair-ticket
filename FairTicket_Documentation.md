# FairTicket — Offline-First Blockchain Ticketing System
## Technical Specification & System Audit Documentation
**Date:** December 23, 2025  
**Audience:** University Administrators, Technical Examiners, Security Auditors  
**Status:** Production-Ready / Audit-Safe

---

### 1. Executive Summary
FairTicket is a decentralized ticketing infrastructure designed specifically for restricted environments such as university campuses and physical event venues. Unlike traditional ticketing platforms that rely on centralized databases, FairTicket prioritizes a **Hybrid "Offline-First"** distribution model. It supports both Web3 wallet holders and **No-Wallet Guest Attendees**, ensuring 100% inclusivity for students without digital assets while maintaining immutable audit trails via the Polygon/Base blockchain networks.

---

### 2. Problem Statement
The current state of physical event ticketing in academic and restricted venues suffers from three primary vulnerabilities:
1.  **Ticket Duplication:** Static QR codes or physical stubs are easily photocopied or screenshotted, leading to unauthorized entry and revenue loss.
2.  **Lack of Auditability:** Manual cash booths often lack a real-time, tamper-proof record of who issued which ticket and when, leading to internal corruption or "booth-side" fraud.
3.  **Secondary Market Scalping:** Tickets are often resold at predatory prices because there is no cryptographically enforced link between the physical identity of the student and the digital asset.

---

### 3. System Architecture Overview
FairTicket utilizes a multi-layered architecture to minimize hardware requirements while maximizing security.

*   **Frontend (Next.js):** A responsive, browser-based interface. It requires no native app installation, ensuring compatibility with any smartphone capable of running a modern web browser.
*   **Smart Contracts (Solidity v0.8.20):** Deployed on EVM-compatible networks (Polygon/Base). The contract manages the entire lifecycle of a ticket, from event creation to final entry verification.
*   **Authentication:** Utilizes standard Web3 wallet providers (e.g., MetaMask, Rabby) or temporary browser-based wallets for identity.
*   **Verification:** Employs a dual-mode verification system:
    1. **P2P Challenge-Response:** For wallet holders (requires no API).
    2. **Identity-Hash Check-In:** For Guest (no-wallet) attendees using deterministic "GuestID" addresses.

---

### 4. On-Ground Payment & Ticket Distribution Model
The core of FairTicket is its manual assignment workflow, designed to mirror existing university booth operations.

#### 4.1 The Physical Distribution Flow
1.  **Payment:** The attendee pays cash or provides a physical receipt at a designated booth.
2.  **Identity Check:** The Booth Operator verifies the attendee’s physical Student ID card and records their Name.
3.  **On-Chain Assignment:** The Booth Operator triggers the `assignTicket` function. 
    - *Wallet Path:* Minted to the attendee's personal address.
    - *Guest Path:* Minted to a deterministic **GuestID** (an on-chain address generated from the hash of Name + StudentID).
4.  **Identity Binding:** The system computes a `keccak256` hash of the (Name + StudentID) and stores it on-chain, bound to the unique `ticketId`.

#### 4.2 Booth Operator Responsibilities
*   Verification of physical identity documents.
*   Confirmation of fiat payment.
*   Ensuring the accuracy of the identity data before the once-only hash binding.

#### 4.3 Intentional Off-Chain Payment
Payment is intentionally kept off-chain to support "cash-heavy" campus economies and to avoid the regulatory and technical overhead of integrating online fiat on-ramps (like Stripe) in regions where they are unavailable or restricted.

---

### 5. Smart Contract Design
The `FairTicket.sol` contract implements a robust Role-Based Access Control (RBAC) system.

#### 5.1 Roles (via OpenZeppelin AccessControl)
*   **DEFAULT_ADMIN_ROLE:** System owner; manages global settings and grants/revokes roles.
*   **ORGANIZER_ROLE:** Granted to event creators. Can mint generic tickets and verify entries for their specific events.
*   **BOOTH_OPERATOR_ROLE:** Granted to staff members. Authorized to call `assignTicket` and `updateTicketMetadata`.

#### 5.2 Key Logic & Metadata
*   **Identity Hash Binding:** Identity metadata is stored as `bytes32` hashes to preserve privacy while allowing on-gate verification.
*   **Once-Only Rule:** The `updateTicketMetadata` function prevents reassignment or alteration of identity once a hash has been set.
*   **Audit Fields:** Every `TicketData` struct includes `assignedAt` (block timestamp) and `assignedBy` (operator address), creating a permanent audit trail of staff actions.

---

### 6. Verification Flow (Two-Layer Security)
FairTicket employs a "Defense in Depth" strategy for entry control.

#### 6.1 Layer 1: Human Verification
The gatekeeper performs a visual inspection of the physical Student ID against the holder information displayed on the attendee's FairTicket dashboard.

#### 6.2 Layer 2: Blockchain Verification (Challenge-Response)
```text
Scanner (Gate)                     Attendee (Phone)
      |                                   |
      | 1. Generate Nonce + Deadline      |
      |---------------------------------->|
      |                                   |
      | 2. Sign(TokenId, Nonce, Deadline) |
      |<----------------------------------|
      |                                   |
      | 3. verifyTicket(Signature)        |
      |---------------------------------->| [Blockchain]
```
The smart contract verifies that the signature was produced by the current `ownerOf` the NFT within a 60-second window, preventing replay attacks.

#### 6.3 Guest (No-Wallet) Verification
For attendees without wallets, the Gatekeeper manually enters the student's name and ID from their physical card into the scanner interface. The smart contract verifies that the `keccak256` hash of these inputs matches the hash stored during assignment at the **GuestID** address. This prevents using a stolen ticket QR without the matching physical ID card.

---

### 7. Fraud Prevention & Security Controls
*   **Ticket Resale Prevention:** Since the ticket is bound to a hashed Student ID on-chain, a transferred NFT will not match the physical ID card presented at the gate.
*   **Rate Limiting:** If a ticket fails verification 3 times (due to invalid signatures), it is locked for 5 minutes to prevent brute-force attacks.
*   **Nonce Expiration:** Challenges expire after 60 seconds, ensuring that intercepted QR codes cannot be reused.
*   **Double-Scan Rejection:** The `isScanned` flag is updated atomically; once a ticket is used, it cannot be used again for the same event.

---

### 8. Gas & Performance Optimizations
*   **Storage Caching:** Ticket and event data are cached in memory during function execution to minimize expensive `SLOAD` operations.
*   **Unchecked Blocks:** Used for counter increments where overflow is mathematically impossible (e.g., ID increments), reducing gas costs.
*   **Event-Driven UI:** The system relies on `TicketMinted` and `TicketScanned` events to update dashboards via The Graph, ensuring the UI remains performant even under high load.

---

### 9. Testing Strategy
The system is validated using a comprehensive Hardhat test suite:
*   **RBAC Enforcement:** Ensures only users with `BOOTH_OPERATOR_ROLE` can assign tickets.
*   **Assignment Immutability:** Verifies that once identity hashes are set, they cannot be modified.
*   **Verification Failure:** Tests the 3-strike lockout policy and ensures expired challenges revert correctly.
*   **Isolation:** Confirms that an organizer for Event A cannot verify tickets for Event B.

---

### 10. Deployment & Environment
*   **Local:** Hardhat Network with 100% test coverage.
*   **Testnet:** Polygon Amoy / Base Sepolia.
*   **Production:** Polygon PoS or Base Mainnet for low-cost, high-speed transactions.
*   **Requirements:** An RPC provider (Alchemy/Infura) and a private key with sufficient native tokens for gas.

---

### 11. Operational Guidelines (University Use Case)
1.  **Setup:** The University Admin deploys the contract and grants `BOOTH_OPERATOR_ROLE` to student union staff.
2.  **Booth Operation:** Staff collect fees, check Student IDs, and use the "Operator Dashboard" to call `assignTicket`.
3.  **Entry Management:** Gatekeepers use "Scanner Mode" to issue challenges. They first check the physical ID, then scan the attendee's proof.
4.  **Incident Handling:** If a lockout occurs, the attendee must wait 5 minutes. If a signature fails repeatedly, the gatekeeper flags the ticket for manual audit by the admin.

---

### 12. Limitations & Future Work
*   **Connectivity:** Currently, a live internet connection is required for the gatekeeper to submit the `verifyTicket` transaction.
*   **Privacy:** While identity is hashed, the hashes are public. Future iterations will explore **Zero-Knowledge Proofs (ZKP)** to prove "I am the owner" without revealing the Student ID hash at all.
*   **Exclusion of Fiat Gateways:** Stripe and MoonPay are excluded by design to ensure the system is fully functional for unbanked students and in regions with strict capital controls.

---

### 13. Conclusion
FairTicket provides a high-assurance, auditable, and fraud-proof ticketing solution. By anchoring physical identity to blockchain-based ownership, it effectively eliminates the secondary market and duplication issues that plague university and restricted-venue events.