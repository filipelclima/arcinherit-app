# ArcInherit — Frontend

dApp de herança onchain na Arc Network. Deixa o dono de uma vault designar herdeiros para seus tokens ERC-20; se ele parar de fazer check-in (prova de vida), os herdeiros podem reivindicar sua parte após o timelock + grace period expirarem.

- **Site:** https://arcinherit-app.vercel.app
- **Contrato:** [ArcInherit](https://github.com/filipelclima/ArcInherit) — deployado e verificado na Arc Testnet em `0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818`

## Stack

- Next.js 14 (App Router)
- wagmi + viem
- @tanstack/react-query
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Comandos

```bash
npm run dev      # dev server
npm run build    # build de produção
npm test         # roda a suíte de testes (vitest run)
npx tsc --noEmit # typecheck isolado
npx next lint    # lint isolado
```

Ver [CLAUDE.md](./CLAUDE.md) para convenções do projeto, armadilhas conhecidas e regras de trabalho.
