import type { PushTarget } from './deliver'
import { CHANNELS, KIND_ROLES, PUSH_KINDS, type NotifyKind, type PushKind } from './kinds'

export type Subscription = PushTarget & {
  kinds: readonly string[]
  disabled: boolean
  role: 'admin' | 'serwis'
}

/** Devices that get a push of `kind`: switched on, chose it, and their owner's role may see it. */
export function pushTargets<T extends Subscription>(subs: readonly T[], kind: NotifyKind): T[] {
  if (!CHANNELS[kind].push || !(PUSH_KINDS as readonly string[]).includes(kind)) return []
  const roles: readonly string[] = KIND_ROLES[kind as PushKind]
  return subs.filter((s) => !s.disabled && s.kinds.includes(kind) && roles.includes(s.role))
}
