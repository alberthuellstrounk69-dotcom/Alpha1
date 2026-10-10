# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Instead, send a private report to the
maintainers with a description of the issue, the affected contract or script, steps to reproduce,
and any proof-of-concept you can share. We aim to acknowledge reports within a few business days and
to coordinate a disclosure timeline with you.

## Scope

The in-scope components are the Solidity contracts under `contracts/` and the deployment scripts
under `scripts/`. Third-party dependencies (OpenZeppelin Contracts, Hardhat) are out of scope but we
will still act on advisories that affect this project.

## Important: exposed credentials in the original repository

The original `Alpha1` repository contained a number of live-looking secrets committed directly to
the source tree and preserved in git history. **Removing the files from the working tree does not
remove them from history, and any secret that was ever pushed must be treated as compromised.** The
following items were found and must be rotated or revoked regardless of whether they are still
valid:

- One or more EVM private keys (for example the key in the original `wallet-info.json`, which
  controlled address `0x9ce7Ad443F853e5abA5e6839866A0A8D42f3c945`).
- BIP-39-style seed phrases and private keys in the original `genesis_wallets.json`.
- RSA key material (public and private) in the original `albert_huellstrounk_wallet.json` and
  `user_2_wallet.json`.
- A GateHub recovery key in the original `gatehub_recovery_key.txt` and its copies.

Because these values were published, anyone can use them. Rotate every key, move any remaining
funds to freshly generated wallets, revoke the GateHub recovery key, and never reuse any of the
exposed material. After rotation, purge the secrets from git history (for example with
`git filter-repo` or the BFG Repo-Cleaner) and enable secret scanning with push protection so that
future commits are blocked before they leak.

## Hardening applied in this repository

This repository removes all hardcoded secrets, ignores `.env` and key material, reads every
sensitive value from the environment, and adds a secret-scanning job to CI. The Solidity contracts
use OpenZeppelin's audited `Ownable`, `ERC20`, `SafeERC20` and `ReentrancyGuard` primitives, validate
constructor and setter inputs, and follow checks-effects-interactions. None of this replaces an
independent audit.
