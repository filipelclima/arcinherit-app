# Heirloom — Frontend

dApp de herança onchain na Arc Network. Deixa o dono de uma vault designar herdeiros para seus tokens ERC-20; se ele parar de fazer check-in (prova de vida), os herdeiros podem reivindicar sua parte após o timelock + grace period expirarem.

> **Rebrand (2026-08-14):** o produto se chamava "ArcInherit" e passou a se chamar **"Heirloom"** — só o nome/marca exibido na UI mudou. O repo (`arcinherit-app`), a URL de deploy e o contrato onchain (ainda chamado `ArcInherit` no GitHub/Blockscout) **não** foram renomeados, de propósito. Não estranhar essa mistura de nomes entre o frontend (Heirloom) e o contrato (ArcInherit) — é intencional por enquanto.

- **Deploy:** https://arcinherit-app.vercel.app (Vercel, projeto `arcinherit-app` — o projeto duplicado `arcinherit-app-vpip` foi deletado)
- **GitHub:** https://github.com/filipelclima/arcinherit-app
- **Contrato:** [ArcInherit](https://github.com/filipelclima/ArcInherit) — deployado e verificado na Arc Testnet em `0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818`

## Stack

- Next.js 14 (App Router)
- wagmi `2.19.0` (fixado exato — ver "Armadilhas conhecidas" abaixo)
- viem `^2.17.0`
- @tanstack/react-query `^5.59.0`
- TypeScript (`strict: false`, `target: ES2020`)

## Estrutura

- `lib/contract.ts` — endereço do contrato, ABI (via `parseAbi`), config da Arc Testnet
- `lib/wagmi.ts` — `createConfig` do wagmi + augmentação do `Register` (necessária para inferência de tipos correta em `useWriteContract`)
- `lib/theme.ts` — tokens do novo design system claro (ver seção "Redesign visual" abaixo)
- `app/components/` — `CreateVault`, `Deposit`, `CheckIn`, `ClaimInheritance`, `VaultStatus`, `ConnectWallet`, `HowItWorks`

## Redesign visual (em andamento, por partes)

Migração de tema escuro pra um design system claro, inspirado no estilo do [Aqueduct](https://aqueduct-tau.vercel.app) (badge pill, header limpo, CTA arredondado), com as cores oficiais da Arc como accent — gradiente `linear-gradient(135deg, #001767, #73112C)` (navy → wine), definido em `lib/theme.ts` (`ARC_GRADIENT`, `COLOR_BG`, `COLOR_BG_SUBTLE`, `COLOR_TEXT_PRIMARY`, `COLOR_TEXT_SECONDARY`, `COLOR_TEXT_TERTIARY`, `COLOR_BORDER`).

- **Parte 1 (feita, 2026-08-14):** Header + Hero da landing. Ambos ganharam fundo branco (`COLOR_BG`) explícito próprio — **não** mudei a variável global `--bg`/`var(--bg)` em `globals.css`, que continua escura, porque o resto do app (FAQ, `HowItWorks`, form de criar vault, footer) ainda usa texto claro (`#f1f5f9` etc.) pensado pra um fundo escuro; mudar o `--bg` global agora deixaria esse texto ilegível (branco sobre branco) antes da Parte 2 redesenhar essas seções também. Por isso o Hero virou uma seção full-width própria (fora do wrapper `maxWidth:700` original) posicionada entre o Header e o resto do conteúdo, que continua escuro sem nenhuma mudança.
- **Pendente (Parte 2):** cards de FAQ, formulário de criação de vault, estados vazios, footer, `HowItWorks` — aí sim faz sentido migrar o `--bg` global e os textos dessas seções junto.
- `ConnectWallet` ganhou uma prop opcional `size?: 'md' | 'lg'` (default `'md'`) — usada com `'lg'` só no CTA do Hero, pra ficar maior que a versão do header sem duplicar o componente.

## Armadilhas conhecidas (não repetir)

- **`wagmi` fixado em `2.19.0` exato, não `^2.12.0`.** Patches depois de `2.19.0` (`2.19.1+`) puxam `@wagmi/connectors@6.1.2+`, que depende de `@base-org/account@2.4.0` → `@coinbase/cdp-sdk` → módulos `@x402/*` que não existem e quebram o build (`Module not found`). Antes de atualizar `wagmi`, confirmar que a versão de `@wagmi/connectors` resolvida não trouxe `@base-org/account >= 2.3.0`.
- **Nunca declarar dependências soltas sem uso** (ex.: `porto` foi adicionado sem nenhum import no código e forçava `viem >= 2.37.0`, conflitando com o `viem` real do projeto e corrompendo a inferência de tipos do `writeContract` inteiro).
- **`writeContract` exige `account` e `chain` explícitos** nesta versão do wagmi. `account` vem de `useAccount().address`; **`chain` NUNCA deve vir de `useAccount().chain`** — usar sempre `ARC_TESTNET` (de `lib/contract.ts`). `useAccount().chain` só resolve para um valor quando o chainId atual da carteira bate com um chain configurado no `createConfig`; se o usuário estiver em qualquer outra rede (bem comum — a maioria das carteiras abre na Ethereum Mainnet por padrão), `chain` vem `undefined` mesmo com a carteira plenamente conectada (`address` presente, `isConnected: true`). Isso já causou um bug real: `!address || !chain` disparava "Connect your wallet first" pra usuários já conectados. **Nunca usar `chain` do `useAccount()` como parte de checagem de "está conectado" — para isso use só `address`/`isConnected`.**
- **Nunca usar `ignoreBuildErrors`/`ignoreDuringBuilds` no `next.config.js` nem `@ts-nocheck`** para passar o deploy — isso só esconde erros reais que voltam mais tarde. Corrigir a causa raiz.
- **Múltiplas carteiras instaladas (EIP-6963):** o wagmi já faz discovery automático de wallets via `mipd` (`multiInjectedProviderDiscovery: true` por padrão no `createConfig`), sem precisar de nenhuma config extra em `lib/wagmi.ts`. O que faltava era o `ConnectWallet.tsx` **usar** essa lista — antes ele pegava sempre `connectors[0]` cegamente (só a wallet genérica `injected()`, atrelada a `window.ethereum`, que pode ser qualquer extensão dependendo de qual "ganhou" o global). Agora ele prioriza os connectors nomeados (EIP-6963, um por wallet instalada — MetaMask, Rabby, Coinbase etc.) e mostra um seletor quando há mais de um.

## Regras de trabalho

1. **Sempre rodar os testes unitários existentes antes de fazer commit.**
2. **Sempre escrever testes novos para features novas ou correções de bugs.**
3. **Sempre atualizar este CLAUDE.md após mudanças significativas** (nova armadilha descoberta, mudança de stack, nova convenção).
4. **Manter dependências fixadas em versões exatas** (sem `^` ou `~`) ao adicionar ou atualizar pacotes.
5. **Nunca usar `ignoreBuildErrors` ou `@ts-nocheck` como atalho** — sempre corrigir a causa raiz do erro de tipo.

## Testes

- Vitest `4.1.10` + Testing Library (`@testing-library/react`, `jest-dom`), ambiente `jsdom`.
- Config: `vitest.config.mts` (extensão `.mts` de propósito — evita o warning do config loader nativo do Vite quando o `package.json` não é `"type": "module"`) + `vitest.setup.ts` (matchers do jest-dom + `cleanup()` explícito no `afterEach`, necessário porque o auto-cleanup do Testing Library depende de `globals: true`, que não está habilitado aqui).
- Testes ficam colocados junto do componente (`Componente.test.tsx` ao lado de `Componente.tsx`).
- Hooks do wagmi (`useAccount`, `useConnect`, `useDisconnect` etc.) devem ser mockados com `vi.mock('wagmi', () => ({...}))` — ver `ConnectWallet.test.tsx` como exemplo.

## Comandos

```bash
npm run dev      # dev server
npm run build    # build de produção — deve compilar sem erros/warnings de TS ou ESLint
npm test         # roda a suíte de testes (vitest run)
npx tsc --noEmit # typecheck isolado
npx next lint    # lint isolado
```
