// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FairTicket
 * @dev A multi-tenant, fraud-proof ticketing system on Polygon/Base.
 * Implements a Challenge-Response verification mechanism and Booth-based assignment.
 */
contract FairTicket is ERC721, AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;

    // --- Roles ---
    bytes32 public constant BOOTH_OPERATOR_ROLE = keccak256("BOOTH_OPERATOR_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    // --- Structs ---

    struct Event {
        uint32 id;               // fits in 4 bytes
        address organizer;       // 20 bytes
        uint32 maxSupply;        // max tickets per event
        uint32 mintedCount;      // current minted count
        bool isActive;           // 1 byte, packed with next slot
        // name is emitted via EventCreated event, not stored on‑chain
    }

    struct TicketData {
        uint32 eventId;            // reference to Event.id
        uint96 assignedAt;         // block timestamp fits in 96 bits
        address assignedBy;        // 20 bytes
        bytes32 holderNameHash;    // 32 bytes (zero when not set)
        bytes32 holderStudentIdHash; // 32 bytes (zero when not set)
        bool isScanned;            // 1 byte, packed
    }

    // --- State Variables ---

    uint32 private _nextEventId; // auto‑increment event IDs
    uint256 private _nextTokenId; // ERC721 token counter (still uint256)

    // Mapping from Event ID to Event details (packed struct)
    mapping(uint32 => Event) public events;

    // Mapping from Token ID to Ticket details
    mapping(uint256 => TicketData) public tickets;

    // Mapping to track events created by an organizer (store event IDs as uint32)
    mapping(address => uint32[]) public organizerEvents;

    // Mapping from Event ID to list of Token IDs for that event
    mapping(uint32 => uint256[]) public eventTickets;

    // Security: Rate Limiting
    mapping(uint256 => uint256) private _failedAttempts;
    mapping(uint256 => uint256) private _lockoutTime;
    uint8 private constant MAX_ATTEMPTS = 3; // fits in a byte
    uint64 private constant LOCKOUT_DURATION = 5 minutes; // timestamp fits in 64 bits

    // --- Events ---

    event EventCreated(uint256 indexed eventId, address indexed organizer, string name);
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed owner);
    event TicketAssigned(uint256 indexed tokenId, uint256 indexed eventId, address indexed owner, bytes32 nameHash, bytes32 studentIdHash);
    event TicketScanned(uint256 indexed tokenId, uint256 indexed eventId, address scannedBy, uint256 nonce);
    event VerificationFailed(uint256 indexed tokenId, string reason);
    event TicketLocked(uint256 indexed tokenId, uint256 unlockTime);

    // --- Errors ---

    error UnauthorizedOrganizer();
    error EventNotActive();
    error TicketAlreadyScanned();
    error TicketLockedOut(uint256 unlockTime);
    error ChallengeExpired();
    error NotTicketOwner();
    error EventSoldOut();
    error AlreadyAssigned();
    error InvalidGuestIdentity();

    // --- Guest Logic ---

    /**
     * @dev Generates a deterministic "GuestID" address from identity hashes.
     * This allows tracking "No-Wallet" users on-chain without an actual private key.
     */
    function generateGuestAddress(bytes32 nameHash, bytes32 studentIdHash) public pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(nameHash, studentIdHash)))));
    }

    constructor() ERC721("FairTicket", "FTKT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // --- Organizer Logic ---

    /**
     * @dev Create a new event. The caller becomes the organizer and is granted ORGANIZER_ROLE.
     */
    function createEvent(string calldata name, uint32 maxSupply) external returns (uint32) {
        uint32 newEventId;
        unchecked {
            _nextEventId++;
            newEventId = _nextEventId;
        }

        events[newEventId] = Event({
            id: newEventId,
            organizer: msg.sender,
            maxSupply: maxSupply,
            mintedCount: 0,
            isActive: true
        });
        emit EventCreated(newEventId, msg.sender, name);
        organizerEvents[msg.sender].push(newEventId);
        _grantRole(ORGANIZER_ROLE, msg.sender);
        return newEventId;
    }

    /**
     * @dev Mint a ticket to a specific address. Only the organizer can mint.
     */
    function mintTicket(uint32 eventId, address to) external nonReentrant returns (uint256) {
        Event storage evt = events[eventId];
        if (evt.organizer != msg.sender) revert UnauthorizedOrganizer();
        if (!evt.isActive) revert EventNotActive();
        unchecked {
            if (evt.mintedCount >= evt.maxSupply) revert EventSoldOut();
            evt.mintedCount++;
        }
        uint256 newTokenId = _nextTokenId++;
        tickets[newTokenId] = TicketData({
            eventId: eventId,
            assignedAt: uint96(block.timestamp),
            assignedBy: msg.sender,
            holderNameHash: bytes32(0),
            holderStudentIdHash: bytes32(0),
            isScanned: false
        });
        eventTickets[eventId].push(newTokenId);
        _safeMint(to, newTokenId);
        emit TicketMinted(newTokenId, eventId, to);
        return newTokenId;
    }

    /**
     * @dev Assigns a ticket to a student after on-ground payment.
     * Only Booth Operators can call this.
     */
    function assignTicket(
        uint32 eventId,
        address to,
        bytes32 nameHash,
        bytes32 studentIdHash
    ) external onlyRole(BOOTH_OPERATOR_ROLE) nonReentrant returns (uint256) {
        Event storage evt = events[eventId];
        if (!evt.isActive) revert EventNotActive();
        unchecked {
            if (evt.mintedCount >= evt.maxSupply) revert EventSoldOut();
            evt.mintedCount++;
        }
        uint256 newTokenId = _nextTokenId++;
        tickets[newTokenId] = TicketData({
            eventId: eventId,
            assignedAt: uint96(block.timestamp),
            assignedBy: msg.sender,
            holderNameHash: nameHash,
            holderStudentIdHash: studentIdHash,
            isScanned: false
        });
        eventTickets[eventId].push(newTokenId);
        _safeMint(to, newTokenId);
        emit TicketAssigned(newTokenId, eventId, to, nameHash, studentIdHash);
        return newTokenId;
    }

    function updateTicketMetadata(
        uint256 tokenId,
        bytes32 nameHash,
        bytes32 studentIdHash
    ) external onlyRole(BOOTH_OPERATOR_ROLE) {
        TicketData storage ticket = tickets[tokenId];
        if (ticket.holderNameHash != bytes32(0)) revert AlreadyAssigned();
        ticket.holderNameHash = nameHash;
        ticket.holderStudentIdHash = studentIdHash;
        emit TicketAssigned(tokenId, ticket.eventId, ownerOf(tokenId), nameHash, studentIdHash);
    }

    /**
     * @dev Batch-mint tickets. Saves gas by updating event state once.
     */
    function batchMint(uint32 eventId, address[] calldata recipients) external onlyRole(ORGANIZER_ROLE) {
        Event storage evt = events[eventId];
        if (evt.organizer != msg.sender) revert UnauthorizedOrganizer();
        if (!evt.isActive) revert EventNotActive();
        
        uint256 count = recipients.length;
        if (evt.mintedCount + count > evt.maxSupply) revert EventSoldOut();
        
        evt.mintedCount += uint32(count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 newTokenId = _nextTokenId++;
            tickets[newTokenId] = TicketData({
                eventId: eventId,
                assignedAt: uint96(block.timestamp),
                assignedBy: msg.sender,
                holderNameHash: bytes32(0),
                holderStudentIdHash: bytes32(0),
                isScanned: false
            });
            eventTickets[eventId].push(newTokenId);
            _safeMint(recipients[i], newTokenId);
            emit TicketMinted(newTokenId, eventId, recipients[i]);
        }
    }

    /**
     * @dev Batch-assign tickets. Optimized for high-throughput booths.
     */
    function batchAssign(
        uint32 eventId,
        address[] calldata recipients,
        bytes32[] calldata nameHashes,
        bytes32[] calldata studentIdHashes
    ) external onlyRole(BOOTH_OPERATOR_ROLE) nonReentrant {
        Event storage evt = events[eventId];
        if (!evt.isActive) revert EventNotActive();
        
        uint256 count = recipients.length;
        if (evt.mintedCount + count > evt.maxSupply) revert EventSoldOut();
        
        evt.mintedCount += uint32(count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 newTokenId = _nextTokenId++;
            tickets[newTokenId] = TicketData({
                eventId: eventId,
                assignedAt: uint96(block.timestamp),
                assignedBy: msg.sender,
                holderNameHash: nameHashes[i],
                holderStudentIdHash: studentIdHashes[i],
                isScanned: false
            });
            eventTickets[eventId].push(newTokenId);
            _safeMint(recipients[i], newTokenId);
            emit TicketAssigned(newTokenId, eventId, recipients[i], nameHashes[i], studentIdHashes[i]);
        }
    }

    // --- Verification Logic (The Core Security Mechanism) ---

    /**
     * @dev Verifies a ticket using a Challenge-Response mechanism.
     * 
     * @param tokenId The ticket ID being presented.
     * @param nonce A random nonce generated by the Scanner.
     * @param deadline The timestamp after which the signature is invalid.
     * @param signature The Attendee's signature of (tokenId, nonce, deadline, contractAddress, chainId).
     * 
     * Security:
     * - Rate limiting: Locks ticket after 3 failed attempts.
     * - Deadline: Prevents replay of old signatures.
     */
    function verifyTicket(
        uint256 tokenId, 
        uint256 nonce, 
        uint256 deadline, 
        bytes calldata signature
    ) external nonReentrant returns (bool) {
        // 1. Gas Opt: Cache ticket struct
        TicketData storage ticket = tickets[tokenId];
        
        // 2. Validate Access: Only the specific event organizer can verify
        if (events[ticket.eventId].organizer != msg.sender) revert UnauthorizedOrganizer();

        // 3. Validate State: Cannot double-scan
        if (ticket.isScanned) revert TicketAlreadyScanned();

        // 4. Rate Limiting Check
        if (block.timestamp < _lockoutTime[tokenId]) {
            revert TicketLockedOut(_lockoutTime[tokenId]);
        }

        // 5. Check Expiration
        if (block.timestamp > deadline) {
            revert ChallengeExpired();
        }

        // 6. Reconstruct the signed message hash
        // The attendee signs: keccak256(abi.encodePacked(tokenId, nonce, deadline, contractAddress, chainId))
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, nonce, deadline, address(this), block.chainid));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        // 7. Recover signer
        address signer = ECDSA.recover(ethSignedMessageHash, signature);

        // 8. Validate Ownership
        if (signer != ownerOf(tokenId)) {
            // Handle Failure without Reverting (to record the attempt)
            unchecked {
                _failedAttempts[tokenId]++;
            }

            if (_failedAttempts[tokenId] >= MAX_ATTEMPTS) {
                _lockoutTime[tokenId] = block.timestamp + LOCKOUT_DURATION;
                _failedAttempts[tokenId] = 0; // Reset count
                emit TicketLocked(tokenId, _lockoutTime[tokenId]);
            }
            
            emit VerificationFailed(tokenId, "Invalid Signature or Owner");
            return false;
        }

        // 9. Execute Entry & Refund Gas by zeroing out sensitive storage
        _failedAttempts[tokenId] = 0; 
        ticket.isScanned = true;
        
        // Gas Refund: Zero out hashes as they are no longer needed for check-in
        // This triggers the SSTORE 15k refund (capped by 20% rule)
        ticket.holderNameHash = bytes32(0);
        ticket.holderStudentIdHash = bytes32(0);
        
        emit TicketScanned(tokenId, ticket.eventId, msg.sender, nonce);
        
        return true;
    }

    /**
     * @dev Verifies and checks in a Guest (no-wallet) attendee.
     * The Organizer verifies the physical ID against the on-chain hash.
     */
    function checkInGuest(
        uint256 tokenId, 
        bytes32 nameHash, 
        bytes32 studentIdHash
    ) external nonReentrant returns (bool) {
        TicketData storage ticket = tickets[tokenId];
        
        if (events[ticket.eventId].organizer != msg.sender) revert UnauthorizedOrganizer();
        if (ticket.isScanned) revert TicketAlreadyScanned();
        
        // Validate identity matches stored hashes
        if (ticket.holderNameHash != nameHash || ticket.holderStudentIdHash != studentIdHash) {
            revert InvalidGuestIdentity();
        }

        ticket.isScanned = true;
        
        // Gas Refund: Zero out hashes as they are no longer needed for check-in
        ticket.holderNameHash = bytes32(0);
        ticket.holderStudentIdHash = bytes32(0);
        
        emit TicketScanned(tokenId, ticket.eventId, msg.sender, 0); // Nonce 0 for guest
        
        return true;
    }

    // --- Public Views ---

    function getOrganizerEvents(address organizer) external view returns (uint32[] memory) {
        return organizerEvents[organizer];
    }

    function getEventTickets(uint32 eventId) external view returns (uint256[] memory) {
        return eventTickets[eventId];
    }
    
    function getTicketDetails(uint256 tokenId) external view returns (TicketData memory, address) {
        TicketData memory t = tickets[tokenId];
        address owner = address(0);
        try this.ownerOf(tokenId) returns (address _owner) {
            owner = _owner;
        } catch {}
        
        return (t, owner);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
