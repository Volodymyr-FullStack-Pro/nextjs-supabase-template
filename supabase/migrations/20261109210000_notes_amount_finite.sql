set lock_timeout = '5s';
set statement_timeout = '60s';

-- Образец для денежных колонок: numeric принимает 'NaN', а сумма с NaN превращает любой итог в NaN и ломает
-- показ. Ограничение закрывает путь через импорт, функции базы и SQL-редактор; приложение отвергает NaN раньше.
alter table public.notes
  add constraint notes_amount_finite check (amount <> 'NaN'::numeric) not valid;
-- Таблица-пример без данных: проверка мгновенна. На живой таблице validate — отдельной миграцией.
-- squawk-ignore constraint-missing-not-valid
alter table public.notes validate constraint notes_amount_finite;
