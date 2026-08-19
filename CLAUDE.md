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
- jsPDF `4.2.1` (fixado exato — geração de PDF 100% client-side, ver "PDF de instruções de herança" abaixo)
- TypeScript (`strict: false`, `target: ES2020`)

## Estrutura

- `lib/contract.ts` — endereço do contrato, ABI (via `parseAbi`), config da Arc Testnet
- `lib/wagmi.ts` — `createConfig` do wagmi + augmentação do `Register` (necessária para inferência de tipos correta em `useWriteContract`)
- `lib/theme.ts` — tokens do novo design system claro (ver seção "Redesign visual" abaixo)
- `lib/duration.ts` — `formatDuration(seconds: bigint)`, compartilhado entre `VaultStatus.tsx` (UI) e `lib/generateInheritancePdf.ts` (PDF), pra não duplicar a lógica de arredondamento
- `lib/generateInheritancePdf.ts` — geração do PDF de instruções de herança (ver "PDF de instruções de herança" abaixo)
- `app/hooks/useEnsureArcNetwork.ts` — enforcement de rede (ver "Enforcement de rede" abaixo)
- `app/components/` — `CreateVault`, `Deposit`, `CheckIn`, `ClaimInheritance`, `VaultStatus`, `ConnectWallet`, `HowItWorks`, `WrongNetworkBanner`

## Redesign visual (concluído, feito por partes)

