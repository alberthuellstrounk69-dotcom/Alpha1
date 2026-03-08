const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying VelocityToken with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  const Token = await ethers.getContractFactory("VelocityToken");
  const token = await Token.deploy(deployer.address);
  
  await token.waitForDeployment();
  
  const address = await token.getAddress();
  console.log("VelocityToken deployed to:", address);
  
  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("                    DEPLOYMENT SUCCESSFUL");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("\nDeployment Summary:");
  console.log("- Token Name: Velocity Token");
  console.log("- Token Symbol: VELO");
  console.log("- Initial Supply: 10,000,000 VELO");
  console.log("- Owner:", deployer.address);
  console.log("- Treasury Wallet:", deployer.address);
  console.log("- Contract Address:", address);
  console.log("\n═══════════════════════════════════════════════════════════════════════");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: address,
    owner: deployer.address,
    treasury: deployer.address,
    deploymentDate: new Date().toISOString(),
    tokenName: "Velocity Token",
    tokenSymbol: "VELO",
    initialSupply: "10000000"
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "deployment.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to: deployment.json");
  console.log("\n✅ Deployment completed successfully!");
  console.log("\n⚠️  IMPORTANT: Save the contract address for future reference!");
  console.log("\n═══════════════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });