# Base Counter

Base Counter is a small on-chain counter experience for Base with wallet connection, Farcaster Mini App support, leaderboard UI, and sharing-oriented product flow.

This README replaces the generic Next.js starter text with project-specific setup and architecture notes.

## Features

- Connect a wallet from web or Farcaster Mini App context.
- Read and submit counter interactions on Base-oriented contracts.
- Display leaderboard-style user activity.
- Share activity through Farcaster-friendly surfaces.
- Use `cloudflared` tunnel script for mobile/mini app testing.

| Layer | Tools |
| --- | --- |
| App | Next.js, React, TypeScript, React Icons, Lucide React |
| Farcaster | Farcaster Mini App SDK, Mini App Wagmi Connector |
| Web3 | Wagmi, Viem, Ethers, Ox |
| Data/UI | React Query, React Hot Toast, local app state |

## Project Structure

- `src/` - App Router pages, components, wallet hooks, and contract interaction logic.
- `public/` - icons and app metadata.
- `apps.json` - mini app/discovery metadata.
- `next.config.ts` - Next.js configuration.

## Development

```bash
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js dev server. |
| `npm run build` | Build for production. |
| `npm start` | Run the production server. |
| `npm run lint` | Run lint checks. |
| `npm run tunnel` | Expose local development through a tunnel for Farcaster/mobile testing. |

## Status

- Repository: https://github.com/yusufky63/base-counter
- Live app: https://counter-base.vercel.app
