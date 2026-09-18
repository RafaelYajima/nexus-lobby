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

---

## 🏷️ Migração v3 — Tags únicas (estilo Discord)

Cada jogador recebe uma tag `#5624` gerada automaticamente. O **nome pode mudar,
a tag permanece** — é ela que diferencia dois jogadores com o mesmo nome.
Contas `adm` não usam tag. Rode **uma única vez** no SQL Editor:

```sql
-- 1) Nova coluna
alter table public.profiles
  add column if not exists tag text;

-- 2) Gerador de tag livre para um dado username
create or replace function public.generate_unique_tag(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag text;
begin
  loop
    v_tag := lpad((floor(random() * 9999) + 1)::text, 4, '0');
    exit when not exists (
      select 1 from public.profiles
      where username = p_username and tag = v_tag
    );
  end loop;
  return v_tag;
end;
$$;

-- 3) O nome deixa de ser único sozinho; o PAR (nome, tag) é que é único
alter table public.profiles
  drop constraint if exists profiles_username_key;

alter table public.profiles
  add constraint profiles_username_tag_key unique (username, tag);

-- 4) Tag para todos os usuários existentes (menos o adm)
update public.profiles p
set tag = public.generate_unique_tag(coalesce(p.username, 'user'))
where p.tag is null and p.role <> 'adm';

update public.profiles set tag = null where role = 'adm';

-- 5) Todo novo cadastro já ganha a tag automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  insert into public.profiles (id, username, tag)
  values (new.id, v_username, public.generate_unique_tag(v_username));
  return new;
end;
$$;

-- 6) Jogador não muda a própria tag (prepara o futuro plano pago:
--    só o adm, ou você no SQL, podem personalizar uma tag)
create or replace function public.guard_tag_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.tag is distinct from old.tag
     and not public.is_adm() then
    raise exception 'A tag nao pode ser alterada por aqui.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_tag on public.profiles;
create trigger profiles_guard_tag
  before update on public.profiles
  for each row execute function public.guard_tag_change();
```

🔮 **Gancho para o plano pago (futuro):** para deixar um assinante escolher a tag,
basta o adm alterar pelo painel/SQL respeitando a unicidade `(username, tag)`:

```sql
update public.profiles set tag = '0001'
where id = (select id from auth.users where email = 'vip@exemplo.com');
```

---

## 👥 Migração v4 — Amizades + presença com status (estilo Discord)

O recurso **Amigos** (página `/amigos` + faixa de amigos online no lobby) precisa desta migração para funcionar. O sistema de **status** (🟢 Online / 🟡 Ausente / ⚪ Invisível) **não depende dela** — funciona via Realtime + localStorage.

**Importante**: esta migração inclui uma policy que torna os perfis visíveis para qualquer usuário autenticado (necessário para a busca "adicionar amigo"). É a mesma visibilidade que qualquer lobby de jogos tem (nomes de jogadores são públicos para outros jogadores).

```sql
-- ========================================================
-- MIGRAÇÃO v4 — Amizades (pedidos, aceites e descoberta)
-- Rode no SQL Editor do Supabase. Idempotente.
-- ========================================================

-- tabela de amizades
create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  requester   uuid not null references auth.users (id) on delete cascade,
  addressee   uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  constraint  friendships_no_self check (requester <> addressee)
);

-- impede (A,B) e (B,A) duplicados (um par = uma linha)
create unique index if not exists friendships_par_unico
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;

drop policy if exists "ve_amizades_proprias"   on public.friendships;
drop policy if exists "cria_amizade"           on public.friendships;
drop policy if exists "responde_amizade"       on public.friendships;
drop policy if exists "remove_amizade"         on public.friendships;

-- só os dois envolvidos veem a amizade
create policy "ve_amizades_proprias" on public.friendships
  for select using (requester = auth.uid() or addressee = auth.uid());

-- usuário só cria pedido em seu próprio nome
create policy "cria_amizade" on public.friendships
  for insert with check (requester = auth.uid());

-- só o DESTINATÁRIO responde (aceita)
create policy "responde_amizade" on public.friendships
  for update using (addressee = auth.uid());

-- qualquer um dos dois remove (cancelar pedido ou desfazer amizade)
create policy "remove_amizade" on public.friendships
  for delete using (requester = auth.uid() or addressee = auth.uid());

-- perfis visíveis para usuários autenticados:
-- habilita a busca "adicionar amigo" (nome/tag) e resolve os perfis
-- de amigos sem função extra. Ajuste anterior era "somente o próprio".
drop policy if exists "perfis_publicos_para_autenticados" on public.profiles;
create policy "perfis_publicos_para_autenticados" on public.profiles
  for select using (true);
```

