/** Ожидаемый исход операции: либо значение, либо ошибка домена. Неожиданные ошибки (сеть, база) бросаются исключением. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
