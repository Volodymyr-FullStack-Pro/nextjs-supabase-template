set lock_timeout = '5s';
set statement_timeout = '60s';

-- Новая функция закрыта для ролей API, пока миграция сама не выдаст grant.
-- Первая миграция (default_privileges) снимала execute с PUBLIC «in schema public» — такая форма не действует:
-- право PUBLIC на функции глобальное, а права по умолчанию для схемы к нему только добавляются. Итог до этой
-- миграции: новую функцию в public мог вызвать аноним через /rest/v1/rpc/<имя>.
-- Форма без «in schema» снимает глобальное право: функции, которые postgres создаёт после этой миграции в любой
-- схеме, не исполняет никто, кроме владельца (в public — ещё service_role, его право выдаёт сам Supabase).
-- Расширения это не затрагивает: их функции создаёт supabase_admin.
alter default privileges for role postgres revoke execute on functions from public;
