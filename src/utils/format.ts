export const money = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  }).format(value);

export const number = (value: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);

export const percent = (value: number) => `${number(value)}%`;

export const roas = (value: number) => `${number(value)}x`;

export const unique = <T,>(items: T[]) => Array.from(new Set(items));
