const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function envNumber(name, fallback) {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : Number(raw);
}

/**
 * Deploy the VelocityPresale contract.
 *
 * Required env:
 *   TOKEN_ADDRESS         address of the VELO token (or set after deploy-token)
 * Optional env (with defaults):
 *   PRESALE_PRICE, PRESALE_START_DELAY, PRESALE_DURATION,
 *   HARD_CAP, SOFT_CAP, MIN_PURCHASE, MAX_PURCHASE
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("TOKEN_ADDRESS is required (deploy the token first)");
  }

  const paymentToken = process.env.PAYMENT_TOKEN || hre.ethers.ZeroAddress;
  const presalePrice = envNumber("PRESALE_PRICE", 1000);
  const startDelay = envNumber("PRESALE_START_DELAY", 3600);
  const duration = envNumber("PRESALE_DURATION", 7 * 24 * 3600);
  const hardCap = hre.ethers.parseEther(String(envNumber("HARD_CAP", 100)));
  const softCap = hre.ethers.parseEther(String(envNumber("SOFT_CAP", 20)));
  const minPurchase = hre.ethers.parseEther(String(envNumber("MIN_PURCHASE", 0.01)));
  const maxPurchase = hre.ethers.parseEther(String(envNumber("MAX_PURCHASE", 5)));

  const now = Math.floor(Date.now() / 1000);
  const startTime = now + startDelay;
  const endTime = startTime + duration;

  console.log("=======================================================");
  console.log(" Velocity Presale deployment");
  console.log("=======================================================");
  console.log("Network       :", hre.network.name);
  console.log("Deployer      :", deployer.address);
  console.log("Token         :", tokenAddress);
  console.log("Payment token :", paymentToken === hre.ethers.ZeroAddress ? "ETH" : paymentToken);
  console.log("Price         :", presalePrice, "tokens per payment unit");
  console.log("Start         :", new Date(startTime * 1000).toISOString());
  console.log("End           :", new Date(endTime * 1000).toISOString());
  console.log("Hard cap      :", hre.ethers.formatEther(hardCap));
  console.log("Soft cap      :", hre.ethers.formatEther(softCap));
  console.log("Min purchase  :", hre.ethers.formatEther(minPurchase));
  console.log("Max purchase  :", hre.ethers.formatEther(maxPurchase));
  console.log("=======================================================");

  const Presale = await hre.ethers.getContractFactory("VelocityPresale");
  const presale = await Presale.deploy(
    tokenAddress,
    paymentToken,
    presalePrice,
    startTime,
    endTime,
    hardCap,
    softCap,
    minPurchase,
    maxPurchase,
  );
  await presale.waitForDeployment();

  const presaleAddress = await presale.getAddress();
  const network = await hre.ethers.provider.getNetwork();

  const info = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    presaleAddress,
    tokenAddress,
    paymentToken,
    owner: deployer.address,
    deploymentDate: new Date().toISOString(),
    presaleParameters: {
      price: presalePrice,
      startTime,
      endTime,
      hardCap: hre.ethers.formatEther(hardCap),
      softCap: hre.ethers.formatEther(softCap),
      minPurchase: hre.ethers.formatEther(minPurchase),
      maxPurchase: hre.ethers.formatEther(maxPurchase),
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}-presale.json`);
  fs.writeFileSync(outFile, JSON.stringify(info, null, 2));

  console.log(JSON.stringify(info, null, 2));
  console.log("Deployment record written to:", outFile);
  console.log("\nNext steps:");
  console.log("1. Fund the presale with VELO: token.transfer(presaleAddress, amount)");
  console.log("2. (Optional) whitelist buyers: presale.addToWhitelist(addr)");
  console.log("3. After the sale: presale.endPresale() then presale.enableClaiming()");
  console.log("4. Withdraw funds: presale.withdrawFunds(recipient)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
