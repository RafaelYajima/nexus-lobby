# ⚡ NEXUS — Sua arena de jogos

Plataforma de lobby de jogos com autenticação completa, papéis de usuário
(**adm / mod / jogador**) e tema claro/escuro salvo por conta.

## 🛠️ Stack

- **React 18 + Vite** — front-end rápido com hot reload
- **Tailwind CSS** — estilo (tema dark neon por padrão)
- **Supabase** — auth + banco de dados (tabela `profiles` com RLS)
- **React Router** — rotas protegidas por sessão

## 🚀 Rodando localmente

**Pré-requisito**: [Node.js 18+](https://nodejs.org)

```bash
npm install     # só na primeira vez
npm run dev     # abre em http://localhost:5173
```

Ou simplesmente execute **`rodar.bat`** (Windows) / **`rodar.sh`** (Linux/Mac)
com um duplo clique — ele instala o que faltar e sobe o servidor.

## 🔐 Configuração do Supabase

1. Copie `.env.example` para `.env` e preencha com suas chaves
   (Project Settings → API no dashboard do Supabase).
2. Rode o script SQL do **[SETUP.md](./SETUP.md)** no SQL Editor
   (tabela `profiles`, papéis, RLS e triggers).
   O SETUP.md também ensina a criar o usuário `adm`.

## 🔄 Atualizando o código (fluxo com Git)

Depois que novo código for publicado no repositório:

```bash
git pull
```

Ou use **`atualizar.bat`** — ele faz `git pull` + garante as dependências.
Normalmente **não precisa reiniciar o servidor**: o Vite recarrega sozinho.

## 👥 Papéis de usuário

| Papel | Como se torna |
|---|---|
| `user` | Padrão de todo novo cadastro |
| `mod` | Promovido pelo adm (SQL/Table Editor; painel no app em breve) |
| `adm` | Apenas o dono do projeto (ver SETUP.md) |

## 📁 Estrutura

```
src/
├── components/   # Logo, Spinner, ThemeToggle, ProtectedRoute
├── context/      # AuthContext (sessão) e ThemeContext (tema no perfil)
├── lib/          # cliente Supabase
├── pages/        # AuthPage (login/cadastro/recuperar), Lobby, ResetPassword
└── utils/        # tradução de erros PT-BR
scripts/          # utilitários de teste de auth (Node)
```
