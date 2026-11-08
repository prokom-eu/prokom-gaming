import type { PushContent } from './content'

/** A device as web-push needs it. */
export type PushTarget = { id: number; endpoint: string; p256dh: string; auth: string }

export type PushOutcome =
  | { id: number; outcome: 'ok' }
  /** 404/410 from the push service: the subscription is dead — delete it (ADR-G010 pt 4). */
  | { id: number; outcome: 'gone' }
  | { id: number; outcome: 'failed'; statusCode: number | null }

export type SendPush = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) => Promise<unknown>

const statusOf = (error: unknown): number | null =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode: unknown }).statusCode) || null
    : null

/** Sends one push to each device, one after another; never throws — the outcome says. */
export async function deliverPush(
  targets: readonly PushTarget[],
  content: PushContent,
  send: SendPush,
): Promise<PushOutcome[]> {
  const payload = JSON.stringify(content)
  const outcomes: PushOutcome[] = []
  for (const t of targets) {
    try {
      await send({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload)
      outcomes.push({ id: t.id, outcome: 'ok' })
    } catch (error) {
      const statusCode = statusOf(error)
      outcomes.push(
        statusCode === 404 || statusCode === 410
          ? { id: t.id, outcome: 'gone' }
          : { id: t.id, outcome: 'failed', statusCode },
      )
    }
  }
  return outcomes
}
