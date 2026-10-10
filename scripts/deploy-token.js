const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy the VelocityToken (VELO) contract.
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY  (only for public networks)
 * Optional env:
 *   TREASURY_ADDRESS      (defaults to the deployer address)
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;

  console.log("=======================================================");
  console.log(" Velocity Token deployment");
  console.log("=======================================================");
  console.log("Network :", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance :",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH",
  );
  console.log("Treasury:", treasury);
  console.log("=======================================================");

  const Token = await hre.ethers.getContractFactory("VelocityToken");
  const token = await Token.deploy(treasury);
  await token.waitForDeployment();

  const address = await token.getAddress();
  const network = await hre.ethers.provider.getNetwork();

  const info = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    contractAddress: address,
    owner: deployer.address,
    treasury,
    deploymentDate: new Date().toISOString(),
    tokenName: await token.name(),
    tokenSymbol: await token.symbol(),
    initialSupply: hre.ethers.formatUnits(await token.totalSupply(), 18),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}-token.json`);
  fs.writeFileSync(outFile, JSON.stringify(info, null, 2));

  console.log(JSON.stringify(info, null, 2));
  console.log("Deployment record written to:", outFile);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
