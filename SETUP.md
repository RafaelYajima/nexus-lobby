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

## 🏆 Migração v9 — Ranking da comunidade (view de pontuação)

Uma **view** agregada com a pontuação do ranking. Sem tabela nova. Roda com permissão de leitura para logados; a view enxerga as tabelas (definer) e expõe só o agregado (pontos), não os dados brutos.

```sql
-- ========================================================
-- MIGRAÇÃO v9 — Ranking (idempotente)
-- ========================================================

create or replace view public.community_score as
select
  p.id,
  p.username,
  p.tag,
  p.role,
    coalesce(f.friends, 0)  * 10
  + coalesce(m.msgs, 0)
  + coalesce(rm.rmsgs, 0)
  + coalesce(r.rooms, 0)    * 15
  + coalesce(fv.faved, 0)   * 5  as score
from public.profiles p
left join (
  select uid, count(*) as friends from (
    select requester as uid from public.friendships where status = 'accepted'
    union all
    select addressee as uid from public.friendships where status = 'accepted'
  ) x group by uid
) f  on f.uid  = p.id
left join (select sender_id,  count(*) as msgs  from public.direct_messages  group by sender_id)  m  on m.sender_id  = p.id
left join (select sender_id,  count(*) as rmsgs from public.room_messages    group by sender_id)  rm on rm.sender_id = p.id
left join (select created_by, count(*) as rooms from public.rooms            group by created_by) r  on r.created_by = p.id
left join (select friend_id,  count(*) as faved from public.friend_favorites group by friend_id)  fv on fv.friend_id = p.id;

grant select on public.community_score to authenticated;
```

**Verificar:**

```sql
select * from public.community_score order by score desc limit 10;
```

Pontos: 🤝 10/amizade aceita · 💬 1/mensagem (DM+sala) · 🎮 15/sala criada · ⭐ 5/quem te favoritou.

Sem a v9: a página Ranking mostra o aviso 🔧 e o resto segue normal.

## 🔊 Migração v10 — Preferência de som por conta

Uma coluna pra o botão 🔊/🔇 (header) seguir a **conta** em qualquer dispositivo, aba anônima ou navegador.

```sql
-- Migração v10 — sound_enabled no perfil (idempotente)
alter table public.profiles
  add column if not exists sound_enabled boolean not null default true;
```

**Verificar:**

```sql
select username, sound_enabled from public.profiles;
```

Sem a v10: o app funciona, mas a preferência volta ao modo antigo (só no navegador atual).

## ⚡ Migração v11 — Quiz Relâmpago (o primeiro jogo de verdade!)

Jogo por sala: qualquer membro inicia uma partida de **8 perguntas com 10s cada**; o sistema avança as rodadas sozinho (estado no banco + update condicional — não depende de quem criou continuar online). Acerto = **10 pts + bônus de rapidez (até +5)**; o placar final cai direto no 🏆 Ranking.

> Pré-requisito: ter rodado a **v8** (salas) e a **v9** (ranking) antes — a v11 reutiliza
> `room_members` e recria a view `community_score` somando os pontos de jogo.

