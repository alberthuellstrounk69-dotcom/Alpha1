# Velocity Token (VELO)

A production-grade ERC-20 token with a configurable transfer-fee model and a whitelist-capable
presale/crowdsale, built with [Hardhat](https://hardhat.org/) and
[OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/).

> **Provenance.** This project was reconstructed from the `Alpha1` repository, which shipped only
> compiled contract artifacts (`VelocityToken.json`, `VelocityPresale.json`), no Solidity source,
> and a large volume of unrelated files and exposed credentials. The Solidity sources in this
> repository are faithful reconstructions of the shipped ABIs (solc `0.8.20`, OpenZeppelin v5) and
> have been hardened, tested and documented for production use. See `SECURITY.md` for the
> credential-rotation checklist that must be completed before any deployment.

## What this is

The repository contains two contracts. `VelocityToken` is an ERC-20 token that charges a
configurable fee on transfers, splitting it between a treasury wallet, a deflationary burn, and an
on-contract liquidity reserve, while enforcing a maximum-wallet limit and per-account fee
exemptions. `VelocityPresale` is a crowdsale contract that sells the token for either the native
currency or an ERC-20 payment token, optionally behind a whitelist, with soft and hard caps,
per-wallet purchase limits, and a post-sale claim mechanism.

Both contracts follow the checks-effects-interactions pattern, use OpenZeppelin's audited building
blocks, and are covered by an automated test-suite that runs in CI.

## Repository layout

The project keeps a conventional Hardhat layout. Contracts live in `contracts/`, with test-only
helpers under `contracts/mocks/`. Deployment and utility scripts live in `scripts/`. The test-suite
lives in `test/`. Long-form documentation lives in `docs/`, and CI definitions live in `ci/` (see `ci/README.md` for
how to activate them under `.github/workflows/`).

```
contracts/
  VelocityToken.sol        ERC-20 with treasury/burn/liquidity fees + max wallet
  VelocityPresale.sol      Whitelist-capable presale with caps and claiming
  mocks/MockERC20.sol      Fee-less ERC-20 used only by tests
scripts/
  deploy-token.js          Deploy VelocityToken and write a deployment record
  deploy-presale.js        Deploy VelocityPresale and write a deployment record
  check-balance.js         Print the native balance of an address
test/
  VelocityToken.test.js
  VelocityPresale.test.js
docs/
  ARCHITECTURE.md
  DEPLOYMENT.md
```

## Requirements

You need Node.js 18 or newer and npm. Everything else is installed locally by npm. To reach public
networks you also need an RPC provider key (Alchemy or Infura) and, for verification, an Etherscan
API key. None of these are required to compile or test locally.

## Quick start

Install dependencies, compile the contracts, and run the test-suite:

```bash
npm install
npm run compile
npm test
```

Start a local node in one terminal and deploy against it in another:

```bash
npm run node
# in a second terminal
npm run deploy:local
```

## Configuration

Copy `.env.example` to `.env` and fill in the values you need. The `.env` file is ignored by git and
must never be committed. The deployer private key should belong to a dedicated, freshly generated
deployment account rather than a personal wallet, and it should be stored in a secret manager in any
real environment. The deployment scripts read their parameters from environment variables so that no
secrets or network-specific values live in the source tree.

## Contracts

`VelocityToken` is constructed with a single treasury address. It mints a fixed initial supply of
10,000,000 VELO to the deployer, sets a default fee schedule of 2% to the treasury, 1% burned and 1%
to the on-contract liquidity reserve, and sets a default maximum wallet of 1% of the supply. The
owner can later adjust the fee schedule (capped at 10% in total), change or disable the maximum
wallet, and grant or revoke fee exemptions. Fees and the wallet limit are skipped for exempt
accounts and for mint/burn operations.

`VelocityPresale` is constructed with the token address, an optional payment-token address (the zero
address means the native currency), the price expressed as tokens per whole payment unit, the start
and end timestamps, the hard and soft caps, and the minimum and maximum purchase amounts. Buyers
call `buyTokens` for native purchases or `buyTokensWithToken` for ERC-20 purchases. Once the sale
ends the owner calls `endPresale` and then `enableClaiming`, after which buyers call `claimTokens`.
The owner can withdraw raised funds once the soft cap is met and recover unsold tokens with
`withdrawUnsoldTokens`.

## Testing

The test-suite covers metadata, fee math, exemptions, the maximum-wallet limit, allowance-based
transfers, owner access control, the full presale lifecycle, whitelisting, caps, claiming, fund
withdrawal, unsold-token recovery, and ERC-20 payments with non-18-decimal tokens. Run it with
`npm test`; run `npm run test:coverage` for a coverage report.

## Deployment

See `docs/DEPLOYMENT.md` for a step-by-step guide, including testnet rehearsal, verification, and
the pre-mainnet checklist. In short, deploy the token first, then deploy the presale pointing at the
token, fund the presale with the token allocation, and only then open the sale.

## Security

This code has not been audited. Do not deploy to mainnet without an independent security review and
the completion of the credential-rotation checklist in `SECURITY.md`. Report vulnerabilities
privately as described in that document.

## License

Released under the MIT License. See `LICENSE`.
