# CI configuration

The GitHub Actions workflow definitions live here rather than in `.github/workflows/` because the
automation account that produced this branch does not have the `workflows` permission required to
create or modify files under `.github/workflows/`.

To enable them, a maintainer with the appropriate permissions should copy them into place:

```bash
mkdir -p .github/workflows
cp ci/ci.yml ci/security.yml .github/workflows/
```

- `ci.yml` runs Solidity linting, a formatting check, compilation, and the test-suite.
- `security.yml` runs gitleaks, `npm audit`, and Slither on a weekly schedule and on every pull
  request.

Once copied, the existing `tencent.yml` template (a stock Kubernetes deploy workflow unrelated to
this project) can be removed.