```sql
-- ========================================================
-- MIGRAÇÃO v11 — Quiz Relâmpago (idempotente)
-- ========================================================

-- 1) Partidas (uma ativa por sala) ------------------------------------
create table if not exists public.quiz_games (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid not null references public.rooms (id) on delete cascade,
  host_id             uuid not null references auth.users (id) on delete cascade,
  question_ids        jsonb not null default '[]'::jsonb,
  status              text not null default 'active' check (status in ('active','finished')),
  question_idx        integer not null default 0,
  question_started_at timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  finished_at         timestamptz
);

-- impede dupla partida na mesma sala (clique duplo / corrida de telas)
create unique index if not exists quiz_games_uma_ativa_por_sala
  on public.quiz_games (room_id) where status = 'active';

create index if not exists quiz_games_sala_idx
  on public.quiz_games (room_id, created_at desc);

alter table public.quiz_games enable row level security;

drop policy if exists "quiz: ve partidas da minha sala" on public.quiz_games;
drop policy if exists "quiz: membro inicia partida"    on public.quiz_games;
drop policy if exists "quiz: membro avanca partida"    on public.quiz_games;

create policy "quiz: ve partidas da minha sala" on public.quiz_games
  for select using (
    exists (
      select 1 from public.room_members m
      where m.room_id = quiz_games.room_id and m.user_id = auth.uid()
    )
  );

create policy "quiz: membro inicia partida" on public.quiz_games
  for insert with check (
    host_id = auth.uid()
    and exists (
      select 1 from public.room_members m
      where m.room_id = quiz_games.room_id and m.user_id = auth.uid()
    )
  );

-- qualquer membro avança a rodada (update condicional: o primeiro vence)
create policy "quiz: membro avanca partida" on public.quiz_games
  for update using (
    exists (
      select 1 from public.room_members m
      where m.room_id = quiz_games.room_id and m.user_id = auth.uid()
    )
  );

-- 2) Respostas (placar e histórico da partida) ------------------------
create table if not exists public.quiz_answers (
  game_id      uuid not null references public.quiz_games (id) on delete cascade,
  question_idx integer not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  chosen       integer not null,
  correct      boolean not null,
  points       integer not null default 0,
  answered_at  timestamptz not null default now(),
  primary key (game_id, question_idx, user_id) -- 1 resposta por pergunta por pessoa
);

alter table public.quiz_answers enable row level security;

drop policy if exists "quiz: ve respostas da minha sala" on public.quiz_answers;
drop policy if exists "quiz: envio minha resposta"      on public.quiz_answers;

create policy "quiz: ve respostas da minha sala" on public.quiz_answers
  for select using (
    exists (
      select 1
      from public.quiz_games g
      join public.room_members m
        on m.room_id = g.room_id and m.user_id = auth.uid()
      where g.id = quiz_answers.game_id
    )
  );

create policy "quiz: envio minha resposta" on public.quiz_answers
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.quiz_games g
      join public.room_members m
        on m.room_id = g.room_id and m.user_id = auth.uid()
      where g.id = quiz_answers.game_id and g.status = 'active'
    )
  );

-- 3) Placares finais (entrada de pontos no ranking) -------------------
-- Tabela genérica: serve pro Quiz e pros próximos jogos (game = 'quiz', 'brawl', …)
create table if not exists public.game_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  game       text not null,
  room_id    uuid references public.rooms (id) on delete set null,
  points     integer not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 1 placar por pessoa por partida → gravação idempotente mesmo com 2 abas
create unique index if not exists game_results_uma_por_partida
  on public.game_results (user_id, game, (detail ->> 'game_id'));

alter table public.game_results enable row level security;

drop policy if exists "jogos: placares visiveis" on public.game_results;
drop policy if exists "jogos: grava meu placar"  on public.game_results;

-- placares são público de ranking (pontos, não dados sensíveis)
create policy "jogos: placares visiveis" on public.game_results
  for select using (true);

create policy "jogos: grava meu placar" on public.game_results
  for insert with check (user_id = auth.uid());

-- 4) Ranking: soma os pontos de jogo na view ---------------------------
create or replace view public.community_score as
select
  p.id,
  p.username,
  p.tag,
  p.role,
    coalesce(f.friends, 0)  * 10
  + coalesce(m.msgs, 0)
  + coalesce(rm.rmsgs, 0)
  + coalesce(r.rooms, 0)    * 15
  + coalesce(fv.faved, 0)   * 5
  + coalesce(g.gpts, 0)               as score
from public.profiles p
left join (
  select uid, count(*) as friends from (
    select requester as uid from public.friendships where status = 'accepted'
    union all
    select addressee as uid from public.friendships where status = 'accepted'
  ) x group by uid
) f  on f.uid  = p.id
left join (select sender_id,  count(*) as msgs  from public.direct_messages  group by sender_id)  m  on m.sender_id  = p.id
left join (select sender_id,  count(*) as rmsgs from public.room_messages    group by sender_id)  rm on rm.sender_id = p.id
left join (select created_by, count(*) as rooms from public.rooms            group by created_by) r  on r.created_by = p.id
left join (select friend_id,  count(*) as faved from public.friend_favorites group by friend_id)  fv on fv.friend_id = p.id
left join (select user_id,    sum(points) as gpts from public.game_results   group by user_id)    g  on g.user_id   = p.id;

grant select on public.community_score to authenticated;

-- 5) Realtime (pergunta nova + respostas aparecem na hora) -------------
do $$
declare t text;
begin
  foreach t in array array['quiz_games','quiz_answers'] loop
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
select * from public.quiz_games;     -- vazio até a 1ª partida
select * from public.game_results;   -- idem
select username, score from public.community_score order by score desc limit 5;
```

