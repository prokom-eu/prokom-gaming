/** Length beats composition rules (decision 15.10.2026): min. 12 characters, no special-character requirement. */
export const PASSWORD_MIN_LENGTH = 12

type PasswordCheckOptions = {
  /** On update Payload treats `''` as "keep the current password", so it is not a new password. */
  emptyMeansUnchanged?: boolean
}

/**
 * Returns a user-facing problem with the password, or `null` when it is acceptable.
 * `undefined`/`null` means the operation does not change the password.
 */
export function passwordProblem(
  password: unknown,
  { emptyMeansUnchanged = false }: PasswordCheckOptions = {},
): string | null {
  if (password === undefined || password === null) return null
  if (emptyMeansUnchanged && password === '') return null
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`
  }
  return null
}
