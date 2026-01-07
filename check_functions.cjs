const { keccak256, toUtf8Bytes } = require("ethers");

const functions = [
    "checkInGuest(uint256,bytes32,bytes32)",
    "verifyTicket(uint256,uint256,uint256,bytes)"
];

functions.forEach(fn => {
    const hash = keccak256(toUtf8Bytes(fn));
    const selector = hash.slice(0, 10);
    console.log(`${selector} : ${fn}`);
});
