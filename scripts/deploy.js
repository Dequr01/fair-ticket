import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const fairTicket = await hre.ethers.deployContract("FairTicket");
  await fairTicket.waitForDeployment();

  const address = await fairTicket.getAddress();
  console.log("FairTicket deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
