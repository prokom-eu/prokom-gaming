// Problem reports from the account (ADR-G005, board Konto „Zgłoś problem”). Pure — shared by the
// collection, the API route and the form.

/** Chips of the board, in its order. */
export const TICKET_CATEGORIES = [
  { value: 'stutter', label: 'Gra się zacina' },
  { value: 'no_power', label: 'Nie włącza się' },
  { value: 'noise_heat', label: 'Głośno albo gorąco' },
  { value: 'other', label: 'Coś innego' },
] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]['value']

export const TICKET_STATUSES = [
  { value: 'new', label: 'Nowe' },
  { value: 'in_progress', label: 'W toku' },
  { value: 'resolved', label: 'Rozwiązane' },
  { value: 'closed', label: 'Zamknięte' },
] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]['value']

/** „Opisz w dwóch zdaniach” — generous, but bounded. */
export const TICKET_DESCRIPTION_MAX = 2000

export function ticketCategoryLabel(value: string): string {
  return TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function ticketStatusLabel(value: string): string {
  return TICKET_STATUSES.find((s) => s.value === value)?.label ?? value
}
