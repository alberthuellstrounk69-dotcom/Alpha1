# Deploy ETHForwarder

## Prerequisites
- Node.js installed
- `.env` file configured (see `.env.example`)

## Steps

### 1. Install dependencies
```bash
npm install
```

### 2. Compile contracts
```bash
npx hardhat compile
```

### 3. Test (recommended)
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Deploy to mainnet
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### 5. Verify on Etherscan
```bash
npx hardhat run scripts/verify.js --network mainnet
```

Deployed addresses are saved to `deployments/mainnet.json`.
