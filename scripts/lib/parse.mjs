// Minimal wikitext helpers: balanced-brace template extraction + top-level split.

export function extractTemplates(text, name) {
  const openTag = `{{${name}`;
  const out = [];
  let from = 0;

  while (true) {
    const start = text.indexOf(openTag, from);
    if (start === -1) break;

    // `{{Person` must not match `{{Persons...`
    const afterTag = text[start + openTag.length];
    if (afterTag && /[A-Za-z0-9_]/.test(afterTag)) {
      from = start + openTag.length;
      continue;
    }

    let depth = 0;
    let i = start;
    let end = -1;
    while (i < text.length) {
      if (text.startsWith('{{', i)) {
        depth += 1;
        i += 2;
        continue;
      }
      if (text.startsWith('}}', i)) {
        depth -= 1;
        i += 2;
        if (depth === 0) {
          end = i;
          break;
        }
        continue;
      }
      i += 1;
    }
    if (end === -1) break;

    out.push(text.slice(start + openTag.length, end - 2));
    from = end;
  }
  return out;
}

export function splitTopLevel(input, sep = '|') {
  const parts = [];
  let depth = 0;
  let cur = '';

  for (let i = 0; i < input.length; i++) {
    const pair = input.slice(i, i + 2);
    if (pair === '{{' || pair === '[[') {
      depth += 1;
      cur += pair;
      i += 1;
      continue;
    }
    if (pair === '}}' || pair === ']]') {
      depth -= 1;
      cur += pair;
      i += 1;
      continue;
    }
    if (input[i] === sep && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += input[i];
  }
  parts.push(cur);
  return parts;
}

/** Parse `|k=v|k2=v2|positional` style template params into an object. */
export function parseParams(inner) {
  const params = {};
  const positional = [];
  for (const part of splitTopLevel(inner.replace(/^\|/, ''))) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key) params[key] = value;
    } else if (part.trim()) {
      positional.push(part.trim());
    }
  }
  params._positional = positional;
  return params;
}
