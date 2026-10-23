const MAX_COMPARISON_LINES = 10000;
const MAX_COMPARISON_CHANGES = 20000;

const splitText = (text) => text.replace(/\r\n/g, "\n").split("\n");

const assertComparableSize = (text, label) => {
  if (text.length > 500000) {
    const error = new Error(`${label} exceeds the 500,000 character comparison limit.`);
    error.status = 413;
    throw error;
  }
};

const mergeChanges = (changes) => {
  const merged = [];

  for (const change of changes) {
    const previous = merged[merged.length - 1];
    if (previous && previous.type === change.type) {
      previous.lines.push(...change.lines);
    } else {
      merged.push({ type: change.type, lines: [...change.lines] });
    }
  }

  const annotated = [];
  for (let index = 0; index < merged.length; index += 1) {
    const current = merged[index];
    const next = merged[index + 1];
    if (current.type === "removed" && next?.type === "added") {
      annotated.push({ type: "changed", removed: current.lines, added: next.lines });
      index += 1;
    } else {
      annotated.push(current);
    }
  }

  return annotated;
};

// Myers-style line diff with bounded input. It returns grouped additions,
// removals, and unchanged lines without loading any files itself.
const compareText = (fromText, toText) => {
  assertComparableSize(fromText, "The first version");
  assertComparableSize(toText, "The second version");

  const from = splitText(fromText);
  const to = splitText(toText);

  if (from.length > MAX_COMPARISON_LINES || to.length > MAX_COMPARISON_LINES) {
    const error = new Error(`Version comparison is limited to ${MAX_COMPARISON_LINES} lines per version.`);
    error.status = 413;
    throw error;
  }

  const max = from.length + to.length;
  const trace = [];
  let frontier = new Map([[1, 0]]);

  for (let distance = 0; distance <= max; distance += 1) {
    trace.push(new Map(frontier));

    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const down = diagonal === -distance
        || (diagonal !== distance && (frontier.get(diagonal - 1) || 0) < (frontier.get(diagonal + 1) || 0));
      let x = down ? (frontier.get(diagonal + 1) || 0) : (frontier.get(diagonal - 1) || 0) + 1;
      let y = x - diagonal;

      while (x < from.length && y < to.length && from[x] === to[y]) {
        x += 1;
        y += 1;
      }

      frontier.set(diagonal, x);

      if (x >= from.length && y >= to.length) {
        return buildChanges(trace, from, to, distance);
      }
    }

    if (distance > MAX_COMPARISON_CHANGES) {
      const error = new Error("Version comparison produced too many changes.");
      error.status = 413;
      throw error;
    }
  }

  return [];
};

const buildChanges = (trace, from, to, distance) => {
  const changes = [];
  let x = from.length;
  let y = to.length;

  for (let current = distance; current > 0; current -= 1) {
    const frontier = trace[current];
    const diagonal = x - y;
    const down = diagonal === -current
      || (diagonal !== current && (frontier.get(diagonal - 1) || 0) < (frontier.get(diagonal + 1) || 0));
    const previousDiagonal = down ? diagonal + 1 : diagonal - 1;
    const previousX = frontier.get(previousDiagonal) || 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      changes.push({ type: "unchanged", lines: [from[x - 1]] });
      x -= 1;
      y -= 1;
    }

    if (down) {
      changes.push({ type: "added", lines: [to[y - 1]] });
      y -= 1;
    } else {
      changes.push({ type: "removed", lines: [from[x - 1]] });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    changes.push({ type: "unchanged", lines: [from[x - 1]] });
    x -= 1;
    y -= 1;
  }
  while (x > 0) changes.push({ type: "removed", lines: [from[--x]] });
  while (y > 0) changes.push({ type: "added", lines: [to[--y]] });

  return mergeChanges(changes.reverse());
};

module.exports = { compareText };
