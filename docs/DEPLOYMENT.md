# Deployment Guide

This guide walks through a safe deployment, from a local rehearsal to a testnet run and finally
mainnet. It assumes you have completed the credential-rotation checklist in `SECURITY.md` and that
you are using a dedicated deployment account.

## 1. Prepare the environment

Install dependencies and copy the example environment file. Fill in an RPC provider key and the
private key of your deployment account. Never reuse a personal wallet, and never commit the `.env`
file.

```bash
npm install
cp .env.example .env
# edit .env
```

Generate a fresh deployment account if you do not already have one, store its mnemonic or private
key in a secret manager, and fund it with enough native currency for gas. For a first pass you can
rehearse entirely offline.

## 2. Rehearse locally

Compile and test, then start a local node and deploy against it. The scripts write a deployment
record under `deployments/` so you can inspect the addresses and parameters.

```bash
npm run compile
npm test
npm run node            # terminal 1
npm run deploy:local    # terminal 2
```

To rehearse the presale locally, set `TOKEN_ADDRESS` to the address printed by the token deployment
and run `npm run deploy:presale:local`. Remember to fund the presale with the token allocation
before opening the sale.

## 3. Deploy to a testnet

Set the RPC and key in `.env`, then deploy to Sepolia. Verify the contracts so that users can read
them on a block explorer.

```bash
npm run deploy:sepolia
npx hardhat verify --network sepolia <TOKEN_ADDRESS> <TREASURY_ADDRESS>
```

Deploy the presale against the token address, then verify it with its nine constructor arguments.
Exercise the full lifecycle on the testnet: whitelist a buyer, buy tokens, end the sale, enable
claiming, claim, and withdraw.

## 4. Pre-mainnet checklist

Before deploying to mainnet, confirm each of the following. The contract has not been audited, so an
independent review is mandatory rather than optional.

- All exposed credentials from the original repository have been rotated and purged from history.
- The deployment account is dedicated, funded, and its key is held in a secret manager.
- The treasury address is a controlled multisig rather than an individual wallet.
- The fee schedule, maximum wallet, caps, price, and sale window are the intended production values.
- Ownership will be transferred to a multisig, or renounced, after configuration is complete.
- The token allocation for the presale has been transferred to the presale contract.
- An independent audit has been completed and its findings resolved.

## 5. Deploy to mainnet

With the checklist complete, deploy the token and then the presale, verifying each on Etherscan.
After deployment, transfer the presale allocation, open the sale, and monitor it. When the sale
ends, call `endPresale`, then `enableClaiming`, then `withdrawFunds` once the soft cap is met, and
finally `withdrawUnsoldTokens` if any allocation remains.

```bash
npm run deploy:mainnet        # or: npx hardhat run scripts/deploy-token.js --network mainnet
npx hardhat verify --network mainnet <TOKEN_ADDRESS> <TREASURY_ADDRESS>
```

## Operational notes

Keep the deployment records and the transaction hashes for every step. Because the contracts are
immutable, configuration mistakes cannot be patched in place; a mistake means redeploying and
migrating. Treat the owner key as the most sensitive secret in the system and move it to a multisig
as soon as configuration is stable.
