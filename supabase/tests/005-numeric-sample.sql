-- Образец поведения numeric в денежной колонке: что база отвергает сама, а что молча делает за приложение.
-- У суммы есть валюта: колонка обязательна, значения по умолчанию нет, формат — три заглавные буквы (ISO 4217).
begin;
select plan(9);

select tests.create_supabase_user('grace');
select tests.authenticate_as('grace', 'aal2');

insert into public.notes (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('grace'), 'точная сумма', '1234567890123456.78', 'EUR', gen_random_uuid());
select is(
  (select amount::text from public.notes where title = 'точная сумма'),
  '1234567890123456.78',
  '16 значащих цифр хранятся и читаются текстом без потери'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'NaN', 'NaN'::numeric, 'EUR', gen_random_uuid()) $$,
  '23514',
  null,
  'NaN отвергается ограничением notes_amount_finite'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'переполнение', '99999999999999999.00', 'EUR', gen_random_uuid()) $$,
  '22003',
  null,
  '17 целых цифр не помещаются в numeric(18,2): переполнение, а не обрезание'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'бесконечность', 'Infinity'::numeric, 'EUR', gen_random_uuid()) $$,
  '22003',
  null,
  'бесконечность в колонку с масштабом не помещается (у numeric без масштаба её отвергает ограничение)'
);

insert into public.notes (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('grace'), 'половина', '2.665', 'EUR', gen_random_uuid());
select is(
  (select amount::text from public.notes where title = 'половина'),
  '2.67',
  'при записи в колонку с масштабом Postgres округляет сам, от нуля: 2.665 → 2.67 (приложение к чётному дало бы 2.66) — округлять или отклонять до записи'
);

insert into public.notes (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('grace'), 'отрицательная половина', '-2.665', 'EUR', gen_random_uuid());
select is(
  (select amount::text from public.notes where title = 'отрицательная половина'),
  '-2.67',
  'отрицательное значение округляется симметрично, от нуля'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, client_request_id)
     values (tests.get_supabase_uid('grace'), 'без валюты', '1', gen_random_uuid()) $$,
  '23502',
  null,
  'сумма без валюты не записывается: значения по умолчанию у currency нет'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'строчные буквы', '1', 'eur', gen_random_uuid()) $$,
  '23514',
  null,
  'валюта строчными буквами отвергается ограничением notes_currency_format'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'четыре буквы', '1', 'EURO', gen_random_uuid()) $$,
  '23514',
  null,
  'валюта не из трёх букв отвергается'
);

select * from finish();
rollback;
