# 🤖 Discord Bot

Bot de Discord completo e modular — moderação, tickets, economia, XP,
memória de longo prazo criptografada e um motor de conversação em camadas
(Ollama → Groq → algoritmo) que decide quando faz sentido responder no chat.

Roda tanto em modo **ultra-leve** (sem IA generativa, cabe em 100MB de RAM)
quanto em modo **completo** (IA local ou via API, pensado pra rodar 24/7 num
servidor próprio).

![Node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)

---

## Índice

- [Funcionalidades](#-funcionalidades)
- [Arquitetura de IA](#-arquitetura-de-ia)
- [Início rápido](#-início-rápido)
- [Configuração](#-configuração)
- [Comandos](#-comandos-disponíveis)
- [Hospedagem](#-onde-hospedar)
- [Segurança](#-segurança)
- [Testes](#-testes)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Licença](#-licença)

---

## ✨ Funcionalidades

- 🧠 **Conversação em camadas** — Ollama (local) → Groq (API barata) →
  motor algorítmico, com fallback automático e economia de tokens
- 🗂️ **Memória de longo prazo** — fatos observados sobre usuários,
  separados da memória administrativa, com criptografia em repouso
- 🛡️ **Moderação completa** — warn, timeout, kick, ban, anti-spam,
  anti-raid, anti-link, logs detalhados
- 🎫 **Tickets** com painel de botões e transcript automático
- 💰 **Economia** e **XP/níveis** com anti-spam embutido
- 👋 **Boas-vindas / despedida** configuráveis
- 🔒 **Segurança embutida** — criptografia AES-256-GCM, autoridade fixa do
  criador do bot, log de auditoria, circuit breaker, teto de gasto mensal
- ⚙️ **Zero dependências nativas** — sem compilação, roda em qualquer
  hospedagem com Node.js

## 🧠 Arquitetura de IA

```
Discord → contexto → memória → prompt → provider ativo
                                              ↓
                                  Ollama → Groq → algoritmo
                          (cada um com circuit breaker e fallback automático)
```

Controlado por `AI_PROVIDER` no `.env`:

| Modo | Descrição | Requisito |
|---|---|---|
| `algorithm` *(padrão)* | Casamento de padrões, sem IA generativa, sem rede | Nenhum — roda em 100MB de RAM |
| `groq` | API barata como principal, algoritmo como fallback | `GROQ_API_KEY` |
| `ollama` | Modelo local como principal, Groq e depois algoritmo como fallback | VPS com 8GB+ RAM |

## 🚀 Início rápido

```bash
git clone https://github.com/BielIceCream/local-ia-chatbot-discord.git
cd discord-bot
npm install
cp .env.example .env
```

Preencha o `.env` com `DISCORD_TOKEN`, `CLIENT_ID` e `CREATOR_ID` (seu
Discord ID). Depois:

```bash
npm run generate-key   # gera a chave de criptografia do banco
npm run register        # registra os comandos slash
npm start                # roda o bot
```

Passo a passo completo de criação da aplicação no Discord Developer Portal:
ver [`docs/SETUP.md`](docs/SETUP.md).

## ⚙️ Configuração

Cada servidor tem sua própria configuração, ajustável via `/config` (canais,
cargos, moderação) e `/ai-config` (personalidade, memória). Configurações
globais e tetos de gasto ficam em `config.example.json`.

## 📜 Comandos disponíveis

<details>
<summary>Clique para expandir a lista completa</summary>

**Utilidade:** `/help` `/info` `/ping` `/server` `/user` `/avatar`
`/servericon` `/stats` `/afk` `/remind` `/suggest`

**Moderação:** `/warn` `/warnings` `/timeout` `/untimeout` `/kick` `/ban`
`/unban` `/mute` `/clear` `/slowmode` `/lock` `/unlock`

**Administração:** `/config` `/poll` `/announce` `/embed` `/say`
`/ticket-panel`

**Economia & XP:** `/balance` `/daily` `/work` `/pay` `/leaderboard`
`/shop` `/rank` `/xp-leaderboard`

**IA:** `/ai` `/ai-config`

**Sistema:** `/diagnostic` `/test` `/backup` `/privacy`

</details>

## ☁️ Onde hospedar

| Plataforma | RAM | Custo | Bom para |
|---|---|---|---|
| [Discloud](https://discloud.com) | 100MB | Grátis | `AI_PROVIDER=algorithm` |
| Oracle Cloud (Always Free) | até 24GB | Grátis permanente | `AI_PROVIDER=ollama` |
| AWS EC2 / VPS pago | variável | Grátis por tempo limitado, depois paga | `AI_PROVIDER=groq` |

Deploy com rollback automático via `scripts/deploy.sh` + `scripts/discord-bot.service`
(systemd). Detalhes completos em [`docs/DEPLOY.md`](docs/DEPLOY.md).

## 🔒 Segurança

- **Criptografia AES-256-GCM** do banco de dados e backups
  (`MEMORY_ENCRYPTION_KEY`)
- **`CREATOR_ID`** fixo por variável de ambiente — nunca alterável por
  comando, mensagem ou resposta de IA
- **Log de auditoria** (`logs/audit.log`) para mudanças de configuração
- **Circuit breaker + teto de gasto mensal** — nunca trava nem estoura
  orçamento com providers pagos
- Prompt hardening contra prompt injection (memórias tratadas como dado,
  nunca como instrução)

## 🧪 Testes

```bash
npm test
```

## 📁 Estrutura do projeto

```
discord-bot/
├── index.js
├── discloud.config
├── scripts/          # deploy.sh, discord-bot.service
├── src/
│   ├── commands/     # admin, moderation, utility, fun, economy, ai, system
│   ├── events/
│   ├── ai/           # aiManager, providers (algorithm/ollama/groq), memória
│   ├── database/      # armazenamento JSON criptografado
│   ├── moderation/
│   └── config/
├── data/              # gerado automaticamente (git-ignored)
├── logs/
└── tests/
```

## 📄 Licença

MIT — sinta-se livre para usar, modificar e redistribuir.
