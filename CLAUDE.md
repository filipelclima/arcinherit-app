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
- `lib/formatTokenAmount.ts` — `formatTokenAmount(amount: bigint, decimals: number)`, formata saldo de token com separador de milhar e no mínimo 2 casas decimais (ver "Saldo do vault" abaixo)
- `lib/generateInheritancePdf.ts` — geração do PDF de instruções de herança (ver "PDF de instruções de herança" abaixo)
- `app/hooks/useEnsureArcNetwork.ts` — enforcement de rede (ver "Enforcement de rede" abaixo)
- `app/components/` — `CreateVault`, `Deposit`, `CheckIn`, `ClaimInheritance`, `VaultStatus`, `ConnectWallet`, `HowItWorks`, `WrongNetworkBanner`
- `app/components/ui.tsx` / `ui.css` — primitivos visuais compartilhados entre as telas funcionais (card, header, mensagens de status, skeletons, botão de ação) — ver "Hero animada + polish das telas funcionais" abaixo
- `app/components/icons.tsx` — ícones SVG inline estilo Lucide usados em todo o app (sem depender de `lucide-react`, não instalado)
- `app/components/Hero.tsx` / `HeroScene.tsx` / `HeroNetwork.tsx` / `hero.css` — Hero animada da landing (ver "Hero animada + polish das telas funcionais" abaixo)

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

## Hero animada + polish das telas funcionais (2026-09-23)

Branch `feature/hero-visual-upgrade` — upgrade visual em duas frentes: a Hero da landing ganhou uma peça animada única, e as telas funcionais (CreateVault, Deposit, CheckIn, ClaimInheritance, VaultStatus) receberam um polish de acabamento pra chegar no mesmo nível de refinamento, mais loading states e acessibilidade de teclado no Tooltip.

### Hero: peça animada + rede de fundo

- **`HeroScene.tsx`** — substitui o visual estático anterior. Funde os dois conceitos do produto num loop único (`--hero-cycle: 14s`, custom property CSS): vault (chip `LockIcon`/`LockOpenIcon` + anel) → conector SVG (linha pontilhada base + linha tracejada com gradiente fluindo + círculo "token" viajando) → herdeiro (chip `UsersIcon` que preenche com `ARC_GRADIENT` + pulso de anel), com uma barra de countdown (`.hero-bar-track`/`.hero-bar-fill`/`.hero-bar-cover`) e 3 legendas que se alternam por cross-fade. `role="img"` + `aria-label` descritivo (a peça é só decorativa/narrativa, a informação real já está no texto ao redor). Card com `data-testid="hero-scene-card"`.
- **`HeroNetwork.tsx`** — textura de fundo: rede de nós/arestas atrás de toda a Hero, com halos pulsando em alguns nós. Usa um PRNG seedado (`mulberry32`, seed fixa `20260921`) em vez de `Math.random()` — **necessário pra evitar mismatch de hidratação**: server e client precisam renderizar o mesmíssimo layout de nós/arestas, e `Math.random()` daria valores diferentes em cada render. `aria-hidden="true"` + `pointerEvents: 'none'` (puramente decorativo, nunca deve capturar clique nem ser lido por leitor de tela).
- **Posição final:** `<HeroScene />` fica **depois** do botão de CTA (Connect Wallet), não antes do badge — a página lê texto-primeiro (badge → título → pitch → CTA) e só então mostra a peça animada, em vez de abrir com ela.
- **Card translucido:** `.hero-scene-card` usa `COLOR_BG_TRANSLUCENT` (branco a 60% de opacidade) + `backdrop-filter: blur(14px)` (com prefixo `-webkit-` pra Safari) em vez de fundo opaco — decisão deliberada: um card sem nenhum fundo prejudicaria a legibilidade do texto contra a `HeroNetwork` por trás em densidades de nó mais altas; o blur translúcido mantém a peça "integrada" ao fundo sem perder contraste.
- **Stat cards** (`hero-card-grid`, 1 coluna <720px / 3 colunas ≥720px) e **feature cards** (teaser do How It Works, com kicker "HOW IT WORKS" acima) — camadas visuais adicionadas depois da peça animada, mesma lógica de grid responsivo.
- **Contrato de acessibilidade a movimento** (`hero.css`, testado em `hero.css.test.ts`): existe exatamente **um** bloco `@media (prefers-reduced-motion: no-preference)` no arquivo, e **toda** declaração `animation:` mora dentro dele — nada anima fora desse bloco. Cada `@keyframes` só pode animar `opacity`/`transform` (mais `stroke-dashoffset`/`animation-timing-function`, usados só na linha fluindo do conector SVG) — nunca propriedades que afetam layout (`width`/`height`/`margin`/`padding`/`top`/`left` etc.), pra manter a animação barata (compositor, não reflow) e pra garantir que o estado "sem preferência de movimento reduzido" nunca vaze pra quem pediu `prefers-reduced-motion: reduce` (nesse caso a cena renderiza num estado estático coerente: barra meio-drenada, só a legenda do meio visível, token/linha-fluindo/anéis todos com `opacity: 0`).

