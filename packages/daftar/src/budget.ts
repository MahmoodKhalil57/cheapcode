export function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

export type BudgetSlice<T> = {
  items: T[];
  truncated: boolean;
  usedTokens: number;
};

export function capByBudget<T>(
  items: T[],
  getText: (item: T) => string,
  budgetTokens: number,
): BudgetSlice<T> {
  const kept: T[] = [];
  let usedTokens = 0;
  let truncated = false;

  for (const item of items) {
    const tokens = tokenEstimate(getText(item));
    if (kept.length === 0 && tokens > budgetTokens) {
      return { items: [], truncated: true, usedTokens: 0 };
    }

    if (usedTokens + tokens > budgetTokens) {
      truncated = true;
      break;
    }

    kept.push(item);
    usedTokens += tokens;
  }

  return { items: kept, truncated, usedTokens };
}
