function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

export function matchesSearch(query, text) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const normalizedText = normalizeSearchText(text);
  if (normalizedText.includes(normalizedQuery)) return true;

  const queryWords = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);
  const textWords = normalizedText.split(/[^a-z0-9]+/).filter(Boolean);
  return queryWords.every((queryWord) => textWords.some((textWord) => {
    if (textWord.includes(queryWord)) return true;
    if (queryWord.length < 4 || textWord.length < 4) return false;
    const allowedDistance = queryWord.length >= 7 ? 2 : 1;
    return editDistance(queryWord, textWord) <= allowedDistance;
  }));
}
