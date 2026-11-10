-- Образец поведения numeric в денежной колонке: что база отвергает сама, а что молча делает за приложение.
begin;
select plan(5);

select tests.create_supabase_user('grace');
select tests.authenticate_as('grace', 'aal2');

insert into public.notes (owner_id, title, amount)
values (tests.get_supabase_uid('grace'), 'точная сумма', '1234567890123456.78');
select is(
  (select amount::text from public.notes where title = 'точная сумма'),
  '1234567890123456.78',
  '16 значащих цифр хранятся и читаются текстом без потери'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount)
     values (tests.get_supabase_uid('grace'), 'NaN', 'NaN'::numeric) $$,
  '23514',
  null,
  'NaN отвергается ограничением notes_amount_finite'
);

select throws_ok(
  $$ insert into public.notes (owner_id, title, amount)
     values (tests.get_supabase_uid('grace'), 'переполнение', '99999999999999999.00') $$,
  '22003',
  null,
  '17 целых цифр не помещаются в numeric(18,2): переполнение, а не обрезание'
);

insert into public.notes (owner_id, title, amount)
values (tests.get_supabase_uid('grace'), 'половина', '2.665');
select is(
  (select amount::text from public.notes where title = 'половина'),
  '2.67',
  'при записи в колонку с масштабом Postgres округляет сам, от нуля: 2.665 → 2.67 (приложение к чётному дало бы 2.66) — округлять или отклонять до записи'
);

insert into public.notes (owner_id, title, amount)
values (tests.get_supabase_uid('grace'), 'отрицательная половина', '-2.665');
select is(
  (select amount::text from public.notes where title = 'отрицательная половина'),
  '-2.67',
  'отрицательное значение округляется симметрично, от нуля'
);

select * from finish();
rollback;
