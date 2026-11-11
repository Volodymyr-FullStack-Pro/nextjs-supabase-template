set lock_timeout = '5s';
set statement_timeout = '60s';

-- Образец прав на таблицу: вставка и правка выдаются роли API по колонкам, а не на таблицу целиком.
-- Табличный grant insert, update позволял пользователю через Data API задать created_at задним числом, выбрать
-- свой id и поменять id, владельца и время создания у существующей строки. Теперь клиент задаёт и меняет
-- только то, что вводит сам; id и created_at ставит база, owner_id задаётся при вставке (политика сверяет его
-- с auth.uid()) и больше не меняется.
-- revoke (колонка) после табличного grant не действует, поэтому табличные права снимаются целиком.
revoke insert, update on public.notes from authenticated;
grant insert (owner_id, title, amount) on public.notes to authenticated;
grant update (title, amount) on public.notes to authenticated;
