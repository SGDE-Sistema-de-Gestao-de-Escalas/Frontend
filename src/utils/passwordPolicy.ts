export const PASSWORD_MIN_LENGTH = 10;

export const PASSWORD_RULE_HINT = `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres, com letras maiúsculas, minúsculas e números.`;

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return "A nova password é obrigatória.";
  }

  const meetsRule =
    password.length >= PASSWORD_MIN_LENGTH &&
    /\p{Lu}/u.test(password) &&
    /\p{Ll}/u.test(password) &&
    /\p{N}/u.test(password);

  if (!meetsRule) {
    return `A nova password deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres, com letras maiúsculas, minúsculas e números.`;
  }

  return null;
}
