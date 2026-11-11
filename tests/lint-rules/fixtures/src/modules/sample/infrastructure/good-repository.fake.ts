type StoredEntry = { id: string; amount: string; ownerId: string }

export function fakeEntries(seed: StoredEntry[] = []) {
  const rows = [...seed]
  return {
    listForUser: (userId: string) =>
      Promise.resolve(
        rows
          .filter((row) => row.ownerId === userId)
          .map(({ ownerId: _ownerId, ...entry }) => entry),
      ),
  }
}