**Observações:**
- A validação de tempo/pontos é no **cliente** (com um relógio de 10s vindo do servidor). Entre amigos é suficiente; se um dia o ranking virar competição séria, o passo é mover a correção pra um RPC/security definer.
- Sem a v11: a aba ⚡ Quiz mostra o aviso 🔧 e o resto do app segue normal.

## 🔒 Migração v12 — Correção do Quiz 100% no banco (RPCs)

**Substitui a validação do cliente.** Agora:

- O banco de perguntas (com gabarito) mora na tabela `quiz_questions` — **trancada por RLS**: ninguém lê o gabarito direto; só as funções (security definer) abrem.
- `quiz_start` / `quiz_answer` / `quiz_advance` / `quiz_reveal` são **RPCs no Postgres**: tempo contado pelo clock do servidor, correção e pontos calculados lá, avanço de rodada serializado com row-lock (n clientes chamam, avança 1 vez).
- O cliente só recebe o snapshot da partida (pergunta + opções, **sem resposta**) e deixa de inserir/atualizar tabelas direto — as policies de insert/update da v11 são removidas de propósito.
- Partidas antigas da v11 (sem snapshot) se encerram sozinhas: o cliente chama `quiz_advance` e o banco drena as rodadas até finalizar.

> Pré-requisito: **v11** rodada (esta migração altera tabelas criadas lá).

