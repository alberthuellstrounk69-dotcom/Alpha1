# Crypto-1 integration

This branch combines the Alpha1 repository with the private `Crypto-1` repository under `integrations/crypto-1/`.

## Provenance

- Alpha1 source: `alberthuellstrounk69-dotcom/Alpha1`
- Integrated source: `alberthuellstrounk69-dotcom/Crypto-1`
- Integration strategy: preserve Crypto-1 files under a namespace; do not overwrite Alpha1 files.
- Intended use: repository consolidation and read-only inspection until a maintainer completes dependency, licensing, and security review.

## Security boundary

Crypto-1 documents itself as pre-release and not professionally audited. This branch does not authorize deployment, wallet signing, token approvals, asset transfers, or transaction broadcasting. Review deployment artifacts and credentials separately before using any operational workflow.
