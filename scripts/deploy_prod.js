import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`Deploying to ${network} with account: ${deployer.address}`);

  const FairTicket = await hre.ethers.getContractFactory("FairTicket");
  const fairTicket = await FairTicket.deploy();
  await fairTicket.waitForDeployment();

  const address = await fairTicket.getAddress();
  console.log(`FairTicket deployed to: ${address}`);

  // Update Frontend Config
  const configPath = path.resolve(__dirname, "../src/config/contracts.ts");
  const chainId = hre.network.config.chainId || 1337;
  
  const content = `export const CONTRACT_ADDRESS = "${address}";
export const CHAIN_ID = ${chainId};
`;

  fs.writeFileSync(configPath, content);
  console.log(`Updated frontend config at ${configPath}`);

  // Verification (skip for localhost)
  if (network !== "localhost" && network !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await fairTicket.deploymentTransaction().wait(5); // Wait 5 blocks

    console.log("Verifying on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
    } catch (e) {
      console.error("Verification failed:", e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