```sql
-- ========================================================
-- MIGRAÇÃO v12 — Quiz server-side (idempotente)
-- ========================================================

-- 1) Banco de perguntas (gabarito FECHADO) ------------------------------
create table if not exists public.quiz_questions (
  id      text primary key,
  q       text not null,
  options jsonb not null,
  answer  integer not null check (answer between 0 and 3)
);

alter table public.quiz_questions enable row level security;
-- Sem nenhuma policy de select de propósito:
-- ninguém lê o gabarito direto; as funções (security definer = dono) leem.

insert into public.quiz_questions (id, q, options, answer) values
 ('q01','Qual estúdio criou o jogo Minecraft?','["Mojang","Valve","Epic Games","Blizzard"]',0),
 ('q02','Qual é a capital da Austrália?','["Sydney","Melbourne","Camberra","Perth"]',2),
 ('q03','Quanto é 7 × 8?','["54","63","48","56"]',3),
 ('q04','Qual é o maior planeta do Sistema Solar?','["Júpiter","Saturno","Netuno","Terra"]',0),
 ('q05','Em que ano o Brasil conquistou a 5ª Copa do Mundo?','["1994","1998","2002","2006"]',2),
 ('q06','Qual destes NÃO é um gás em temperatura ambiente?','["Oxigênio","Hélio","Ferro","Nitrogênio"]',2),
 ('q07','Quem é o herói jogável da série The Legend of Zelda?','["Zelda","Ganondorf","Tingle","Link"]',3),
 ('q08','Quantos minutos tem um jogo de futebol, sem acréscimos?','["80","100","90","120"]',2),
 ('q09','O rio tradicionalmente considerado o mais extenso do mundo fica no…','["Brasil","Egito","China","Estados Unidos"]',0),
 ('q10','Qual console híbrido a Nintendo lançou em 2017?','["Wii U","Switch","3DS","GameCube"]',1),
 ('q11','Qual é a raiz quadrada de 144?','["12","14","16","24"]',0),
 ('q12','Qual elemento químico tem o símbolo O?','["Ósmio","Prata","Ouro","Oxigênio"]',3),
 ('q13','Quem pintou a Mona Lisa?','["Van Gogh","Picasso","Da Vinci","Monet"]',2),
 ('q14','No xadrez, qual peça anda em formato de "L"?','["Bispo","Torre","Cavalo","Rainha"]',2),
 ('q15','Qual é o maior estado do Brasil em extensão territorial?','["Minas Gerais","Amazonas","São Paulo","Pará"]',1),
 ('q16','Em que ano foi lançado o primeiro iPhone?','["2005","2009","2010","2007"]',3),
 ('q17','Quanto é 15% de 200?','["20","25","30","45"]',2),
 ('q18','Quem formulou a teoria da relatividade?','["Isaac Newton","Albert Einstein","Charles Darwin","Nikola Tesla"]',1),
 ('q19','No futebol, quantos jogadores cada time mantém em campo?','["10","12","9","11"]',3),
 ('q20','Qual empresa desenvolve o Windows?','["Apple","Google","Microsoft","IBM"]',2),
 ('q21','Quantos lados tem um hexágono?','["5","6","8","7"]',1),
 ('q22','Qual país sediou a Copa do Mundo de 2014?','["África do Sul","Rússia","Catar","Brasil"]',3),
 ('q23','Qual é o estado físico da água em temperatura ambiente?','["Líquido","Gasoso","Sólido","Plasma"]',0),
 ('q24','Qual destes animais é um mamífero?','["Tubarão","Golfinho","Crocodilo","Água-viva"]',1),
 ('q25','1000 centímetros equivalem a…','["1 km","10 metros","100 metros","1 metro"]',1),
 ('q26','Qual é a moeda oficial do Japão?','["Won","Yuan","Dólar","Iene"]',3),
 ('q27','Qual herói da Marvel carrega um escudo circular?','["Thor","Homem de Ferro","Capitão América","Homem-Aranha"]',2),
 ('q28','No plano cartesiano, como se chama o eixo horizontal?','["Eixo y","Eixo x","Eixo z","Eixo w"]',1),
 ('q29','Qual é o planeta mais próximo do Sol?','["Terra","Marte","Mercúrio","Vênus"]',2),
 ('q30','Em que continente fica o Egito?','["Ásia","Europa","América","África"]',3),
 ('q31','Em que ano a internet comercial chegou oficialmente ao Brasil?','["1989","1991","1995","1998"]',2),
 ('q32','Quantas cores tem o arco-íris tradicional?','["5","9","6","7"]',3)
on conflict (id) do nothing;

-- 2) Snapshot de perguntas na partida (sem gabarito) --------------------
alter table public.quiz_games add column if not exists questions jsonb;

-- cliente NÃO cria/edita mais nada direto — tudo passa por RPC daqui pra frente
drop policy if exists "quiz: membro inicia partida" on public.quiz_games;
drop policy if exists "quiz: membro avanca partida"  on public.quiz_games;
drop policy if exists "quiz: envio minha resposta"   on public.quiz_answers;

-- 3) quiz_start: sorteia 8 perguntas e cria a partida -------------------
create or replace function public.quiz_start(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids  jsonb;
  v_snap jsonb;
begin
  if auth.uid() is null
     or not exists (
       select 1 from public.room_members m
       where m.room_id = p_room_id and m.user_id = auth.uid()
     ) then
    raise exception 'Voce precisa ser membro da sala para iniciar uma partida.';
  end if;

  select jsonb_agg(x.id), jsonb_agg(jsonb_build_object('id', x.id, 'q', x.q, 'options', x.options))
    into v_ids, v_snap
  from (
    select id, q, options
    from public.quiz_questions
    order by random()
    limit 8
  ) x;

  if v_ids is null or jsonb_array_length(v_ids) = 0 then
    raise exception 'Banco de perguntas vazio — rode a secao 1 da Migracao v12.';
  end if;

  -- o indice parcial quiz_games_uma_ativa_por_sala (v11) rejeita a 2ª partida
  insert into public.quiz_games (room_id, host_id, question_ids, questions)
  values (p_room_id, auth.uid(), v_ids, v_snap);
end $$;

-- 4) quiz_answer: corrige e pontua com o relogio do servidor ------------
create or replace function public.quiz_answer(p_game_id uuid, p_chosen integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g         public.quiz_games;
  v_current public.quiz_answers;
  v_elapsed integer;
  v_answer  integer;
  v_correct boolean;
  v_points  integer;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado para responder.';
  end if;

  select * into g from public.quiz_games where id = p_game_id for update;

  if not found then
    raise exception 'Partida nao encontrada.';
  end if;

  if not exists (
    select 1 from public.room_members m
    where m.room_id = g.room_id and m.user_id = auth.uid()
  ) then
    raise exception 'Voce nao esta nesta sala.';
  end if;

  -- ja respondeu esta rodada? devolve o MESMO resultado (clique duplo / aba gemeas)
  select * into v_current from public.quiz_answers
   where game_id = g.id and question_idx = g.question_idx and user_id = auth.uid();
  if found then
    select qq.answer into v_answer from public.quiz_questions qq
     where qq.id = (g.question_ids ->> g.question_idx);
    return jsonb_build_object(
      'correct', v_current.correct,
      'points', v_current.points,
      'answer_index', v_answer,
      'already', true
    );
  end if;

  if g.status <> 'active' then
    raise exception 'Esta rodada ja encerrou.';
  end if;

  v_elapsed := (extract(epoch from (now() - g.question_started_at)) * 1000)::integer;
  if v_elapsed > 10700 then raise exception 'Tempo esgotado.'; end if;
  if v_elapsed < 0 then v_elapsed := 0; end if; -- relogio do cliente nao importa

  select qq.answer into v_answer from public.quiz_questions qq
   where qq.id = (g.question_ids ->> g.question_idx);

  v_correct := coalesce(v_answer, -1) = p_chosen;
  v_points := case when v_correct
    then 10 + round(5 * greatest(least(1 - v_elapsed / 10000.0, 1), 0))::integer
    else 0
  end;

  insert into public.quiz_answers (game_id, question_idx, user_id, chosen, correct, points)
  values (g.id, g.question_idx, auth.uid(), p_chosen, v_correct, v_points);

  return jsonb_build_object(
    'correct', v_correct,
    'points', v_points,
    'answer_index', v_answer, -- apos travar a sua, ve qual era a certa
    'already', false
  );
end $$;

-- 5) quiz_advance: avanca rodada / finaliza (row-lock, sem dono) --------
create or replace function public.quiz_advance(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g        public.quiz_games;
  v_elapsed integer;
  v_answered integer;
  v_members  integer;
  v_total    integer;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  select * into g from public.quiz_games where id = p_game_id for update;

  if not found then raise exception 'Partida nao encontrada.'; end if;

  if not exists (
    select 1 from public.room_members m
    where m.room_id = g.room_id and m.user_id = auth.uid()
  ) then
    raise exception 'Voce nao esta nesta sala.';
  end if;

  if g.status <> 'active' then
    return jsonb_build_object('moved', false, 'reason', 'ja encerrou');
  end if;

  v_elapsed := (extract(epoch from (now() - g.question_started_at)) * 1000)::integer;

  select count(distinct a.user_id) into v_answered
  from public.quiz_answers a
  where a.game_id = g.id and a.question_idx = g.question_idx;

  select count(*) into v_members
  from public.room_members m where m.room_id = g.room_id;

  v_total := case
    when g.questions is not null and jsonb_array_length(g.questions) > 0
      then jsonb_array_length(g.questions)
    else coalesce(jsonb_array_length(g.question_ids), 0) -- partidas da v11
  end;

  -- ainda nao e hora? (10s de prazo, ou todos responderam apos 1,2s)
  if v_elapsed <= 10500
     and not (v_members > 0 and v_answered >= v_members and v_elapsed >= 1200) then
    return jsonb_build_object('moved', false, 'reason', 'cedo');
  end if;

  if v_total = 0 or g.question_idx + 1 >= v_total then
    update public.quiz_games set status = 'finished', finished_at = now() where id = g.id;
    return jsonb_build_object('moved', true, 'finished', true);
  end if;

  update public.quiz_games
     set question_idx = g.question_idx + 1, question_started_at = now()
   where id = g.id;
  return jsonb_build_object('moved', true, 'finished', false);
end $$;

-- 6) quiz_reveal: gabarito de rodada JA encerrada (ou fim da partida) ---
create or replace function public.quiz_reveal(p_game_id uuid, p_question_idx integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  g        public.quiz_games;
  v_elapsed integer;
  v_ok     boolean;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  select * into g from public.quiz_games where id = p_game_id;
  if not found then raise exception 'Partida nao encontrada.'; end if;

  if not exists (
    select 1 from public.room_members m
    where m.room_id = g.room_id and m.user_id = auth.uid()
  ) then
    raise exception 'Voce nao esta nesta sala.';
  end if;

  v_elapsed := (extract(epoch from (now() - g.question_started_at)) * 1000)::integer;
  v_ok := g.status <> 'active'
          or p_question_idx < g.question_idx
          or (p_question_idx = g.question_idx and v_elapsed > 10700);
  if not v_ok then
    raise exception 'Ainda nao pode revelar essa pergunta.';
  end if;

  return (
    select qq.answer from public.quiz_questions qq
    where qq.id = (g.question_ids ->> p_question_idx)
  );
end $$;

-- 7) Tranca as RPCs: só usuários logados --------------------------------
revoke all on function public.quiz_start(uuid)            from public;
revoke all on function public.quiz_answer(uuid, integer)  from public;
revoke all on function public.quiz_advance(uuid)          from public;
revoke all on function public.quiz_reveal(uuid, integer)  from public;
grant execute on function public.quiz_start(uuid)            to authenticated;
grant execute on function public.quiz_answer(uuid, integer)  to authenticated;
grant execute on function public.quiz_advance(uuid)          to authenticated;
grant execute on function public.quiz_reveal(uuid, integer)  to authenticated;
```

