set lock_timeout = '5s';
set statement_timeout = '60s';

-- Образец для денежных колонок: numeric принимает 'NaN' и 'Infinity', а сумма с ними превращает любой итог в NaN
-- или бесконечность и ломает показ. У колонки с масштабом бесконечность отвергает сам тип, у numeric без
-- ограничения — только эта проверка. Приложение отвергает такие значения раньше; ограничение закрывает путь
-- через импорт, функции базы и SQL-редактор.
alter table public.notes
  add constraint notes_amount_finite
  check (amount <> 'NaN'::numeric and abs(amount) <> 'Infinity'::numeric) not valid;
-- Таблица-пример без данных: проверка мгновенна. На живой таблице validate — отдельной миграцией.
-- squawk-ignore constraint-missing-not-valid
alter table public.notes validate constraint notes_amount_finite;
