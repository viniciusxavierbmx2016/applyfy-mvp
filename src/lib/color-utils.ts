export function darkenHex(hex: string, amount = 0.15): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.round(c * (1 - amount)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}