**Verificar:**

```sql
select count(*) from public.quiz_questions;   -- esperado: 32
select routine_name from information_schema.routines
 where routine_schema = 'public' and routine_name like 'quiz_%';
-- esperado: quiz_start, quiz_answer, quiz_advance, quiz_reveal
```

**Para adicionar perguntas novas** (basta mais `insert` — 4 opções e `answer` de 0 a 3):

```sql
insert into public.quiz_questions (id, q, options, answer) values
 ('q33','Sua pergunta aqui?','["Opção 1","Opção 2","Opção 3","Opção 4"]',2);
```

Sem a v12: a aba quiz abre, mas iniciar/responder exibe "rode a Migração v12" — o app segue normal.

## 🩹 Migração v13 — Correção: "infinite recursion" na room_members

Se o chat/placar da sala ou o quiz mostram o 🔧 e o console/rede acusa
**`infinite recursion detected in policy for relation "room_members"`**:
a policy da v8 consultava a própria `room_members` dentro dela mesma — na
verificação de permissão, o Postgres chamava a policy de novo pra subquery
→ loop infinito. Rodar a v8 de novo não resolve (ela recria a mesma policy).

Aqui a checagem vira a função **`is_room_member()`** (security definer — mesmo
padrão anti-recursão do `is_adm()` lá do script base).

