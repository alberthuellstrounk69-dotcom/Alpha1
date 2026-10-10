# Architecture

This document describes the two on-chain contracts, their trust model, and the key design
decisions behind them.

## Overview

The system consists of two contracts that are deployed separately and wired together by address.
`VelocityToken` is a self-contained ERC-20 with an internal fee engine. `VelocityPresale` is a
crowdsale that holds an allocation of the token and distributes it to buyers after the sale ends.
There is no proxy and no upgradeability; both contracts are immutable once deployed, and the only
mutable state is the owner-controlled configuration.

## VelocityToken

The token inherits `ERC20` and `Ownable` from OpenZeppelin v5. The constructor records a treasury
wallet, mints a fixed initial supply of 10,000,000 tokens to the deployer, installs a default fee
schedule, and sets a default maximum wallet of one percent of the supply. The owner, the treasury
and the contract itself are fee-exempt by default.

Fee logic lives in the `_update` hook, which OpenZeppelin's `transfer`, `transferFrom`, `_mint` and
`_burn` all funnel through. Mint and burn operations bypass fees entirely. For ordinary transfers
between non-exempt accounts the hook computes a total fee in basis points, checks the recipient
against the maximum-wallet limit, then moves the treasury and liquidity portions with internal
transfers and burns the burn portion. The recipient receives the remainder. Because the hook is the
single choke point, every path that moves tokens is covered.

The fee schedule is capped at 10% in total, and the maximum-wallet setter rejects values below
0.1% of the supply unless the caller passes zero to disable the limit. These bounds prevent the
owner from configuring a fee or limit that would effectively freeze user funds.

## VelocityPresale

The presale inherits `Ownable` and `ReentrancyGuard`. It stores the token and payment-token
addresses, the price, the sale window, the caps and the purchase limits, plus per-buyer purchase
records and an ordered list of unique buyers. A zero payment-token address means the native
currency; otherwise the configured ERC-20 is used.

Purchases flow through a shared internal routine that validates that the sale is open, that the
contribution is within the per-buyer minimum and maximum, that the hard cap would not be exceeded,
and, when enforced, that the buyer is whitelisted. The number of tokens is computed from the
payment amount, the price, and the decimals of both the token and the payment asset, so that
non-18-decimal payment tokens are handled correctly. The routine updates the buyer's record and the
aggregate counters and emits an event.

Claiming is deliberately separated from buying. The owner ends the sale with `endPresale` and then
opens claiming with `enableClaiming`, which can only be called once the sale window has closed.
Buyers then pull their allocation with `claimTokens`, which marks the record as claimed before
transferring to prevent reentrancy. Funds can only be withdrawn after the sale has ended and the
soft cap has been met, and unsold tokens can be recovered after the sale ends.

## Trust model

Both contracts are owned by the deployer. The owner can adjust the token's fees and wallet limit,
grant fee exemptions, manage the presale whitelist, end the sale, enable claiming, and withdraw
funds and unsold tokens. The owner cannot mint new tokens, cannot seize user balances, and cannot
prevent buyers from claiming once claiming is enabled. Fee and wallet-limit changes are bounded as
described above. Users should verify that ownership is transferred to a multisig or renounced
before relying on the contracts in production.

## Dependencies

The contracts depend on OpenZeppelin Contracts v5 for `ERC20`, `Ownable`, `IERC20`,
`IERC20Metadata`, `SafeERC20` and `ReentrancyGuard`. The compiler is pinned to Solidity `0.8.20`
with the optimizer enabled at 200 runs.
