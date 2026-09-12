# Discord Bot — Multifuncional, com memória de longo prazo e IA em camadas

Bot de Discord completo e modular: moderação, tickets, economia, sistema de
XP, boas-vindas/despedida, sugestões, logs detalhados, memória de longo
prazo criptografada, e um sistema de conversação em camadas (Ollama → Groq →
motor algorítmico) que decide quando responder com base em um **motor de
relevância configurável**.

O projeto roda tanto em modo **ultra-leve** (motor algorítmico, sem IA
generativa, ideal para hospedagens com pouca RAM como a
[Discloud](https://discloud.com), 100MB) quanto em modo **completo** (Ollama
local como IA principal + Groq como fallback pago muito barato + algoritmo
como último degrau), pensado para rodar 24/7 num servidor próprio (ex:
Oracle Cloud).

## Arquitetura de IA em camadas

```
Discord → contextManager → memoryManager → promptBuilder → provider ativo
                                ↓                                ↓
                          banco criptografado         Ollama → Groq → algoritmo
                                                     (cada um com circuit breaker,
                                                      timeout e fallback automático)
```

Controlado por `AI_PROVIDER` no `.env`:

- **`algorithm`** (padrão): motor de casamento de padrões, sem IA
  generativa, sem chamadas de rede. Ideal para hospedagens com pouca RAM.
- **`groq`**: usa a API do Groq (barata, com free tier) como principal, com
  o motor algorítmico como fallback. Não precisa de servidor Ollama.
- **`ollama`**: usa um modelo local via Ollama como principal, com Groq como
  fallback automático se o Ollama falhar, e o algoritmo como último degrau.
  Requer uma máquina/VPS com vários GB de RAM livres (não funciona no plano
  de 100MB da Discloud).

Em qualquer modo, mensagens triviais (risadinhas, "sim", "ok", emojis
isolados) nunca chamam um provider de rede — vão direto pro algoritmo, para
economizar tokens mesmo em modo `ollama`/`groq`.

O único token *obrigatório* continua sendo o **Discord Bot Token**.

## Memória de longo prazo ("fatos memoráveis")

Duas camadas de memória persistente, deliberadamente separadas:

1. **Memória do sistema/administrativa** — fatos que um administrador
   decide guardar explicitamente com `/ai-config lembrar`. Alta confiança,
   não expira sozinha.
2. **Memória comum dos usuários** — observada automaticamente a partir de
   padrões conservadores em mensagens (ex: "meu jogo favorito é...", "eu
   moro em..."). Cada fato tem usuário, conteúdo, categoria, confiança,
   timestamps e pode expirar automaticamente. **Nunca transforma qualquer
   mensagem em memória** — só quando bate um padrão claro.

Os fatos relevantes para a pergunta atual (por casamento de palavras-chave)
são incluídos no prompt como **dados de referência**, nunca como instruções
— ver seção de segurança abaixo. Administradores podem consultar e apagar
os fatos observados sobre qualquer usuário com `/ai-config fatos` e
`/ai-config esquecer-fatos`.

## Segurança

- **Criptografia em repouso**: o arquivo de dados (`data/bot.json`) e todos
  os backups são criptografados com **AES-256-GCM** quando
  `MEMORY_ENCRYPTION_KEY` está definida no `.env` (gere uma com
  `npm run generate-key`). A chave nunca fica no código/Git. Sem a chave, o
  bot funciona normalmente mas grava em texto puro (ok para
  desenvolvimento local).
- **Criador do bot**: `CREATOR_ID` no `.env` define o Discord ID do
  criador/administrador principal. Essa autorização é uma regra interna
  fixa — nunca depende de banco de dados, de uma mensagem do Discord, de
  uma memória recuperada, ou de uma resposta de qualquer provider de IA.
  O criador tem autoridade total sobre o bot independente de cargos no
  servidor.
- **Prompt injection**: o prompt enviado à IA separa claramente instruções
  do sistema (definidas só pelo administrador) de dados recuperados
  (histórico da conversa, memórias). O modelo é instruído a tratar tudo
  dentro de "MEMÓRIAS"/"HISTÓRICO" como dado, nunca como comando — e a IA
  nunca decide sozinha uma permissão; toda ação administrativa é validada
  pelo código antes de executar.
- **Log de auditoria** (`logs/audit.log`): mudanças de configuração,
  memória administrativa e backups ficam registrados com quem fez, o quê e
  quando. Segredos nunca são gravados no log.
- **Circuit breaker + teto de gasto**: se o Ollama falhar repetidamente, o
  bot para de tentar por um tempo e usa o próximo fallback automaticamente.
  O Groq tem um teto de gasto mensal configurável (padrão R$0,50) —
  atingido o teto, novas chamadas são bloqueadas até o próximo mês e o bot
  cai para o motor algorítmico, sem nunca parar de responder.

## Funcionalidades

- **Motor de conversação em camadas** (Ollama → Groq → algoritmo) com
  contexto curto por canal (memória temporária) e memória de longo prazo
  (acima).
- **Moderação completa**: warn, timeout, kick, ban, unban, clear, slowmode,
  lock/unlock, anti-spam, anti-flood, anti-link, anti-raid, logs de moderação.
- **Tickets**: painel com botões, canal privado automático, transcript e log.
- **Sugestões**: `/suggest` com votação por botões.
- **XP e níveis**: `/rank`, `/xp-leaderboard`, com cooldown anti-spam.
- **Economia**: `/balance`, `/daily`, `/work`, `/pay`, `/leaderboard`, `/shop`.
- **Boas-vindas / despedida** configuráveis por servidor.
- **Logs detalhados**: mensagens apagadas/editadas, entradas/saídas, ações
  de moderação — em embeds organizados num canal configurável.
- **Backup automático verificado**: `/backup` cria e testa a restauração do
  backup na hora, mantendo várias versões.
- **Configuração por servidor**: cada guild tem seu próprio arquivo em
  `data/guilds/<guild_id>.json`, editável via `/config`.
- **Comandos de diagnóstico**: `/diagnostic` e `/test` verificam todos os
  módulos (incluindo estado dos circuit breakers e gasto com Groq).

## Estrutura do projeto

```
discord-bot/
├── index.js               # ponto de entrada na raiz (exigido por hosts como a Discloud)
├── discloud.config         # configuração de deploy para a Discloud
├── .discloudignore
├── scripts/
│   ├── deploy.sh             # deploy com validação e rollback automático (item 24)
│   └── discord-bot.service    # exemplo de unit systemd, com sandboxing
├── src/
│   ├── commands/           # admin, moderation, utility, fun, economy, ai, system
│   ├── events/             # ready, messageCreate, interactionCreate, etc.
│   ├── handlers/           # carregamento de comandos/eventos, register/clear commands
│   ├── services/           # lembretes, monitor de saúde
│   ├── database/           # armazenamento em JSON criptografado
│   │   └── longTermMemory.js  # fatos memoráveis por usuário
│   ├── ai/
│   │   ├── aiManager.js        # cadeia de fallback, cooldowns, mensagens triviais
│   │   ├── circuitBreaker.js    # item 18
│   │   ├── spendGuard.js         # teto de gasto mensal (item 22)
│   │   ├── memoryManager.js       # memória admin + fatos memoráveis
│   │   ├── promptBuilder.js        # separação instrução/dado (item 11)
│   │   └── providers/
│   │       ├── algorithm.js          # padrão, sem rede
│   │       ├── ollama.js              # opcional
│   │       ├── groq.js                 # opcional
│   │       └── local.js                 # fallback final
│   ├── moderation/         # permissions.js, creatorAuth.js, antiSpam.js
│   ├── utils/              # logger.js, crypto.js, auditLog.js, generateEncryptionKey.js
│   ├── economy/ tickets/ xp/ errors/ config/
│   └── index.js            # lógica real de inicialização
├── data/                   # bot.json (criptografado) e configs por servidor
├── logs/                   # logs diários + audit.log
├── tests/
├── .env.example
├── config.example.json
└── package.json
```

## Instalação local passo a passo

### 1. Pré-requisitos

- **Node.js 18.17 ou superior** — [nodejs.org](https://nodejs.org)
- Uma conta Discord com permissão para criar aplicações

### 2. Instalar dependências

```bash
cd discord-bot
npm install
```

Apenas duas dependências: `discord.js` e `dotenv`. Nada de compilação nativa.

### 3. Criar a aplicação no Discord Developer Portal

1. https://discord.com/developers/applications → **New Application**.
2. Aba **Bot** → **Add Bot** → **Reset Token** para gerar o token.
3. Em **Privileged Gateway Intents**, ative `SERVER MEMBERS INTENT` e
   `MESSAGE CONTENT INTENT`.
4. Aba **OAuth2 > General** → copie o **Client ID**.
5. Em **OAuth2 > URL Generator**, marque `bot` e `applications.commands`,
   selecione as permissões necessárias, e use a URL gerada para convidar o
   bot ao seu servidor.

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha pelo menos:

```
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=id_da_aplicacao
CREATOR_ID=seu_discord_id_aqui
```

Para produção, gere uma chave de criptografia:

```bash
npm run generate-key
```

E cole o valor em `MEMORY_ENCRYPTION_KEY` no `.env`.

Deixe `AI_PROVIDER=algorithm` para o modo leve, ou configure `ollama`/`groq`
conforme a seção de arquitetura acima.

### 5. Registrar os comandos slash

```bash
npm run register
```

#### Limpando comandos antigos/duplicados

```bash
npm run clear-commands            # limpa comandos GLOBAIS
npm run clear-commands -- --guild # limpa comandos da guild em DEV_GUILD_ID (efeito imediato)
npm run clear-commands -- --all   # limpa os dois
```

Rode `npm run register` de novo depois para recriar os comandos atuais.

### 6. Executar o bot

```bash
npm start
```

## Publicando na Discloud (plano de 100MB)

1. Preencha o `.env` (passo 4 acima) — o arquivo real vai dentro do `.zip`
   enviado. Deixe `AI_PROVIDER=algorithm` (Ollama/Groq consomem RAM ou rede
   que não cabem nesse plano).
2. Confira o `discloud.config` na raiz (já incluso).
3. Compacte o projeto inteiro com o `discloud.config` na raiz — o
   `.discloudignore` já exclui `node_modules`, `logs`, `data`, `tests`.
4. Envie o `.zip` pelo canal de comandos da Discloud (ou pela CLI).

## Publicando na Oracle Cloud (24/7, modo completo)

1. Clone o repositório no servidor: `git clone <seu-repo> /opt/discord-bot`.
2. Instale o Node.js e, se for usar `AI_PROVIDER=ollama`, o
   [Ollama](https://ollama.com/download) e baixe um modelo (ex:
   `ollama pull llama3.1:8b`).
3. Preencha `/opt/discord-bot/.env` com todos os valores, incluindo
   `CREATOR_ID` e `MEMORY_ENCRYPTION_KEY`.
4. Copie `scripts/discord-bot.service` para
   `/etc/systemd/system/discord-bot.service`, ajuste `User`/`WorkingDirectory`
   se necessário, depois:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable discord-bot
   sudo systemctl start discord-bot
   ```
5. Para atualizar depois de um `git push`, rode `./scripts/deploy.sh` no
   servidor — ele faz backup do banco, atualiza, valida a sintaxe, reinicia
   o serviço, e reverte automaticamente para o commit anterior se algo
   falhar ao subir.

**Recomendações de infraestrutura** (fora do escopo de um script de
código, configure uma vez no servidor): mantenha o Ollama e o banco de
dados escutando apenas em `localhost`; use autenticação por chave SSH em
vez de senha; restrinja o firewall às portas estritamente necessárias;
nunca exponha a porta do Ollama publicamente.

## Configuração por servidor

`/config ver` mostra a configuração atual; os demais subcomandos de
`/config` ajustam canal de logs, boas-vindas, despedida, canal restrito da
IA, cargos administrativos/moderadores, canais silenciosos, e quantidade de
mensagens de contexto. Toda alteração fica registrada em `logs/audit.log`.

`/ai-config` cuida da personalidade (`personalidade`, `tom`, `formalidade`,
`humor` — usados quando `AI_PROVIDER` é `ollama`/`groq`), da memória
administrativa (`lembrar`/`esquecer`), e dos fatos memoráveis observados
sobre usuários (`fatos`/`esquecer-fatos`).

## Comandos disponíveis

`/help` `/info` `/ping` `/config` `/server` `/user` `/clear` `/slowmode`
`/lock` `/unlock` `/warn` `/warnings` `/timeout` `/untimeout` `/kick` `/ban`
`/unban` `/mute` `/poll` `/announce` `/embed` `/say` `/avatar` `/servericon`
`/stats` `/afk` `/remind` `/ai` `/ai-config` `/suggest` `/ticket-panel`
`/balance` `/daily` `/work` `/pay` `/leaderboard` `/shop` `/rank`
`/xp-leaderboard` `/diagnostic` `/test` `/backup` `/privacy`

## Como o bot decide quando falar

Cada mensagem recebe uma pontuação: menção direta ao bot (+100), resposta
direta a uma mensagem do bot (+80), mensagem parecendo pergunta (+60),
palavra-chave configurada (+40), assunto de sistema do servidor (+20),
conversa muito rápida (-50), canal silencioso (-100), bot respondeu
recentemente (-100), mensagem parecendo spam (-100). Só responde acima do
limite configurado (`config.example.json` → `relevance.threshold`, padrão
60).

## Privacidade

`/privacy` explica o que é armazenado a qualquer momento. Resumo: dados
operacionais e configurações ficam em `data/` (criptografados quando
`MEMORY_ENCRYPTION_KEY` está definida); o histórico de contexto é temporário
e expira sozinho; fatos memoráveis só são salvos quando batem um padrão
claro de preferência/fato pessoal, nunca a partir de qualquer mensagem;
nada é enviado a serviços de IA externos a menos que `AI_PROVIDER=groq` ou
`ollama` (fallback) esteja ativo, e nesse caso apenas o contexto mínimo
necessário é enviado.

## O que fica para uma próxima etapa

Este projeto cobriu a arquitetura central (IA em camadas, memória
criptografada, segurança/auditoria, economia de tokens, circuit breaker,
teto de gasto, deploy com rollback). Ficam fora desta versão, por serem
subsistemas grandes o suficiente para merecer seu próprio ciclo de
desenvolvimento e revisão de segurança:

- Dashboard web de monitoramento no PC do administrador.
- Console administrativo por linguagem natural (com validador de ações).
- Geração/roteamento de mídia (imagem/vídeo).
- VPN/hardening completo de rede entre PC ↔ Oracle Cloud (documentado em
  linhas gerais acima, mas a configuração em si é feita uma vez no
  servidor, fora do código).

## Testes

```bash
npm test
```

## Solução de problemas comuns

- **Comandos slash não aparecem**: rode `npm run register` de novo e
  aguarde até 1h se forem globais (sem `DEV_GUILD_ID`).
- **O bot nunca responde no chat**: confirme `/config ia-ativada` como
  `true` e que o canal não está marcado como silencioso.
- **"Nao e possivel carregar o banco sem a chave"**: você definiu
  `MEMORY_ENCRYPTION_KEY` depois que já existiam dados criptografados com
  uma chave diferente (ou perdeu a chave original). Sem a chave certa, os
  dados antigos não podem ser lidos — restaure de um backup se tiver a
  chave usada naquele backup, ou comece do zero apagando `data/bot.json`
  (perde o histórico).
- **Erro de permissão em comandos de moderação**: confirme que o cargo do
  bot está acima dos cargos que ele precisa gerenciar.
- **Bot reiniciando por estouro de memória na Discloud**: use
  `AI_PROVIDER=algorithm` e reduza `contextMessageLimit` via
  `/config contexto`.
