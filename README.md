# Base Counter

Base Counter is a compact on-chain counter experience for Base with wallet connection, leaderboard UI, and Farcaster sharing.

## Snapshot

- **Category:** On-chain counter for Base
- **Status:** Public repository
- **Live:** https://counter-base.vercel.app
- **Repository:** https://github.com/yusufky63/base-counter
- **Portfolio:** https://codexsha.dev

## Product Scope

Base Counter is documented here as a product repository, not just a code dump. The goal of this README is to make the product purpose, runtime surface, and development path clear for future review and maintenance.

## Core Capabilities

- Base-only counter interaction
- Wallet connection and network switching
- Leaderboard presentation
- Farcaster sharing flow
- Mini app style distribution

## Existing README Coverage Preserved

This refresh keeps the important project-specific areas from the previous documentation:

- Default Next.js starter README was present and did not describe the actual product

## Tech Stack

- Next.js
- Farcaster SDK
- Wagmi
- Viem
- Ethers
- React Query
- Ox

## Repository Map

| Path | Purpose |
| --- | --- |
| src/app/ | Routes and main app |
| src/components/ | Wallet and counter UI |
| src/lib/ | Contract/Farcaster helpers |
| public/ | Mini app assets |

## Local Development

| Command | Purpose |
| --- | --- |
| npm run dev | Run local dev server |
| npm run build | Build production app |
| npm run start | Start production server |
| npm run lint | Run lint checks |
| npm run tunnel | Run tunnel flow when testing mini app contexts |

## Environment Notes

Use local environment files for secrets and deployment-specific values. Do not commit real keys.

- Contract address and ABI configuration
- Wallet connector settings
- Farcaster metadata values
- Optional tunnel URL for mobile testing

## Operational Notes

- Keep this README aligned with the live product and portfolio copy.
- Prefer small, documented changes over large undocumented rewrites.
- This replaces the generic starter README with project-specific documentation.

## Maintainer

Built by Yusuf / Codexsha.

- GitHub: https://github.com/yusufky63
- X: https://x.com/codexsha
- Telegram: https://t.me/codexsha
