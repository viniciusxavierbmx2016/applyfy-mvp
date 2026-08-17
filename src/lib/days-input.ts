/* Entrada humana de PRAZO DE ACESSO — a régua única dos três modais.

   ⚠️ Este número decide POR QUANTO TEMPO o aluno tem o curso que pagou. Errar
   aqui é aluno perdendo acesso antes da hora, ou ganhando mais do que comprou.

   ─── Por que NÃO é mais um <input type="number"> ───────────────────────────
   O input numérico do navegador aceita **apenas o separador decimal da locale**
   e **descarta o outro** silenciosamente — e o descarte cola os dígitos
   vizinhos. Medido:

       locale pt-BR:  "30,5" → 31 ✅     "30.5" → 305 🔴
       locale en-US:  "30.5" → 31 ✅     "30,5" → 305 🔴

   Ou seja: o MESMO código dá 31 ou 305 dependendo de onde o produtor está. Não
   é ajustável por handler — o caractere é descartado pelo navegador antes de
   qualquer código nosso ver a tecla. Por isso o campo virou `type="text"` com
   `inputMode="numeric"` (mantém o teclado numérico no celular) e normalização
   PRÓPRIA, que trata "," e "." como o mesmo separador em qualquer locale.
   O preço declarado: perdem-se as setas nativas.

   ─── Por que o estado é TEXTO, e não `number | ""` ────────────────────────
   Estado numérico não consegue guardar "30," — o que o usuário está escrevendo.
   Ao redesenhar o campo com o número, a vírgula some, e a tecla seguinte cola:
   "30," → exibe "30" → "5" → **305**. O mesmo bug por outro caminho. O texto
   guarda o rascunho; o número só existe quando **resolvido**
   (`resolveAccessDays`), e é `null` enquanto não houver um. */

export const MIN_ACCESS_DAYS = 1;
export const MAX_ACCESS_DAYS = 36500; // ~100 anos

/* O que o campo EXIBE enquanto se digita. Não clampa e não arredonda: mexer no
   texto no meio da digitação faz o valor "saltar" na frente do usuário.
   Mantém dígitos e **um** separador; descarta o resto (letras, sinais, espaço).
   String vazia é resultado válido — é assim que o backspace limpa o campo. */
export function sanitizeDaysText(raw: string): string {
  const limpo = raw.replace(/[^\d.,]/g, "");
  const i = limpo.search(/[.,]/);
  if (i === -1) return limpo;
  // do primeiro separador em diante, só dígitos (mata "30,5,7")
  return limpo.slice(0, i + 1) + limpo.slice(i + 1).replace(/[.,]/g, "");
}

/* O número que vai para o servidor. `null` = não há número (campo vazio, ou só
   um separador solto) — e quem chama DEVE bloquear o envio, nunca chutar um
   padrão: gravar prazo a partir de campo vazio é conceder acesso que ninguém
   pediu. Aqui, sim, arredonda e clampa. */
export function resolveAccessDays(texto: string): number | null {
  const t = sanitizeDaysText(texto).replace(",", ".");
  if (t === "" || t === ".") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_ACCESS_DAYS, Math.max(MIN_ACCESS_DAYS, Math.round(n)));
}

/* Para o `onBlur`: assim que o campo perde o foco, o rascunho vira o número que
   de fato será gravado. O produtor vê "31" antes de salvar, em vez de descobrir
   no banco que "30,5" virou outra coisa. Campo vazio continua vazio. */
export function normalizeDaysOnBlur(texto: string): string {
  const n = resolveAccessDays(texto);
  return n === null ? "" : String(n);
}