Migração de tema escuro pra um design system claro, inspirado no estilo do [Aqueduct](https://aqueduct-tau.vercel.app) (badge pill, header limpo, CTA arredondado), com as cores oficiais da Arc como accent — gradiente `linear-gradient(135deg, #001767, #73112C)` (navy → wine). Tokens em `lib/theme.ts`:
- `ARC_GRADIENT` / `COLOR_ACCENT` (sólido, navy — pra bordas/foco/ícones onde gradiente não rola) / `COLOR_ACCENT_TINT` (navy a 8% de opacidade, fundo de chips de ícone)
- `COLOR_BG` / `COLOR_BG_SUBTLE` / `COLOR_BORDER` / `COLOR_TEXT_PRIMARY` / `COLOR_TEXT_SECONDARY` / `COLOR_TEXT_TERTIARY`
- `COLOR_SUCCESS` / `COLOR_WARNING` / `COLOR_DANGER` (+ suas variantes `_BG`/`_BORDER`) — cores semânticas, **de propósito fora** do gradiente de marca (sucesso/aviso/perigo têm significado próprio, não devem virar "azul-vinho" só porque é a cor de destaque)

- **Parte 1 (2026-08-14):** Header + Hero da landing.
- **Parte 2 (2026-08-14):** resto do app — FAQ, `HowItWorks` (emojis dos 4 passos + garantia trocados por SVGs inline estilo Lucide, dentro de chips circulares com `COLOR_ACCENT_TINT`; `lucide-react` não estava instalado no projeto, optei por SVG inline em vez de adicionar a dependência), formulário de criar vault, `VaultStatus` (barra de progresso do countdown), `Deposit`, `CheckIn`, `ClaimInheritance`, `Tooltip`/`InfoIcon`, Tabs (My Vault/Claim), footer (reestruturado em 2 colunas: logo+tagline à esquerda, links à direita). A variável global `--bg` em `globals.css` virou branca junto (não tinha mais nada dependendo dela ficar escura).
  - **Barra de progresso do countdown:** usa `ARC_GRADIENT` como cor padrão (< 70% do período), mas mantém `COLOR_WARNING` (70-99%) e `COLOR_DANGER` (100%+) nos estados de urgência — decisão deliberada pra não perder o sinal de "atenção, checar in logo" que uma barra sempre-gradiente esconderia.
  - **Botões de seleção/estado ativo** (timelock, safety window, Tabs) usam `ARC_GRADIENT` no estado ativo; inativo vira `COLOR_BG_SUBTLE` + borda `COLOR_BORDER`.
  - **"Estados vazios antes de conectar wallet"** (item do pedido da Parte 2) não tinha nenhuma tela concreta no código pra redesenhar — o app já só mostra o Hero (Parte 1) quando desconectado, nenhum componente (`CreateVault`, `Deposit`, etc.) chega a renderizar nesse estado. Tratado como já coberto pela Parte 1, sem inventar uma tela especulativa sem uso real.
- `ConnectWallet` tem uma prop opcional `size?: 'md' | 'lg'` (default `'md'`) — usada com `'lg'` só no CTA do Hero, pra ficar maior que a versão do header sem duplicar o componente.

## Enforcement de rede (2026-08-16)

Bug reportado por usuário externo: ao conectar a wallet estando em outra rede (ex.: Arbitrum), o app não forçava a troca pra Arc Testnet — a wallet ficava na rede errada mesmo conectada com sucesso.

- **`app/hooks/useEnsureArcNetwork.ts`** — dois hooks:
  - `useIsWrongNetwork()`: leitura pura (sem side effect), `isConnected && chainId !== ARC_TESTNET.id`. Segura pra chamar em quantos componentes forem necessários.
  - `useEnsureArcNetwork()`: dono do `useEffect` que efetivamente chama `switchChain({ chainId: ARC_TESTNET.id })`. Chamado **uma única vez**, em `app/page.tsx` (topo do `Home()`) — não dentro de cada componente individual, senão cada um dispararia seu próprio prompt de troca de rede simultaneamente.
- **`WrongNetworkBanner.tsx`** — banner persistente ("Wrong network — click to switch to Arc Testnet") renderizado logo abaixo do header quando `isWrongNetwork`; clicável pra re-tentar a troca manualmente (necessário quando o usuário rejeita o prompt automático). Some sozinho assim que a rede correta é detectada.
- `CheckIn`, `CreateVault`, `Deposit`, `ClaimInheritance` chamam `useIsWrongNetwork()` e adicionam ao `disabled` do botão de escrita principal — sem isso, o botão ficaria clicável (e falharia) enquanto a troca de rede não completa ou é rejeitada.
- Nenhum fallback manual de `wallet_addEthereumChain` foi implementado — o connector `injected()` do wagmi já faz esse fallback sozinho quando `switchChain` recebe erro `4902`, usando os campos de `ARC_TESTNET` (`lib/contract.ts`) que já tinham `rpcUrls`/`blockExplorers`/`nativeCurrency` corretos. Reimplementar isso na mão seria duplicar lógica que o wagmi já cobre.

### Armadilha nova: `useChainId()` não serve pra detectar rede errada neste projeto

`useChainId()` **parece** o hook certo pra isso, mas é inútil aqui: o `createConfig` do wagmi tem `syncConnectedChain: true` por padrão, que só copia o chainId da conexão pro estado global (`state.chainId`, o que `useChainId()` lê) **se esse chainId também estiver na lista `chains` do `createConfig`**. Como `lib/wagmi.ts` só configura `chains: [ARC_TESTNET]`, qualquer rede "errada" nunca é considerada configurada — `useChainId()` fica **travado eternamente** em `ARC_TESTNET.id`, mesmo com a wallet ativa em Arbitrum. Diferente do pitfall já documentado de `useAccount().chain` (que fica `undefined`), aqui o hook retorna um valor *plausível e errado*, o que é mais perigoso de passar despercebido.

**A fonte confiável é `useAccount().chainId`** (o número puro, não o objeto `chain`) — ele é atualizado sem nenhum gate de "está configurado", via qualquer evento `connect`/`chainChanged` do connector (ver `@wagmi/core`'s `getAccount()`/`change()` internals). É o que `useIsWrongNetwork()` usa.

Nos testes, isso significa mockar `chainId` dentro do retorno de `useAccount()`, nunca mockar `useChainId()` separadamente pra esse propósito — um mock de `useChainId()` sempre "funciona" no teste (porque o mock não reproduz o gate real do wagmi), escondendo esse bug exato. Foi assim que a primeira versão desta feature passou nos testes unitários mas falhou ao verificar de verdade no browser.

## PDF de instruções de herança (2026-08-17)

Problema de UX identificado por testadores: herdeiros não têm como descobrir que existe um vault esperando por eles nem como reivindicá-lo. Solução: o dono do vault gera, com antecedência, um PDF com instruções (mesmo princípio de um testamento/backup de seed phrase), pra guardar ou entregar à família.

- **`lib/generateInheritancePdf.ts`** — monta o PDF inteiramente no navegador via jsPDF (`unit: 'pt', format: 'letter'`), preenchido com os dados reais já carregados na tela (endereço do dono, heirs com wallet+percentual, `timelockDuration`/`gracePeriod` em segundos vindos direto do contrato). **Nunca passa por servidor próprio** — mantém a filosofia non-custodial do projeto. Nome do arquivo fixo em `INHERITANCE_PDF_FILENAME` (`heirloom-inheritance-instructions.pdf`).
  - `jsPDF` é importado via **`await import('jspdf')` dinâmico dentro da função**, não `import` estático no topo do arquivo — a lib pesa ~130KB e só é usada por quem clica no botão (dono do vault, uma ação pontual), então carregar estático infla o bundle inicial de todo mundo à toa. Confirmado via `npm run build`: bundle da rota `/` caiu de 180KB → 52KB depois da troca pro import dinâmico.
  - Logo (`/heirloom-icon.png`) é embutido via `fetch` + `FileReader.readAsDataURL` + `doc.addImage`, com fallback silencioso (`try/catch` retornando `null`) se falhar — o logo é só um nice-to-have, o documento tem que sair completo mesmo sem ele (ex.: se o `fetch` falhar em algum ambiente sem essa rota disponível).
  - Texto do documento (todas as 5 seções) é fixo, copiado literalmente do texto fornecido no pedido — só os placeholders (`[endereço do dono]`, `[percentual]`, `[período]`, `[dias]`) são substituídos por dados reais. **Não reescrever esse texto livremente** — é um documento legal/informativo pra terceiros (herdeiros), não copy de produto.
- **Botão** ("Download instructions for your heirs") fica em `VaultStatus.tsx`, logo abaixo do card "Your heirs" — só renderiza pro dono já conectado com vault ativo (mesma condição que já gate toda a tela). Estilo secundário (`COLOR_BG` + borda, não `ARC_GRADIENT`) de propósito: não é uma transação onchain como os outros CTAs da tela, é uma ação local/utilitária.
- **`Check-in period`** no PDF usa `formatDuration()` (mesmo texto arredondado da UI, ex. "1 year"); **`Safety window`** no PDF usa dias brutos (`Math.round(Number(gracePeriod) / 86400)`) — são dois formatos diferentes de propósito, seguindo exatamente o texto pedido ("every [período]" vs "[dias] days").

### Nota de verificação: `useReadContract` não passa pela wallet injetada

Ao testar esse fix no browser com uma wallet EIP-1193 falsa (técnica já usada neste projeto pra simular conexão), descobri na prática que **leituras (`useReadContract`) não passam pelo `eth_call` da wallet conectada** — elas vão direto pro `transport` configurado em `createConfig` (`lib/wagmi.ts`, `http()` apontando pra `rpc.testnet.arc.network`). Só escritas (`useWriteContract`) passam pelo provider injetado. Pra simular dados de vault reais no browser (não só em testes mockados), é preciso interceptar `window.fetch` pras chamadas JSON-RPC pro RPC HTTP, não só mockar `provider.request` do wallet fake. Isso não é um bug do projeto, só uma pegadinha de metodologia de teste manual — documentando aqui pra não redescobrir isso do zero da próxima vez.

## Auditoria: interface nativa (18 dec.) vs ERC-20 (6 dec.) do USDC na Arc (2026-08-19)

Na Arc, USDC é o próprio gas nativo do protocolo e existe em duas interfaces do MESMO saldo (não dois tokens): a **nativa** (18 decimais, `msg.value`/`address.balance`, só pra gas) e a **ERC-20** (6 decimais, endereço `USDC_ADDRESS` = `0x3600...0000`, usada pra toda lógica de app). A recomendação da Circle é usar sempre a interface ERC-20 pra depósitos/saldos/percentuais. Misturar as duas sem converter causa erro de 10^12.

Auditoria feita: contrato (`ArcInherit.sol`) usa só `IERC20` (`transferFrom`/`transfer`/`balanceOf`), nenhum `payable`/`msg.value`/`address.balance`; o cálculo do share do herdeiro (`(total * pct) / 100`) é agnóstico a decimais. No frontend, `Deposit.tsx` é o único lugar com `parseUnits`/`formatUnits`, e lê `decimals()` dinamicamente da própria interface ERC-20 do token (nunca hardcoda) — `CreateVault.tsx`/`VaultStatus.tsx`/`ClaimInheritance.tsx` não tocam em valor de token nenhum (só percentuais adimensionais, datas, durações). Nenhuma ocorrência de `useBalance`/`getBalance`/`address.balance`/`formatEther`/`parseEther` em `app/`.

**Achado corrigido:** `ARC_TESTNET.nativeCurrency.decimals` em `lib/contract.ts` estava `6` (valor da interface ERC-20), mas esse campo descreve a interface **nativa** — deveria ser `18`. Não afetava depósito/saldo/claim (nada disso lê a interface nativa), mas esse objeto é passado verbatim pro `wallet_addEthereumChain` quando uma wallet nova adiciona a Arc Testnet automaticamente (fallback do wagmi usado por `useEnsureArcNetwork.ts`) — então toda wallet que registrasse a rede por esse app ficaria com o saldo de **gas nativo** exibido errado por 10^12. Corrigido pra `18`; teste de regressão em `lib/contract.test.ts` trava esse valor.

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
