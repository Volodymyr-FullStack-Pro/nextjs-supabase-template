-- Data API закрыт по умолчанию: новые таблицы, последовательности и функции в public не получают права
-- anon и authenticated автоматически. Каждая миграция таблицы выдаёт их явно рядом с политиками RLS.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, public;
