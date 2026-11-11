import postgres from 'postgres' // expect: local/direct-database

export const db = postgres('postgres://localhost/postgres')
