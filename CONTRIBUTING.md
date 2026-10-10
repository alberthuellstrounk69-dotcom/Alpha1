# Contributing

Thanks for your interest in improving Velocity Token. This document describes how to propose
changes and the standards we expect them to meet.

## Getting set up

Fork the repository, clone your fork, and install dependencies with `npm install`. Copy
`.env.example` to `.env` if you need to reach a public network; never commit the `.env` file.
Compile with `npm run compile` and run the tests with `npm test` before opening a pull request.

## Workflow

Create a topic branch off `main`, make your changes, and keep commits focused and well described.
Open a pull request against `main` and make sure the CI checks pass. A pull request should explain
what changed, why, and how it was tested.

## Standards

Solidity code targets version `0.8.20` and must compile with the optimizer enabled. Follow the
existing style, run `npm run lint` and `npm run format:check`, and add or update tests for any
behavioral change. Keep functions small and use OpenZeppelin primitives rather than reimplementing
well-understood building blocks. Never introduce a hardcoded secret, private key, or seed phrase;
all configuration must come from the environment.

## Reporting bugs

Use the issue tracker for non-security bugs. For security issues follow the process in `SECURITY.md`
instead.
