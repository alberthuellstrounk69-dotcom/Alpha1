const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// List of networks to deploy to
const NETWORKS = [
  { name: "ethereum", label: "Ethereum Mainnet", chainId: 1 },
  { name: "polygon", label: "Polygon", chainId: 137 },
  { name: "bsc", label: "Binance Smart Chain", chainId: 56 },
  { name: "avalanche", label: "Avalanche", chainId: 43114 },
  { name: "arbitrum", label: "Arbitrum", chainId: 42161 },
  { name: "optimism", label: "Optimism", chainId: 10 },
  { name: "base", label: "Base", chainId: 8453 },
  { name: "fantom", label: "Fantom", chainId: 250 }
];

// Deployment tracking
let deployments = [];
let deploymentLog = [];

async function deployToNetwork(network) {
  console.log(`\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`DEPLOYING TO: ${network.label.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════════════`);
  
  try {
    // Switch to the target network
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: network.rpcUrl
          }
        }
      ]
    });
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`\n📝 Deploying with account: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
    
    // Check if balance is sufficient
    const minBalance = ethers.parseEther("0.01");
    if (balance < minBalance) {
      console.log(`⚠️  WARNING: Insufficient balance! Need at least 0.01 ETH for deployment`);
      console.log(`❌ Skipping ${network.label}`);
      return {
        success: false,
        network: network.name,
        error: "Insufficient balance"
      };
    }
    
    // Deploy contract
    console.log(`\n🚀 Deploying VelocityToken...`);
    const Token = await ethers.getContractFactory("VelocityToken");
    const token = await Token.deploy(deployer.address);
    await token.waitForDeployment();
    
    const contractAddress = await token.getAddress();
    console.log(`✅ Contract deployed to: ${contractAddress}`);
    
    // Verify deployment
    const owner = await token.owner();
    const totalSupply = await token.totalSupply();
    const name = await token.name();
    const symbol = await token.symbol();
    
    console.log(`\n📊 Contract Details:`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Total Supply: ${ethers.formatEther(totalSupply)} VELO`);
    console.log(`   - Owner: ${owner}`);
    console.log(`   - Treasury: ${await token.treasuryWallet()}`);
    
    // Get gas used
    const receipt = await token.deploymentTransaction().wait();
    console.log(`\n⛽ Gas Used: ${receipt.gasUsed.toString()}`);
    
    deploymentLog.push({
      timestamp: new Date().toISOString(),
      network: network.name,
      label: network.label,
      chainId: network.chainId,
      contractAddress: contractAddress,
      deployer: deployer.address,
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      status: "success"
    });
    
    return {
      success: true,
      network: network.name,
      contractAddress: contractAddress,
      transactionHash: receipt.hash
    };
    
  } catch (error) {
    console.error(`\n❌ Deployment failed for ${network.label}:`);
    console.error(`   Error: ${error.message}`);
    
    deploymentLog.push({
      timestamp: new Date().toISOString(),
      network: network.name,
      label: network.label,
      chainId: network.chainId,
      error: error.message,
      status: "failed"
    });
    
    return {
      success: false,
      network: network.name,
      error: error.message
    };
  }
}

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║         VELOCITY TOKEN MULTI-CHAIN DEPLOYMENT                    ║`);
  console.log(`║         EXCLUSIVELY FOR ALBERT PETER HUELLSTROUNK                 ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════════════╝`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`\n🔑 Deployer Address: ${deployer.address}`);
  console.log(`📅 Deployment Date: ${new Date().toISOString()}`);
  
  // Deploy to each network
  for (const network of NETWORKS) {
    const result = await deployToNetwork(network);
    deployments.push(result);
    
    // Wait a bit between deployments
    if (network.name !== NETWORKS[NETWORKS.length - 1].name) {
      console.log(`\n⏳ Waiting 5 seconds before next deployment...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Generate summary report
  console.log(`\n\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`                      DEPLOYMENT SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════════════════`);
  
  let successful = 0;
  let failed = 0;
  
  deployments.forEach((deployment, index) => {
    if (deployment.success) {
      successful++;
      console.log(`\n✅ ${NETWORKS[index].label}:`);
      console.log(`   Contract: ${deployment.contractAddress}`);
      console.log(`   TX: ${deployment.transactionHash}`);
    } else {
      failed++;
      console.log(`\n❌ ${NETWORKS[index].label}:`);
      console.log(`   Error: ${deployment.error}`);
    }
  });
  
  console.log(`\n\n📊 Statistics:`);
  console.log(`   Total Networks: ${NETWORKS.length}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Success Rate: ${((successful / NETWORKS.length) * 100).toFixed(2)}%`);
  
  // Save deployment log
  const logFileName = `multi-chain-deployment-${Date.now()}.json`;
  fs.writeFileSync(logFileName, JSON.stringify(deploymentLog, null, 2));
  console.log(`\n💾 Deployment log saved to: ${logFileName}`);
  
  // Save summary for easy reference
  const summary = {
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    totalNetworks: NETWORKS.length,
    successful: successful,
    failed: failed,
    deployments: deployments
  };
  
  fs.writeFileSync("multi-chain-summary.json", JSON.stringify(summary, null, 2));
  console.log(`💾 Deployment summary saved to: multi-chain-summary.json`);
  
  console.log(`\n\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`              MULTI-CHAIN DEPLOYMENT COMPLETED`);
  console.log(`═══════════════════════════════════════════════════════════════════════`);
  
  if (failed > 0) {
    console.log(`\n⚠️  NOTE: Some deployments failed. Please check the error messages and ensure your wallet has sufficient funds on each network.`);
    console.log(`\n💡 Tip: You can deploy to individual networks using:`);
    console.log(`   npx hardhat run scripts/deploy.js --network <network-name>`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });