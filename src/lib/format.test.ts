import { describe, expect, it } from 'vitest';
import { formatEditable, formatViews, parseViews, roundNice, suggestLine } from './format';

describe('parseViews', () => {
  it.each([
    ['250k', 250_000],
    ['250K', 250_000],
    ['1.2M', 1_200_000],
    ['1.2 m', 1_200_000],
    ['1,200,000', 1_200_000],
    ['900 views', 900],
    ['3b', 3_000_000_000],
    ['.5m', 500_000],
    ['0', 0],
    ['1.25k', 1250],
  ])('%s → %d', (input, expected) => {
    expect(parseViews(input)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '1.2.3', '-5', 'k', '12kk'])('rejects %j', (input) => {
    expect(parseViews(input)).toBeNull();
  });
});

describe('formatViews', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1K'],
    [1500, '1.5K'],
    [96_400, '96.4K'],
    [250_000, '250K'],
    [999_999, '1M'],
    [1_840_000, '1.8M'],
    [12_345_678, '12.3M'],
    [123_456_789, '123M'],
    [2_000_000_000, '2B'],
  ])('%d → %s', (n, expected) => {
    expect(formatViews(n)).toBe(expected);
  });
});

describe('formatEditable', () => {
  it('uses compact text only when it round-trips exactly', () => {
    expect(formatEditable(1_200_000)).toBe('1.2M');
    expect(formatEditable(1_234_567)).toBe('1,234,567');
    expect(formatEditable(null)).toBe('');
    for (const n of [0, 7, 1500, 96_400, 250_000, 1_234_567, 41_700]) {
      expect(parseViews(formatEditable(n))).toBe(n);
    }
  });
});

describe('suggestLine', () => {
  it('rounds to two significant figures', () => {
    expect(roundNice(1_234_567)).toBe(1_200_000);
    expect(roundNice(96_400)).toBe(96_000);
    expect(roundNice(42)).toBe(42);
  });

  it('never lands on the real number and produces both answers', () => {
    let seed = 1;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const answers = new Set<string>();
    for (const views of [1_000, 41_700, 96_400, 250_000, 1_840_000, 3_200_000_000]) {
      for (let i = 0; i < 200; i++) {
        const line = suggestLine(views, rand);
        expect(line).toBeGreaterThan(0);
        expect(line).not.toBe(views);
        answers.add(views >= line ? 'over' : 'under');
      }
    }
    expect(answers).toEqual(new Set(['over', 'under']));
  });
});
