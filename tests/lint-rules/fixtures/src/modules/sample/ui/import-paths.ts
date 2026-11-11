import { actionClient } from '@/shared/lib/./safe-action' // expect: local/import-path
import { verifySession } from '@/shared/lib/./session' // expect: local/import-path

import { outside } from '../../../../outside' // expect: local/import-path
import { closeEntry } from './../ui/good-actions' // expect: local/import-path

export type Money = import('@/shared/domain/./money').Money // expect: local/import-path
export { closeEntry as closeAgain } from '../ui/../ui/good-actions' // expect: local/import-path
export * from '../../sample/./ui/good-close-button' // expect: local/import-path

export const lazyTable = () => import('./../ui/good-entries-table') // expect: local/import-path
export const unverified = [actionClient, verifySession, outside, closeEntry]
