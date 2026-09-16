#!/usr/bin/env bash
# ============================================
#  NEXUS - Rodar o projeto (Linux/Mac)
#  chmod +x rodar.sh && ./rodar.sh
# ============================================
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[1/2] Instalando dependencias (so acontece na 1a vez)..."
  npm install
fi

echo "[2/2] Iniciando o NEXUS em http://localhost:5173 ..."
npm run dev
