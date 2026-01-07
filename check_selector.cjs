const { keccak256, toUtf8Bytes } = require("ethers");

const errorSignature = "UnauthorizedOrganizer()";
const hash = keccak256(toUtf8Bytes(errorSignature));
const selector = hash.slice(0, 10);

console.log(`Error: ${errorSignature}`);
console.log(`Selector: ${selector}`);
