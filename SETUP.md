# 🚀 Configuração do Supabase — NEXUS

## ✅ Já concluído

- [x] Projeto criado no Supabase (`uokiymibeudovkksvxxz`)
- [x] Credenciais preenchidas no `.env`
- [x] Front-end conectado

## 📋 O que falta: rodar o SQL (passo único)

1. No dashboard do Supabase, abra **SQL Editor** → **New query**.
2. Cole **todo** o script abaixo e clique em **Run** ▶️.

> 💡 Se você chegou a rodar a versão anterior deste script (sem papéis), antes limpe o banco com:
> `drop table if exists public.profiles cascade;`

```sql
-- =====================================================
-- NEXUS · Setup completo do banco (execute de uma vez)
-- Cria: tabela profiles (com papéis adm/mod/user),
-- segurança RLS, triggers e o usuário ADMIN.
-- =====================================================

-- 1) Tabela de perfis -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user' check (role in ('adm', 'mod', 'user')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now()
);

-- 2) Função auxiliar: o usuário logado é adm? -------------------------
-- (security definer evita recursão nas políticas RLS)
create or replace function public.is_adm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'adm'
  );
$$;

-- 3) Segurança por linha (RLS) ----------------------------------------
alter table public.profiles enable row level security;

create policy "perfil: leitura propria ou adm"
  on public.profiles for select
  using (auth.uid() = id or public.is_adm());

create policy "perfil: criacao propria"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "perfil: atualizacao propria"
  on public.profiles for update
  using (auth.uid() = id);

create policy "perfil: adm atualiza qualquer um"
  on public.profiles for update
  using (public.is_adm());

-- 4) Escudo contra auto-promoção ---------------------------------------
-- Via API, só o adm pode alterar o campo "role" (de qualquer pessoa).
-- Alterações feitas por você no Dashboard/SQL Editor seguem livres.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not public.is_adm() then
    raise exception 'Apenas o administrador pode alterar papeis.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- 5) Perfil automático a cada novo cadastro (papel padrão: user) ------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) Usuário ADMIN -------------------------------------------------------
-- ⚠️ NÃO crie usuários com INSERT manual em auth.users (bloco antigo
-- removido): cada versão do servidor de auth exige um formato interno
-- diferente, e uma linha incompatível quebra o login com erro 500.
-- Crie o adm pelo Dashboard (Authentication → Users → Add user) e depois
-- rode o script da "Seção 6b" abaixo.

-- 6b) Após criar o usuário adm@lobby.com pelo Dashboard, execute:

-- define a senha final como '123' (a API exige 6+, então ajustamos aqui)
update auth.users
set encrypted_password = extensions.crypt('123', extensions.gen_salt('bf'))
where email = 'adm@lobby.com';

-- garante papel de administrador no perfil
update public.profiles
set role = 'adm', username = 'Admin'
where id = (select id from auth.users where email = 'adm@lobby.com');
```

### 🔧 Criando o usuário ADMIN do jeito certo

> Se você chegou a rodar uma versão antiga deste script que criava o adm com
> `insert` manual, **apague a linha corrompida primeiro**:
> ```sql
> delete from auth.users where email = 'adm@lobby.com';
> ```

1. No dashboard, vá em **Authentication** → **Users** → botão **Add user** → **Create new user**.
2. Preencha: **Email** `adm@lobby.com`, **Password** `Nexus@123` (temporária, precisa de 6+), e marque ✅ **Auto Confirm User**. Clique em **Create user**.
3. Volte ao **SQL Editor** e rode **apenas o bloco 6b** do script acima (define a senha final `123` + papel `adm`).
4. Pronto: login com `adm@lobby.com` / `123` ✅

3. Verifique no **Table Editor** que a tabela `profiles` existe e tem uma linha com `role = adm`.

---

## 🛡️ Como funcionam os papéis

| Papel | Quem é | O que pode |
|---|---|---|
| `adm` | **Só você** (`adm@lobby.com`) | Tudo + promover/rebaixar mods |
| `mod` | Quem você promover | (futuro: moderar salas/chat) |
| `user` | Todo novo cadastro | Jogar e editar o próprio perfil |

⚠️ **Segurança garantida no banco**: mesmo que alguém tente se auto-promover
chamando a API diretamente, o trigger `guard_role_change` bloqueia — só o adm
altera papéis.

### Promover alguém a MOD (por enquanto)

1. A pessoa **se cadastra normalmente** pelo site (ela entra como `user`).
2. Você escolhe um caminho:
   - **Table Editor**: abra `profiles`, ache a linha da pessoa e mude `role` para `mod`; **ou**
   - **SQL Editor**:
     ```sql
     update public.profiles set role = 'mod'
     where id = (select id from auth.users where email = 'email-do-mod@exemplo.com');
     ```

📌 *Próxima etapa:* vou criar um **painel admin dentro do próprio app**, onde você
promove/rebaixa mods com um clique (as permissões acima já deixam isso pronto).

## 🔑 Sobre a senha do adm (`123`)

- Ela funciona porque foi gravada **direto no banco** (criptografada com bcrypt).
- A API do Supabase exige **mínimo de 6 caracteres** para cadastros e trocas de senha —
  ou seja: se um dia você quiser trocá-la pelo site, a nova precisará ter 6+.
- Recomendo trocar por uma senha forte quando o projeto for para produção. 😉

## ⚙️ Ajustes recomendados de autenticação

Em **Authentication** → **Sign In / Providers**:

- **Confirm email**: para testar rápido, **desative (OFF)** — o cadastro já loga direto.
  *(O adm criado pelo SQL já entra sem confirmação, isso é só para os novos usuários.)*

Em **Authentication** → **URL Configuration** (para o "esqueci a senha"):

- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: adicione `http://localhost:5173/**` e `https://*.e2b.app/**`

## 🎮 Testando

1. **Login adm**: `adm@lobby.com` / `123` → você verá o selo **ADMIN** no lobby.
2. **Cadastro comum**: aba *Cadastrar* → entra como `user` (selo JOGADOR).
3. **Tema**: alterne ☀️/🌙 → o valor é salvo no seu perfil no banco.
4. **Promoção a mod**: cadastre outra conta, promova via SQL/Table Editor → selo **MOD**.

### ❓ Problemas comuns

| Problema | Causa provável |
|---|---|
| "relation public.profiles does not exist" | Script SQL ainda não foi executado |
| adm não consegue entrar | Passo 6 do script falhou — me mande o erro do SQL Editor |
| "Confirme seu e-mail antes de entrar" | Cadastro feito com *Confirm email* ativo — desative ou confirme no e-mail |
