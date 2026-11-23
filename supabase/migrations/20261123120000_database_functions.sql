-- The service passes limits from packages/shared PLAN_LIMITS after reading the account plan.
-- Counter functions serialize on the parent row so simultaneous requests see the new count.
create function public.create_project(p_owner_id text, p_name text, p_public_key text, p_max_projects integer)
returns public.projects
language plpgsql volatile security invoker set search_path = ''
as $$
declare result public.projects;
begin
  if p_max_projects is null or p_max_projects < 1 then
    raise exception 'invalid project limit' using errcode = '22023';
  end if;
  perform 1 from public.accounts where clerk_user_id = p_owner_id for update;
  if not found then
    raise exception 'account not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.projects where owner_id = p_owner_id) >= p_max_projects then
    raise exception 'project limit reached' using errcode = 'P0001';
  end if;
  insert into public.projects (owner_id, name, public_key)
    values (p_owner_id, p_name, p_public_key) returning * into result;
  insert into public.widget_configs (project_id) values (result.id);
  return result;
end;
$$;

create function public.reserve_knowledge_source(
  p_project_id uuid, p_title text, p_type text, p_storage_key text, p_max_sources integer
)
returns public.knowledge_sources
language plpgsql volatile security invoker set search_path = ''
as $$
declare result public.knowledge_sources;
begin
  if p_max_sources is null or p_max_sources < 1 then
    raise exception 'invalid source limit' using errcode = '22023';
  end if;
  perform 1 from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.knowledge_sources where project_id = p_project_id) >= p_max_sources then
    raise exception 'knowledge source limit reached' using errcode = 'P0001';
  end if;
  insert into public.knowledge_sources (project_id, title, type, storage_key, status)
    values (p_project_id, p_title, p_type, p_storage_key,
      case when p_type = 'text' then 'processing' else 'uploading' end)
    returning * into result;
  return result;
end;
$$;

create function public.consume_message(p_project_id uuid, p_max_messages integer)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare result integer;
declare current_period date := pg_catalog.date_trunc('month', pg_catalog.now())::date;
begin
  if p_max_messages is null or p_max_messages < 1 then
    raise exception 'invalid message limit' using errcode = '22023';
  end if;
  update public.projects
     set period_start = current_period,
         messages_used = case when period_start < current_period then 1 else messages_used + 1 end
   where id = p_project_id
     and (period_start < current_period or messages_used < p_max_messages)
   returning messages_used into result;
  if result is null then
    if not exists (select 1 from public.projects where id = p_project_id) then
      raise exception 'project not found' using errcode = 'P0002';
    end if;
    raise exception 'message limit reached' using errcode = 'P0001';
  end if;
  return result;
end;
$$;

create function public.save_chat_turn(
  p_project_id uuid, p_visitor_id text, p_conversation_id uuid,
  p_visitor_message text, p_bot_reply text
)
returns uuid
language plpgsql volatile security invoker set search_path = ''
as $$
declare result uuid;
begin
  if p_conversation_id is null then
    insert into public.conversations (project_id, visitor_id)
      values (p_project_id, p_visitor_id) returning id into result;
  else
    select id into result from public.conversations
      where id = p_conversation_id and project_id = p_project_id and visitor_id = p_visitor_id;
    if result is null then
      raise exception 'conversation not found' using errcode = 'P0002';
    end if;
  end if;
  insert into public.messages (conversation_id, role, body)
    values (result, 'visitor', p_visitor_message), (result, 'bot', p_bot_reply);
  return result;
end;
$$;

create function public.match_chunks(p_project_id uuid, p_embedding extensions.vector(1536), p_match_count integer default 5)
returns table (id uuid, source_id uuid, content text, similarity double precision)
language sql stable security invoker set search_path = ''
as $$
  select c.id, c.source_id, c.content,
         (1 - (c.embedding operator(extensions.<=>) p_embedding))::double precision as similarity
    from public.knowledge_chunks c
    join public.knowledge_sources s on s.id = c.source_id and s.project_id = c.project_id
   where c.project_id = p_project_id and s.status = 'ready'
   order by c.embedding operator(extensions.<=>) p_embedding
   limit least(greatest(coalesce(p_match_count, 5), 0), 5)
$$;

create function public.owner_activity()
returns table (project_count bigint, conversation_count bigint, message_count bigint)
language sql stable security invoker set search_path = ''
as $$
  select (select count(*) from public.projects p
           where p.owner_id = (select auth.jwt() ->> 'sub')),
         (select count(*) from public.conversations c
           where c.project_id in (select private.owned_project_ids())),
         (select count(*) from public.messages m
           where m.conversation_id in (select private.owned_conversation_ids()))
$$;

revoke all on function public.create_project(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.reserve_knowledge_source(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.consume_message(uuid, integer) from public, anon, authenticated;
revoke all on function public.save_chat_turn(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.match_chunks(uuid, extensions.vector, integer) from public, anon, authenticated;
revoke all on function public.owner_activity() from public, anon, service_role;
grant execute on function public.create_project(text, text, text, integer),
  public.reserve_knowledge_source(uuid, text, text, text, integer),
  public.consume_message(uuid, integer),
  public.save_chat_turn(uuid, text, uuid, text, text),
  public.match_chunks(uuid, extensions.vector, integer) to service_role;
grant usage on schema extensions to service_role;
grant execute on function public.owner_activity() to authenticated;