**Verificar:**

```sql
select table_name from information_schema.tables
 where table_name = 'friendships';          -- esperado: friendships
select policyname, tablename from pg_policies
 where tablename in ('friendships','profiles') and schemaname = 'public';
```

**Notas:**
- Status (online/ausente/invisível) fica no **canal Realtime** — invisíveis simplesmente não se anunciam; nenhuma tabela guarda quem está online.
- A preferência de status e o prazo ("ausente até 18h") ficam no `localStorage` do dispositivo + memória da sessão. Se um dia quiser histórico/telemetria, dá pra persistir em tabela depois.
- Sem a v4: a página `/amigos` mostra aviso amigável "🔧 A tabela de amizades ainda não existe" e o **status continua funcionando** para todo mundo (só não há lista de amigos).

## ⭐ Migração v5 — Favoritos de amizade

Favoritos são **pessoais**: cada usuário tem os seus e o amigo não é notificado/fica sabendo. Só dá pra favoritar amizade **aceita**.

```sql
-- ========================================================
-- MIGRAÇÃO v5 — Favoritos (idempotente: pode rodar de novo)
-- ========================================================

create table if not exists public.friend_favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  friend_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.friend_favorites enable row level security;

drop policy if exists "ve_meus_favoritos"  on public.friend_favorites;
drop policy if exists "marca_favorito"     on public.friend_favorites;
drop policy if exists "desmarca_favorito"  on public.friend_favorites;

create policy "ve_meus_favoritos" on public.friend_favorites
  for select using (user_id = auth.uid());

create policy "marca_favorito" on public.friend_favorites
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester = auth.uid() and f.addressee = friend_id)
          or (f.addressee = auth.uid() and f.requester = friend_id))
    )
  );

create policy "desmarca_favorito" on public.friend_favorites
  for delete using (user_id = auth.uid());
```

**Verificar:**

```sql
select * from public.friend_favorites;  -- (vazio no começo)
```

Sem a v5: o app funciona normal, só as estrelinhas ⭐ avisam "rode a Migração v5".

## 💬 Migração v6 — Chat direto entre amigos

Mensagens 1:1 persistidas, com entrega instantânea via Realtime. Só é possível conversar com amizade **aceita** (RLS bloqueia pro resto). Cada usuário só vê conversas em que participa.

```sql
-- ========================================================
-- MIGRAÇÃO v6 — Chat direto (idempotente)
-- ========================================================

create table if not exists public.direct_messages (
  id           bigint generated always as identity primary key,
  sender_id    uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  content      text not null check (char_length(content) between 1 and 1000),
  created_at   timestamptz not null default now()
);

create index if not exists dm_par_ordenado on public.direct_messages (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc
);

alter table public.direct_messages enable row level security;

drop policy if exists "ve_minhas_mensagens" on public.direct_messages;
drop policy if exists "envia_para_amigo"    on public.direct_messages;

create policy "ve_minhas_mensagens" on public.direct_messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "envia_para_amigo" on public.direct_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester = auth.uid() and f.addressee = recipient_id)
          or (f.addressee = auth.uid() and f.requester = recipient_id))
    )
  );

-- entrega instantânea (sem refresh): habilita Realtime na tabela
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
```

**Verificar:**

```sql
-- deve conseguir inserir/lendo como usuário logado (teste pelo app é mais fácil 🙂)
select * from public.direct_messages;
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
```

Sem a v6: a página do chat mostra "🔧 O chat ainda não foi ativado" e o resto do app segue normal.

## 🔔 Migração v7 — Contadores de mensagens não lidas

