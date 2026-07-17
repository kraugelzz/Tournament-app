export function parsePlayers(raw: string): { names: string[]; duplicates: string[] } {
  const names = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) duplicates.push(name);
    else seen.add(key);
  }
  return { names, duplicates };
}