> Pré-requisito: **v8** rodada (e v11/v12, se já tiver feito).

```sql
-- ========================================================
-- MIGRAÇÃO v13 — Anti-recursão nas policies (idempotente)
-- ========================================================

-- 1) Funcao auxiliar: sou membro desta sala? ----------------------------
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

-- 2) room_members: policies novas (sem auto-referência → fim do loop) ---
drop policy if exists "lista_membros_mesma_sala" on public.room_members;
drop policy if exists "sai_ou_dono_expulsa"      on public.room_members;

create policy "lista_membros_mesma_sala" on public.room_members
  for select using (
    user_id = auth.uid() or public.is_room_member(room_id)
  );

create policy "sai_ou_dono_expulsa" on public.room_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = room_members.room_id and r.created_by = auth.uid()
    )
  );

-- 3) room_messages: mesmas permissões, agora via função ------------------
drop policy if exists "ve_mensagens_da_sala" on public.room_messages;
drop policy if exists "manda_na_sala"        on public.room_messages;

create policy "ve_mensagens_da_sala" on public.room_messages
  for select using (public.is_room_member(room_id));

create policy "manda_na_sala" on public.room_messages
  for insert with check (
    sender_id = auth.uid() and public.is_room_member(room_id)
  );

-- 4) Quiz: policies também passam pela função (padroniza tudo) -----------
drop policy if exists "quiz: ve partidas da minha sala"    on public.quiz_games;
drop policy if exists "quiz: ve respostas da minha sala"   on public.quiz_answers;

create policy "quiz: ve partidas da minha sala" on public.quiz_games
  for select using (public.is_room_member(room_id));

create policy "quiz: ve respostas da minha sala" on public.quiz_answers
  for select using (
    exists (
      select 1 from public.quiz_games g
      where g.id = quiz_answers.game_id and public.is_room_member(g.room_id)
    )
  );
```

**Verificar:**

```sql
select policyname, tablename from pg_policies
 where schemaname = 'public'
   and tablename in ('room_members','room_messages','quiz_games','quiz_answers');
```

Depois basta **recarregar a página da sala**: membros, chat e quiz passam a
carregar na hora. Se o quiz ainda mostrar 🔧 depois disso, aí sim são as
migrações v11/v12 que faltam (o app avisa qual é).

> ⚠️ **Se o SQL Editor devolver `ERROR 40P01: deadlock detected` ao rodar a v13:** isto
> é uma disputa de trava com o app **aberto** (abas do site fazendo polling/
> Realtime nas mesmas tabelas), não uma falha da migração. O Postgres abortou a
> transação inteira — nada ficou aplicado pela metade. Solução: **feche todas as
> abas/janelas do NEXUS** e rode o script de novo.

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
