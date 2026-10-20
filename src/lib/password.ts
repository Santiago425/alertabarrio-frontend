// Mismas reglas que valida el backend (app/security.py -> password_problems)
export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "8 caracteres o más", test: (p) => p.length >= 8 },
  { label: "Una mayúscula", test: (p) => /[A-ZÑÁÉÍÓÚ]/.test(p) },
  { label: "Una minúscula", test: (p) => /[a-zñáéíóú]/.test(p) },
  { label: "Un número", test: (p) => /\d/.test(p) },
  { label: "Un símbolo (* . ! #)", test: (p) => /[^\w\s]|_/.test(p) },
];

export const passwordBytes = (p: string) => new TextEncoder().encode(p).length;

export function passwordStrength(p: string): { score: number; label: string; color: string; valid: boolean } {
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).length;
  const valid = passed === PASSWORD_RULES.length && passwordBytes(p) <= 72;
  const bonus = p.length >= 12 ? 1 : 0;
  const score = Math.min(5, passed + bonus - (valid ? 0 : 1));
  if (!p) return { score: 0, label: "", color: "#e5e9f2", valid };
  if (!valid) return { score: Math.max(1, score), label: "Débil", color: "#e11d48", valid };
  if (bonus) return { score: 5, label: "Muy segura", color: "#16a34a", valid };
  return { score: 4, label: "Segura", color: "#65a30d", valid };
}
