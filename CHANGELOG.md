# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added

- Reconstructed `VelocityToken` Solidity source matching the shipped `VelocityToken.json` ABI
  (solc 0.8.20, OpenZeppelin v5): ERC-20 with treasury, burn and liquidity fees, a maximum-wallet
  limit, and per-account fee exemptions.
- Reconstructed `VelocityPresale` Solidity source matching the shipped `VelocityPresale.json` ABI:
  whitelist-capable crowdsale with soft and hard caps, per-wallet purchase limits, ERC-20 or native
  payments, and a post-sale claim mechanism.
- Hardhat project configuration, deployment scripts, and a fee-less `MockERC20` for tests.
- Unit and integration test-suites for both contracts.
- CI workflow running lint, compile, tests, and a secret scan.
- Documentation: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `docs/DEPLOYMENT.md`.

### Security

- Removed all hardcoded secrets from the working tree and added `.gitignore` rules plus a CI secret
  scan. A credential-rotation checklist is documented in `SECURITY.md`; the secrets that were
  committed to the original repository must be rotated and purged from history.
