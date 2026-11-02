/**
 * BODMAS Arithmetic Evaluator for Retail Calculator
 * Evaluates +, -, × operations with immediate execution as characters are typed.
 */

export function evaluateBODMAS(input: string): number {
  if (!input || !input.trim()) return 0;

  // Replace multiplication symbol with standard operator
  let sanitized = input.replace(/×/g, '*').trim();

  // Strip trailing operators and spaces so expressions like "200 +" evaluate the valid prefix "200"
  sanitized = sanitized.replace(/[\+\-\*]+\s*$/, '').trim();
  if (!sanitized) return 0;

  // Tokenize into numbers and operators
  const tokens: (number | string)[] = [];
  let numBuf = '';

  for (let i = 0; i < sanitized.length; i++) {
    const ch = sanitized[i];
    if (ch === ' ') continue;

    if ('+-*'.includes(ch)) {
      if (numBuf) {
        tokens.push(parseFloat(numBuf));
        numBuf = '';
      }
      tokens.push(ch);
    } else {
      numBuf += ch;
    }
  }

  if (numBuf) {
    tokens.push(parseFloat(numBuf));
  }

  if (tokens.length === 0) return 0;

  // Step 1: Multiplication (BODMAS: 'M' precedes 'A' & 'S')
  const pass1: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '*') {
      const prev = pass1.pop();
      const next = tokens[++i];
      if (typeof prev === 'number' && typeof next === 'number') {
        pass1.push(prev * next);
      } else {
        pass1.push(prev ?? 0);
      }
    } else {
      pass1.push(token);
    }
  }

  // Step 2: Addition and Subtraction (evaluated left-to-right)
  let result = typeof pass1[0] === 'number' ? pass1[0] : 0;
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i];
    const next = pass1[i + 1];
    if (typeof next === 'number') {
      if (op === '+') {
        result += next;
      } else if (op === '-') {
        result -= next;
      }
    }
  }

  // If the result is negative (e.g. 1800 - 2000), make it positive as requested
  if (isNaN(result) || !isFinite(result)) return 0;
  return Math.abs(result);
}

/**
 * Formats calculation result as "Rs. 1,234"
 * Fits four digits with comma at thousands place, space, dot, and Rs.
 */
export function formatRsDisplay(amount: number): string {
  if (amount === 0) return 'Rs. 0';

  const hasDecimals = amount % 1 !== 0;
  const formatted = hasDecimals
    ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount.toLocaleString('en-US');

  return `Rs. ${formatted}`;
}
