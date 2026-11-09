/**
 * Instead of a light colour choice (runda v3 §1.4, ADR-G014): every case, AIO and fan in the
 * builds is ARGB, so the colour is the customer's to set. Text 1:1 from PREMIUM §1.4.
 */
export const ARGB_NOTE =
  'Podświetlenie ARGB: kolor i efekty ustawisz sam, przyciskiem na obudowie albo w programie. Chcesz konkretny kolor od razu? Napisz w uwagach, ustawimy go przed wysyłką.'

export function ArgbNote({ className }: { className?: string }) {
  return <p className={className}>{ARGB_NOTE}</p>
}