Guarda "quando eu li cada conversa" — aí o badge vermelho (menu Amigos e 💬 de cada amigo) sabe contar até você abrir o chat de novo. Sincroniza entre dispositivos.

```sql
-- ========================================================
-- MIGRAÇÃO v7 — Leitura de mensagens (idempotente)
-- ========================================================

create table if not exists public.chat_reads (
  user_id       uuid not null references auth.users (id) on delete cascade,
  other_user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (user_id, other_user_id)
);

alter table public.chat_reads enable row level security;

drop policy if exists "ve_minha_leitura"       on public.chat_reads;
drop policy if exists "grava_minha_leitura"    on public.chat_reads;
drop policy if exists "atualiza_minha_leitura" on public.chat_reads;

create policy "ve_minha_leitura" on public.chat_reads
  for select using (user_id = auth.uid());

create policy "grava_minha_leitura" on public.chat_reads
  for insert with check (user_id = auth.uid());

create policy "atualiza_minha_leitura" on public.chat_reads
  for update using (user_id = auth.uid());
```

**Verificar:**

```sql
select * from public.chat_reads;  -- começa vazia; enche conforme você abre chats
```

Sem a v7: badges nunca aparecem e o app segue normal (contadores ficam zerados localmente).

## 🎮 Migração v8 — Salas de jogo (criar/entrar + chat de sala)

Salas públicas com dono 👑 (só o dono fecha), lista de membros e chat em grupo com histórico e entrega instantânea. Presença "quem está na sala agora" roda por canal Realtime (não depende de tabela).

```sql
-- ========================================================
-- MIGRAÇÃO v8 — Salas (idempotente)
-- ========================================================

create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 2 and 40),
  game_id    text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "ve_salas_abertas"   on public.rooms;
drop policy if exists "cria_sala"          on public.rooms;
drop policy if exists "dono_fecha_sala"    on public.rooms;
drop policy if exists "dono_remove_sala"   on public.rooms;

create policy "ve_salas_abertas" on public.rooms
  for select using (status = 'open' or created_by = auth.uid());

create policy "cria_sala" on public.rooms
  for insert with check (created_by = auth.uid());

create policy "dono_fecha_sala" on public.rooms
  for update using (created_by = auth.uid());

create policy "dono_remove_sala" on public.rooms
  for delete using (created_by = auth.uid());

-- membros da sala
create table if not exists public.room_members (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_members enable row level security;

drop policy if exists "lista_membros_mesma_sala" on public.room_members;
drop policy if exists "entra_na_sala"            on public.room_members;
drop policy if exists "sai_ou_dono_expulsa"      on public.room_members;

create policy "lista_membros_mesma_sala" on public.room_members
  for select using (
    exists (
      select 1 from public.room_members m
      where m.room_id = room_members.room_id and m.user_id = auth.uid()
    )
  );

create policy "entra_na_sala" on public.room_members
  for insert with check (user_id = auth.uid());

create policy "sai_ou_dono_expulsa" on public.room_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = room_members.room_id and r.created_by = auth.uid()
    )
  );

-- chat da sala
create table if not exists public.room_messages (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  sender_id  uuid not null references auth.users (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists room_msgs_idx on public.room_messages (room_id, created_at desc);

alter table public.room_messages enable row level security;

drop policy if exists "ve_mensagens_da_sala" on public.room_messages;
drop policy if exists "manda_na_sala"        on public.room_messages;

create policy "ve_mensagens_da_sala" on public.room_messages
  for select using (
    exists (
      select 1 from public.room_members m
      where m.room_id = room_messages.room_id and m.user_id = auth.uid()
    )
  );

create policy "manda_na_sala" on public.room_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.room_members m
      where m.room_id = room_messages.room_id and m.user_id = auth.uid()
    )
  );

-- Realtime nas tabelas novas (lista viva + chat instantâneo)
do $$
declare t text;
begin
  foreach t in array array['rooms','room_messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
```

**Verificar:**

```sql
select count(*) from public.rooms;
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
-- deve listar: direct_messages, rooms, room_messages
```

Sem a v8: as páginas de Salas mostram o aviso 🔧 e todo o resto segue funcionando.

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
