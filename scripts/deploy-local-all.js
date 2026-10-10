const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function envNumber(name, fallback) {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : Number(raw);
}

/**
 * One-command local end-to-end rehearsal.
 *
 * Deploys the VelocityToken and VelocityPresale contracts, wires them together
 * (fee exemption + token allocation), optionally whitelists a demo buyer, and
 * writes a combined deployment record under `deployments/`.
 *
 * Intended for local development (the in-process `hardhat` network or a local
 * node). It does NOT require any environment variables and never touches a
 * public network.
 */
async function main() {
  const [deployer, demoBuyer] = await hre.ethers.getSigners();
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;

  console.log("=======================================================");
  console.log(" Velocity Token - local end-to-end deployment");
  console.log("=======================================================");
  console.log("Network :", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury);
  console.log("=======================================================");

  // 1. Deploy the token.
  const Token = await hre.ethers.getContractFactory("VelocityToken");
  const token = await Token.deploy(treasury);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("\n[1/5] VelocityToken deployed to:", tokenAddress);

  // 2. Deploy the presale (native-currency payments).
  const presalePrice = envNumber("PRESALE_PRICE", 1000);
  const startDelay = envNumber("PRESALE_START_DELAY", 60);
  const duration = envNumber("PRESALE_DURATION", 7 * 24 * 3600);
  const hardCap = hre.ethers.parseEther(String(envNumber("HARD_CAP", 100)));
  const softCap = hre.ethers.parseEther(String(envNumber("SOFT_CAP", 20)));
  const minPurchase = hre.ethers.parseEther(String(envNumber("MIN_PURCHASE", 0.01)));
  const maxPurchase = hre.ethers.parseEther(String(envNumber("MAX_PURCHASE", 5)));

  const now = (await hre.ethers.provider.getBlock("latest")).timestamp;
  const startTime = now + startDelay;
  const endTime = startTime + duration;

  const Presale = await hre.ethers.getContractFactory("VelocityPresale");
  const presale = await Presale.deploy(
    tokenAddress,
    hre.ethers.ZeroAddress,
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
  console.log("[2/5] VelocityPresale deployed to:", presaleAddress);

  // 3. Exempt the presale from fees / the max-wallet limit.
  await (await token.setFeeExempt(presaleAddress, true)).wait();
  console.log("[3/5] Presale exempted from transfer fees and the max-wallet limit");

  // 4. Fund the presale with a token allocation.
  const allocation = hre.ethers.parseEther(String(envNumber("PRESALE_ALLOCATION", 1000000)));
  await (await token.transfer(presaleAddress, allocation)).wait();
  console.log("[4/5] Funded presale with", hre.ethers.formatEther(allocation), "VELO");

  // 5. Whitelist a demo buyer (the presale enforces a whitelist by default).
  let demoBuyerAddress = null;
  if (demoBuyer) {
    demoBuyerAddress = demoBuyer.address;
    await (await presale.addToWhitelist(demoBuyerAddress)).wait();
    console.log("[5/5] Whitelisted demo buyer:", demoBuyerAddress);
  } else {
    console.log("[5/5] No second signer available to whitelist");
  }

  const network = await hre.ethers.provider.getNetwork();
  const record = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    tokenAddress,
    presaleAddress,
    owner: deployer.address,
    treasury,
    demoBuyer: demoBuyerAddress,
    deploymentDate: new Date().toISOString(),
    token: {
      name: await token.name(),
      symbol: await token.symbol(),
      initialSupply: hre.ethers.formatUnits(await token.totalSupply(), 18),
    },
    presale: {
      paymentToken: "ETH",
      price: presalePrice,
      startTime,
      endTime,
      hardCap: hre.ethers.formatEther(hardCap),
      softCap: hre.ethers.formatEther(softCap),
      minPurchase: hre.ethers.formatEther(minPurchase),
      maxPurchase: hre.ethers.formatEther(maxPurchase),
      allocation: hre.ethers.formatEther(allocation),
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}-local-all.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));

  console.log("\n=======================================================");
  console.log(" LOCAL DEPLOYMENT COMPLETE");
  console.log("=======================================================");
  console.log(JSON.stringify(record, null, 2));
  console.log("Deployment record written to:", outFile);
  console.log("\nNext: advance time to startTime, then call presale.buyTokens({ value })");
  console.log("as the whitelisted buyer, followed by endPresale() and enableClaiming().");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
