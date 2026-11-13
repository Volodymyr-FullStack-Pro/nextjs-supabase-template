begin;
select plan(9);

select tests.create_supabase_user('grace');
select tests.authenticate_as('grace', 'aal2');

insert into public.notes (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('grace'), 'точная сумма', '1234567890123456.78', 'EUR', gen_random_uuid());
select is(
  (select amount::text from public.notes where title = 'точная сумма'),
  '1234567890123456.78',
  '16 significant digits are stored and read back as text without loss'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'NaN', 'NaN'::numeric, 'EUR', gen_random_uuid()) $$,
  '23514',
  null,
  'NaN is rejected by the notes_amount_finite constraint'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'переполнение', '99999999999999999.00', 'EUR', gen_random_uuid()) $$,
  '22003',
  null,
  '17 integer digits do not fit numeric(18,2): an overflow, not truncation'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'бесконечность', 'Infinity'::numeric, 'EUR', gen_random_uuid()) $$,
  '22003',
  null,
  'infinity does not fit a column with a scale (for numeric without a scale a constraint rejects it)'
);

insert into public.notes (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('grace'), 'половина', '2.665', 'EUR', gen_random_uuid());
select is(
  (select amount::text from public.notes where title = 'половина'),
  '2.67',
  'a column with a scale makes Postgres round on its own, away from zero: 2.665 → 2.67 (half-even in the app would give 2.66), so round or reject before writing'
);

insert into public.notes (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('grace'), 'отрицательная половина', '-2.665', 'EUR', gen_random_uuid());
select is(
  (select amount::text from public.notes where title = 'отрицательная половина'),
  '-2.67',
  'a negative value rounds symmetrically, away from zero'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, client_request_id)
     values (tests.get_supabase_uid('grace'), 'без валюты', '1', gen_random_uuid()) $$,
  '23502',
  null,
  'an amount without a currency is not written: currency has no default'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'строчные буквы', '1', 'eur', gen_random_uuid()) $$,
  '23514',
  null,
  'a lowercase currency is rejected by the notes_currency_format constraint'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('grace'), 'четыре буквы', '1', 'EURO', gen_random_uuid()) $$,
  '23514',
  null,
  'a currency that is not three letters is rejected'
);

select * from finish();
rollback;