### Polish das telas funcionais

- **`ui.tsx`/`ui.css`** — primitivos compartilhados entre CreateVault/Deposit/CheckIn/ClaimInheritance/VaultStatus, extraídos pra eliminar duplicação de estilo entre as 5 telas: `Card`/`CardHeader`/`IconChip` (layout+cabeçalho padrão), `StatusMessage` (mensagens de sucesso/erro/aviso/info com cor+ícone+`role` consistentes — `role="alert"` pra erro, `role="status"` pros demais), `actionButton(active)` (botão de ação primário: `ARC_GRADIENT` quando ativo, `COLOR_BG_SUBTLE` + `boxShadow: inset 0 0 0 1px COLOR_BORDER` quando inativo — **de propósito um `boxShadow` inset e não uma `border` real**, pra manter os dois estados do botão com exatamente a mesma altura), e os primitivos de skeleton (`Skeleton`/`SkeletonChip`/`CardHeaderSkeleton`, ver abaixo).
  - **Micro-interações** (`ui.css`): `.ui-card` ganha elevação de `box-shadow` no hover (só dentro de `@media (hover: hover)`, pra não prender esse efeito em toque/mobile); `.ui-press` dá feedback de "pressionado" via `scale(0.98)` + `brightness(0.9)` em `:active:not(:disabled)`, e anel de foco visível (`outline: 2px solid var(--accent)`) em `:focus-visible`; inputs (`globals.css`) ganham `box-shadow` suave no foco (`0 0 0 3px rgba(0, 23, 103, 0.12)`) além da borda, com as duas transições (`border-color`/`box-shadow`) no mesmo `ease`.
  - **Transições de conteúdo:** `@keyframes ui-enter` (fade + `translateY(6px)`) aplicado via classe `ui-enter` em cards que trocam de conteúdo — troca de tab (My Vault/Claim) ou skeleton→conteúdo real — pra evitar o "pop" abrupto de conteúdo novo substituindo o antigo.
  - Mesmo contrato de acessibilidade a movimento do `hero.css` (um único bloco `no-preference`, keyframes só com `opacity`/`transform`) — reforçado por `ui.css.test.ts` com o mesmo helper (`cssTestUtils.ts`, compartilhado entre os dois arquivos de teste de CSS).

### Skeleton loading

- Todo ponto com leitura onchain (`useReadContract`) que antes ficava em branco ou sem nenhum estado de carregamento explícito agora tem skeleton dedicado, com a mesma forma do conteúdo final: `CreateVaultSkeleton`, `VaultStatusSkeleton` (também usado em `app/page.tsx`, ver abaixo), `CheckInSkeleton`, `DepositSkeleton`, `ClaimStatusSkeleton`. Montados com `Skeleton`/`SkeletonChip`/`CardHeaderSkeleton` de `ui.tsx`; animação de pulso (`ui-skeleton-pulse`, só `opacity`) em vez de shimmer — mais barata em dispositivos fracos e já compatível com o contrato de movimento acima sem precisar de exceção.
- **Bug de flash corrigido:** em `app/page.tsx`, a leitura de `getVault` no topo de `Home()` não expunha `isLoading` — enquanto o dado ainda não tinha chegado, `hasVault` (derivado só de `data`) caía no ramo "sem vault" e o formulário de **criar** vault piscava na tela pra qualquer dono que já tivesse um vault, até a leitura resolver. Corrigido destructurando `isLoading` do `useReadContract` e renderizando `<VaultStatusSkeleton />` enquanto `isLoadingVault` for `true`, antes de decidir entre CreateVault e VaultStatus. Mesmo cuidado replicado em `CreateVault.tsx`: o skeleton só é checado **depois** do `if (isSuccess)`, senão uma leitura obsoleta/em refetch cobriria a tela de sucesso recém-criada com um skeleton de carregamento.

