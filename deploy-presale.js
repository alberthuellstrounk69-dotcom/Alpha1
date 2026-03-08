const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("         VELOCITY PRESALE DEPLOYMENT FOR ALBERT PETER HUELLSTROUNK");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("\nDeploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Presale parameters
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Local deployment
  const PAYMENT_TOKEN = "0x0000000000000000000000000000000000000000"; // ETH
  const PRESALE_PRICE = 1000; // 1000 VELO per 1 ETH
  const START_TIME = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const END_TIME = START_TIME + (7 * 24 * 3600); // 7 days duration
  const HARD_CAP = ethers.parseEther("100"); // 100 ETH
  const SOFT_CAP = ethers.parseEther("20"); // 20 ETH
  const MIN_PURCHASE = ethers.parseEther("0.01"); // 0.01 ETH
  const MAX_PURCHASE = ethers.parseEther("5"); // 5 ETH per wallet
  
  console.log("\nPresale Parameters:");
  console.log("- Token Address:", TOKEN_ADDRESS);
  console.log("- Payment: ETH");
  console.log("- Price:", PRESALE_PRICE, "VELO per 1 ETH");
  console.log("- Start Time:", new Date(START_TIME * 1000).toISOString());
  console.log("- End Time:", new Date(END_TIME * 1000).toISOString());
  console.log("- Hard Cap:", ethers.formatEther(HARD_CAP), "ETH");
  console.log("- Soft Cap:", ethers.formatEther(SOFT_CAP), "ETH");
  console.log("- Min Purchase:", ethers.formatEther(MIN_PURCHASE), "ETH");
  console.log("- Max Purchase:", ethers.formatEther(MAX_PURCHASE), "ETH");
  
  // Deploy presale contract
  console.log("\nDeploying VelocityPresale contract...");
  const Presale = await ethers.getContractFactory("VelocityPresale");
  const presale = await Presale.deploy(
    TOKEN_ADDRESS,
    PAYMENT_TOKEN,
    PRESALE_PRICE,
    START_TIME,
    END_TIME,
    HARD_CAP,
    SOFT_CAP,
    MIN_PURCHASE,
    MAX_PURCHASE
  );
  
  await presale.waitForDeployment();
  
  const presaleAddress = await presale.getAddress();
  console.log("VelocityPresale deployed to:", presaleAddress);
  
  // Get presale status
  const status = await presale.getPresaleStatus();
  console.log("\nPresale Status:");
  console.log("- Tokens Sold:", ethers.formatEther(status._tokensSold), "VELO");
  console.log("- Total Raised:", ethers.formatEther(status._totalRaised), "ETH");
  console.log("- Hard Cap:", ethers.formatEther(status._hardCap), "ETH");
  console.log("- Soft Cap:", ethers.formatEther(status._softCap), "ETH");
  console.log("- Purchaser Count:", status._purchaserCount.toString());
  
  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("                    PRESALE DEPLOYMENT SUCCESSFUL");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("\nNext Steps:");
  console.log("1. Fund presale contract with VELO tokens");
  console.log("2. Add users to whitelist:");
  console.log("   await presale.addToWhitelist('0x...')");
  console.log("3. Whitelist can be disabled with:");
  console.log("   await presale.setWhitelistRequired(false)");
  console.log("4. Users can buy tokens with ETH");
  console.log("5. After presale ends, enable claiming:");
  console.log("   await presale.enableClaiming()");
  console.log("6. Users can claim their tokens");
  console.log("7. Withdraw raised funds:");
  console.log("   await presale.withdrawFunds(yourAddress)");
  console.log("\n═══════════════════════════════════════════════════════════════════════");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    presaleAddress: presaleAddress,
    tokenAddress: TOKEN_ADDRESS,
    owner: deployer.address,
    deploymentDate: new Date().toISOString(),
    presaleParameters: {
      price: PRESALE_PRICE.toString(),
      startTime: START_TIME.toString(),
      endTime: END_TIME.toString(),
      hardCap: ethers.formatEther(HARD_CAP) + " ETH",
      softCap: ethers.formatEther(SOFT_CAP) + " ETH",
      minPurchase: ethers.formatEther(MIN_PURCHASE) + " ETH",
      maxPurchase: ethers.formatEther(MAX_PURCHASE) + " ETH"
    }
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "presale-deployment.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Presale deployment info saved to: presale-deployment.json");
  console.log("\n✅ Presale deployment completed successfully!");
  console.log("\n⚠️  IMPORTANT: Save the presale address for future reference!");
  console.log("\n═══════════════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });