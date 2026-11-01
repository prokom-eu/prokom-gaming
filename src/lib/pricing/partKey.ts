/**
 * Key of a power-level part shared by every level that uses the same model (panel spec §17): one
 * price observation then updates the cost everywhere the part is. Derived from the role and the
 * internal model, so the same model in two levels gets the same key without manual work.
 */
export function partKey(role: string, internalModel: string): string {
  const slug = internalModel
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${role}-${slug}`.slice(0, 120)
}
