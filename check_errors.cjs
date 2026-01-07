const { keccak256, toUtf8Bytes } = require("ethers");

const errors = [
    "UnauthorizedOrganizer()",
    "EventNotActive()",
    "TicketAlreadyScanned()",
    "TicketLockedOut(uint256)",
    "ChallengeExpired()",
    "NotTicketOwner()",
    "EventSoldOut()",
    "AlreadyAssigned()",
    "InvalidGuestIdentity()",
    // Standard OpenZeppelin errors that might occur
    "AccessControlUnauthorizedAccount(address,bytes32)",
    "OwnableUnauthorizedAccount(address)" 
];

errors.forEach(err => {
    const hash = keccak256(toUtf8Bytes(err));
    const selector = hash.slice(0, 10);
    console.log(`${selector} : ${err}`);
});
