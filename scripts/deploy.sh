#!/usr/bin/env bash
set -euo pipefail

# Script de deploy simples (item 24): busca a ultima versao do Git, instala
# dependencias, valida a sintaxe de todos os arquivos, faz backup do banco
# ANTES de reiniciar, e reinicia o bot via systemd - com rollback automatico
# para o commit anterior se a nova versao falhar ao subir.
#
# Uso no servidor (ex: Oracle Cloud): ./scripts/deploy.sh
# Pressupoe: repositorio Git ja clonado, Node.js instalado, e o servico
# systemd "discord-bot" configurado (veja scripts/discord-bot.service).
#
# O que este script NAO faz (fora do escopo de um script de codigo):
# configurar firewall, VPN, usuarios do sistema ou o proprio systemd - isso
# e feito uma unica vez na configuracao inicial do servidor (ver README).

SERVICE_NAME="discord-bot"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [ ! -d .git ]; then
  echo "ERRO: este diretorio nao e um repositorio Git. Clone o projeto com 'git clone' antes de usar este script."
  exit 1
fi

echo "==> Commit atual (para rollback se necessario): $(git rev-parse --short HEAD)"
PREVIOUS_COMMIT=$(git rev-parse HEAD)

echo "==> Fazendo backup do banco antes do deploy..."
node -e "require('./src/database/database').backup()"

echo "==> Buscando atualizacoes..."
git fetch --quiet
git pull --quiet

echo "==> Instalando dependencias..."
npm install --omit=dev --no-audit --no-fund

echo "==> Validando sintaxe dos arquivos..."
if ! find src -name "*.js" -exec node --check {} \; ; then
  echo "ERRO: validacao de sintaxe falhou. Restaurando versao anterior ($PREVIOUS_COMMIT)."
  git reset --hard "$PREVIOUS_COMMIT"
  npm install --omit=dev --no-audit --no-fund
  exit 1
fi

echo "==> Reiniciando servico ($SERVICE_NAME)..."
sudo systemctl restart "$SERVICE_NAME"

echo "==> Aguardando inicializacao..."
sleep 5

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "ERRO: o servico nao ficou ativo apos o restart. Restaurando versao anterior ($PREVIOUS_COMMIT)."
  git reset --hard "$PREVIOUS_COMMIT"
  npm install --omit=dev --no-audit --no-fund
  sudo systemctl restart "$SERVICE_NAME"
  exit 1
fi

echo "==> Deploy concluido com sucesso. Commit atual: $(git rev-parse --short HEAD)"
