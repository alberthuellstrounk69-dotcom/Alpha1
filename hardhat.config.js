require("dotenv").config();

require("@nomicfoundation/hardhat-toolbox");

const { DEPLOYER_PRIVATE_KEY, INFURA_API_KEY, ALCHEMY_API_KEY, ETHERSCAN_API_KEY, REPORT_GAS } =
  process.env;

/**
 * Build an RPC URL from whichever provider key is available.
 * @param {string} alchemySubdomain e.g. "eth-sepolia"
 * @param {string} infuraNetwork e.g. "sepolia"
 */
function rpcUrl(alchemySubdomain, infuraNetwork) {
  if (ALCHEMY_API_KEY) {
    return `https://${alchemySubdomain}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  }
  if (INFURA_API_KEY) {
    return `https://${infuraNetwork}.infura.io/v3/${INFURA_API_KEY}`;
  }
  return "";
}

// Only attach an account when a private key is provided, so that read-only
// tasks and local development keep working without secrets.
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Match the metadata bytecode hash used by the original artifacts.
      metadata: {
        bytecodeHash: "ipfs",
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: rpcUrl("eth-sepolia", "sepolia"),
      chainId: 11155111,
      accounts,
    },
    mainnet: {
      url: rpcUrl("eth-mainnet", "mainnet"),
      chainId: 1,
      accounts,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000,
  },
};