### Acessibilidade do Tooltip

- **`Tooltip.tsx`** era hover-only. Agora: trigger (`InfoIcon`, `<span tabIndex={0}>` — não um `<button>` real, pra não herdar o reset global `button { padding: 10px 20px; ... }` numa chip circular de 16px) ganha `onFocus`/`onBlur` **além** dos handlers de mouse existentes (aditivo, comportamento de hover não mudou), `aria-describedby` apontando pro `id` do conteúdo do tooltip (`React.useId()`, sem colisão entre instâncias), conteúdo com `role="tooltip"`, `aria-label="More information"` no ícone, e `Escape` fecha o tooltip enquanto ele está focado (sem mover o foco). Classe `ui-focus-ring` (`ui.css`) dá o mesmo anel de foco visível de `.ui-press:focus-visible`, pra elementos interativos que não são botões de ação.
- **Auditoria de foco visível** (item bônus do mesmo pedido): confirmado/corrigido `.ui-press`/`.ui-focus-ring` em todos os botões de seleção (3/6/12/24 meses, safety window) e ação (Check in, Deposit, Claim), mais os utilitários: Disconnect e itens do seletor de wallet (`ConnectWallet.tsx`), toggle "How it works" (`app/page.tsx`), e botão "×" de dispensar do `RebrandBanner.tsx` — mesmo padrão em todos, pra não ter elemento clicável sem indicação visível de foco na navegação por teclado.



- **`wagmi` fixado em `2.19.0` exato, não `^2.12.0`.** Patches depois de `2.19.0` (`2.19.1+`) puxam `@wagmi/connectors@6.1.2+`, que depende de `@base-org/account@2.4.0` → `@coinbase/cdp-sdk` → módulos `@x402/*` que não existem e quebram o build (`Module not found`). Antes de atualizar `wagmi`, confirmar que a versão de `@wagmi/connectors` resolvida não trouxe `@base-org/account >= 2.3.0`.
- **Nunca declarar dependências soltas sem uso** (ex.: `porto` foi adicionado sem nenhum import no código e forçava `viem >= 2.37.0`, conflitando com o `viem` real do projeto e corrompendo a inferência de tipos do `writeContract` inteiro).
- **`writeContract` exige `account` e `chain` explícitos** nesta versão do wagmi. `account` vem de `useAccount().address`; **`chain` NUNCA deve vir de `useAccount().chain`** — usar sempre `ARC_TESTNET` (de `lib/contract.ts`). `useAccount().chain` só resolve para um valor quando o chainId atual da carteira bate com um chain configurado no `createConfig`; se o usuário estiver em qualquer outra rede (bem comum — a maioria das carteiras abre na Ethereum Mainnet por padrão), `chain` vem `undefined` mesmo com a carteira plenamente conectada (`address` presente, `isConnected: true`). Isso já causou um bug real: `!address || !chain` disparava "Connect your wallet first" pra usuários já conectados. **Nunca usar `chain` do `useAccount()` como parte de checagem de "está conectado" — para isso use só `address`/`isConnected`.**
- **Nunca usar `ignoreBuildErrors`/`ignoreDuringBuilds` no `next.config.js` nem `@ts-nocheck`** para passar o deploy — isso só esconde erros reais que voltam mais tarde. Corrigir a causa raiz.
- **Múltiplas carteiras instaladas (EIP-6963):** o wagmi já faz discovery automático de wallets via `mipd` (`multiInjectedProviderDiscovery: true` por padrão no `createConfig`), sem precisar de nenhuma config extra em `lib/wagmi.ts`. O que faltava era o `ConnectWallet.tsx` **usar** essa lista — antes ele pegava sempre `connectors[0]` cegamente (só a wallet genérica `injected()`, atrelada a `window.ethereum`, que pode ser qualquer extensão dependendo de qual "ganhou" o global). Agora ele prioriza os connectors nomeados (EIP-6963, um por wallet instalada — MetaMask, Rabby, Coinbase etc.) e mostra um seletor quando há mais de um.

