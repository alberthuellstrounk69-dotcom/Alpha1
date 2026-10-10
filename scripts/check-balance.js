const hre = require("hardhat");

/**
 * Print the native balance of an address (defaults to the first signer).
 * Usage: npx hardhat run scripts/check-balance.js --network <network> [address]
 */
async function main() {
  const [signer] = await hre.ethers.getSigners();
  const target = process.argv[2] || (signer && signer.address);

  if (!target) {
    throw new Error("No address provided and no signer available");
  }

  const balance = await hre.ethers.provider.getBalance(target);
  console.log("Network:", hre.network.name);
  console.log("Address:", target);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
