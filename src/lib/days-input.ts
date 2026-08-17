/* Entrada humana de PRAZO DE ACESSO — a régua única dos três modais.

   ⚠️ Este número decide POR QUANTO TEMPO o aluno tem o curso que pagou. Errar
   aqui é aluno perdendo acesso antes da hora, ou ganhando mais do que comprou.

   Nasceu de três cópias do mesmo `onChange` que produziram três comportamentos
   (enroll-student · send-access · edit-access) — a família 9.42/9.54/9.57 pela
   quarta vez. O teto também mora aqui para que CLIENT e SERVIDOR usem a MESMA
   régua: `validations.ts` importa `MAX_ACCESS_DAYS` deste arquivo. Divergência
   entre irmãs foi exatamente como o 9.57c nasceu. */

export const MIN_ACCESS_DAYS = 1;
export const MAX_ACCESS_DAYS = 36500; // ~100 anos

/* O bug do 9.60, em uma linha: `Number(v) || 1`.

   Enquanto se digita "30.5", o `<input type="number">` reporta `""` no momento
   do ponto — porque "30." não é número válido. Aí `Number("") === 0`, o `|| 1`
   troca por **1**, o campo se redesenha como "1", e a tecla seguinte concatena:
   **"30.5" vira 15**. Com vírgula o caractere nem entra, e "30,5" vira **305**.
   Nos dois casos o produtor vê um número que ele não digitou, e o servidor não
   tem como saber — 15 e 305 são inteiros perfeitamente válidos.

   A correção não é clampar melhor: é **não tratar estado transitório como
   valor**. Entrada em trânsito PRESERVA o que já havia. */
export function parseAccessDays(raw: string, anterior: number): number {
  if (raw.trim() === "") return anterior; // transitório ("30." vira "") — não mexe
  const n = Number(raw);
  if (!Number.isFinite(n)) return anterior;
  return Math.min(MAX_ACCESS_DAYS, Math.max(MIN_ACCESS_DAYS, Math.round(n)));
}

/* ⚠️ BLOQUEAR A DIGITAÇÃO DO SEPARADOR FOI TENTADO E **DESCARTADO POR MEDIÇÃO**.
   Parecia a solução óbvia — "30,5 dias não existe, então não deixe digitar" —
   mas piora o resultado, porque bloquear a tecla faz os dígitos vizinhos se
   colarem. Medido, digitando "30.5" com a intenção de 30:

       COM bloqueio → 305   (o "." não entra, o "5" cola no "30")
       SEM bloqueio → 31    (o input aceita "30.5" e o Math.round resolve)

   Ou seja: bloquear afasta **275 dias** da intenção; não bloquear erra por 1.
   Por isso o `parseAccessDays` acima arredonda em vez de impedir.

   🔴 O QUE CONTINUA ABERTO: a VÍRGULA. `<input type="number">` simplesmente não
   insere "," — o caractere é descartado pelo próprio navegador, antes de
   qualquer handler nosso, e "30,5" vira **305** com ou sem bloqueio. E em
   teclado pt-BR a vírgula é o separador NATURAL, o que torna esse o erro mais
   provável, não o menos. Fechar isso exige trocar para `type="text"` +
   `inputMode="numeric"` com normalização própria de "," → "." — mudança de
   comportamento do campo (perde as setas nativas) que é decisão de produto,
   não efeito colateral desta etapa. Registrado como item próprio. */