## Saldo do vault + fallback de RPC (2026-09-27)

Problema real detectado ao testar um depósito de verdade: a transação foi confirmada ("Deposit successful"), mas a tela "Your Vault" não mostrava em nenhum lugar quanto estava guardado no vault — nenhum jeito de confirmar visualmente que o dinheiro chegou.

- **Fonte do saldo: `getBalances(owner)`, nunca `balanceOf` do próprio token no endereço do contrato.** O vault é um contrato único compartilhado por todos os usuários, com contabilidade interna por dono (`mapping(owner => mapping(token => amount))` no Solidity). O `balanceOf(CONTRACT_ADDRESS)` do token somaria os depósitos de **todo mundo**, não só os do dono conectado — só `getBalances`, que já existia no ABI mas não era chamado em lugar nenhum do frontend, devolve o valor certo por dono.
- **`VaultBalances`/`BalanceRow`** (dentro de `VaultStatus.tsx`) — nova seção "Vault balance" no card "Your Vault", logo abaixo da barra de progresso do check-in. Lista uma linha por token com saldo > 0; o contrato pode re-adicionar o mesmo token à lista (`v.tokens`) se o saldo dele tiver zerado e voltado a receber depósito, então a UI deduplica por endereço (case-insensitive) antes de renderizar. Sem nenhum depósito, mostra "No funds deposited yet." em vez de nada.
- **`lib/formatTokenAmount.ts`** — mesma lição da auditoria de decimais anterior: nunca hardcodar `6` pra USDC. Símbolo e decimais de cada token vêm de `symbol()`/`decimals()` lidos ao vivo (`ERC20_ABI`); se a leitura falhar, a linha mostra o endereço truncado do token e um "—" em vez de arriscar um valor errado por 10^n.
- **Skeleton em duas camadas:** o card inteiro tem skeleton (via `VaultStatusSkeleton`, já existente) enquanto `getVault` carrega; dentro dele, cada `BalanceRow` tem seu próprio mini-skeleton enquanto só o `symbol`/`decimals` daquele token específico ainda não resolveu — evita que o valor numérico apareça antes do símbolo (ou vice-versa) e pisque.
- **Atualização após depósito:** `Deposit.tsx` já fazia `refetchAllowance()` no `useEffect` de `isSuccess`; agora o mesmo efeito também chama `queryClient.invalidateQueries` filtrando por `functionName` (`getBalances` e `balanceOf`) na query key do `useReadContract` do wagmi (`['readContract', { functionName, ... }]`) — assim o saldo em `VaultStatus` (componente irmão, sem relação direta de props) e o saldo da wallet no próprio formulário de depósito atualizam sozinhos, sem precisar recarregar a página. Um `approve` bem-sucedido também dispara a invalidação (é inofensivo, os valores só não mudam nesse caso) — não valia a pena distinguir os dois casos.

### Fallback de RPC em `lib/wagmi.ts`

Motivo: um teste manual de depósito falhou com "Monthly capacity limit exceeded" vindo de um RPC da Alchemy — só que investigando, **não existe nenhuma referência à Alchemy neste repo** (nem hoje, nem no histórico do git). O app já usa `https://rpc.testnet.arc.network` (RPC público oficial, sem API key) tanto em `lib/contract.ts` quanto no `transport` do `createConfig`. A causa real é externa ao código: leituras (`useReadContract`) passam pelo `transport` do wagmi (esse RPC público), mas **escritas passam pelo provider da própria wallet conectada** (pitfall já documentado acima, "Nota de verificação: `useReadContract` não passa pela wallet injetada") — o RPC com limite estourado estava configurado na rede "Arc Testnet" salva na wallet do usuário, não neste projeto.

