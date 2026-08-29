export type ParsedAmount = {
  value: number;
  formula: string | null;
};

export function parseAmountInput(input: string): ParsedAmount {
  const original = input.trim();
  if (!original) throw new Error('Kwota jest pusta.');

  const isFormula = original.startsWith('=');
  const expression = (isFormula ? original.slice(1) : original).replace(/,/g, '.');
  let position = 0;

  const skipSpaces = () => {
    while (/\s/.test(expression[position] ?? '')) position += 1;
  };

  const parseNumber = (): number => {
    skipSpaces();
    const match = expression.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) throw new Error('Nieprawidłowa formuła kwoty.');
    position += match[0].length;
    return Number(match[0]);
  };

  const parseFactor = (): number => {
    skipSpaces();
    if (expression[position] === '+' || expression[position] === '-') {
      const sign = expression[position++] === '-' ? -1 : 1;
      return sign * parseFactor();
    }
    if (expression[position] === '(') {
      position += 1;
      const value = parseExpression();
      skipSpaces();
      if (expression[position] !== ')') throw new Error('Brakuje zamykającego nawiasu.');
      position += 1;
      return value;
    }
    return parseNumber();
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (true) {
      skipSpaces();
      const operator = expression[position];
      if (operator !== '*' && operator !== '/') return value;
      position += 1;
      const operand = parseFactor();
      if (operator === '/' && operand === 0) throw new Error('Nie można dzielić przez zero.');
      value = operator === '*' ? value * operand : value / operand;
    }
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (true) {
      skipSpaces();
      const operator = expression[position];
      if (operator !== '+' && operator !== '-') return value;
      position += 1;
      const operand = parseTerm();
      value = operator === '+' ? value + operand : value - operand;
    }
  };

  const value = parseExpression();
  skipSpaces();
  if (position !== expression.length || !Number.isFinite(value)) {
    throw new Error('Nieprawidłowa formuła kwoty.');
  }

  return {
    value: Math.round((value + Number.EPSILON) * 100) / 100,
    formula: isFormula ? original : null,
  };
}
