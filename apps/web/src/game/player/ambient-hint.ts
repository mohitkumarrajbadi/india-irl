/** District string → ambient bed kind. */
export function ambientKindHint(district: string, night: number): string {
  if (night > 0.72) return "night";
  const d = district.toLowerCase();
  if (/nandi|hill|approach|outskirt|village|fringe/.test(d)) return "park";
  if (/park|garden|valley|cheruvu|cubbon|leisure/.test(d)) return "park";
  if (/market|road|peth|old|sector|madhapur|hsr|indiranagar|fc /.test(d)) return "market";
  return "tech";
}