Mesmo não sendo a causa do problema, adicionamos resiliência básica e barata: `lib/wagmi.ts` trocou `http()` isolado por `fallback([http(RPC primário), http(RPC alternativo)])` (import `fallback` de `'wagmi'`, mesmo pacote que já exportava `http`). Segundo endpoint: `https://5042002.rpc.thirdweb.com` (RPC público da thirdweb por chain ID, sem API key) — validado manualmente via `eth_chainId` (retorna `0x4cef52` = 5042002, confirmando que é de fato a Arc Testnet) antes de usar. Se o RPC primário cair/atingir rate limit, o wagmi tenta o próximo automaticamente; não resolve um RPC malconfigurado na wallet do usuário, só protege contra o RPC público oficial ficar indisponível.

## Acabamento visual: cor mais viva, glass nos cards, scroll reveal (2026-09-27)

Objetivo: dar mais "peso profissional" à landing sem mudar layout/estrutura já aprovados. Três ajustes, todos em `lib/theme.ts`, `Hero.tsx`, `hero.css` e `ui.css`.

- **`ARC_GRADIENT_VIVID`** (`lib/theme.ts`) — variante mais saturada do gradiente oficial (`ARC_GRADIENT`), usada só no "Your heirs." do headline da Hero. Navy (`#001767`) já está em 100% de saturação HSL — não tem pra onde subir —, então só o stop wine mudou, de `#73112C` (~74% saturação, 26% luminosidade) pra `#8E0C2F` (~85%/30%), mesmo matiz (~343°), lendo como um vermelho-carmim mais rico em vez de um vinho meio opaco. **Não substitui** `ARC_GRADIENT`/`COLOR_ARC_WINE`, que continuam as cores oficiais usadas em todo o resto do app (CTAs, tabs, barra de progresso, badges) — usar a variante viva em todo lugar diluiria justamente o destaque que ela deveria criar.
- **`COLOR_ACCENT_TINT_VIVID`** (`lib/theme.ts`) — mesma lógica pro tint de fundo dos ícones: `rgba(0, 23, 103, 0.18)` (era 8%), usado só no chip de ícone dos feature cards da Hero. `COLOR_ACCENT_TINT` (8%) continua intocado em todo o resto (chips do `ui.tsx`/`CardHeader`, avatares de herdeiro no `VaultStatus`, `HowItWorks`, `HeroScene`) — são telas já revisadas, não faz sentido mudar o tom delas de propósito.
- **`.hero-card-glass`** (`hero.css`) — estende o efeito translúcido + `backdrop-filter: blur()` do `.hero-scene-card` pros stat cards ("Non-custodial" etc.) e feature cards ("Check in periodically" etc.), com um blur mais leve (8px vs 14px da cena): mais embaixo na página a `HeroNetwork` já sumiu quase toda por causa da máscara radial dela, então geralmente não tem textura real pra desfocar ali — o glass mais sutil serve só pra dar uma sensação de profundidade contra o fundo branco puro, mantendo consistência visual com o card da cena acima.
- **`useScrollReveal`** (`app/hooks/useScrollReveal.ts`) — hook genérico via `IntersectionObserver` nativo (sem lib nova): expõe `{ ref, revealed }`, `revealed` vira `true` (e nunca mais `false`) na primeira vez que o elemento cruza a viewport, e o observer desconecta em seguida — não repete ao rolar pra cima e descer de novo. Se `IntersectionObserver` não existir no ambiente, revela na hora (nunca esconde conteúdo pra sempre por falta de suporte).
  - Aplicado nos 3 feature cards da Hero e no card "Common questions" do FAQ (`app/page.tsx`) — **não** nos stat cards, que ficam acima da dobra junto com o resto da leitura inicial.
  - Classes `.scroll-reveal`/`.scroll-reveal.is-revealed` (`ui.css`) moram **dentro do único bloco** `@media (prefers-reduced-motion: no-preference)` que o arquivo já tinha (regra travada em teste: só pode haver um). Fora desse bloco `.scroll-reveal` não tem nenhuma regra — com movimento reduzido (ou antes do JS montar) o elemento é só um `<div>` normal, nunca fica escondido esperando uma animação que não vai rodar. A revelação em si usa `transition` (não `@keyframes`/`animation`), então nem entra na regra "toda `animation` mora dentro do bloco no-preference".

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
