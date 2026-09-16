import { describe, expect, it } from 'vitest';
import { bytes, DASH, duration, fmt, mbps } from './format';

describe('formatting', () => {
  it('renders a missing value as an em dash, never as zero', () => {
    expect(fmt(null, 'ms')).toBe(DASH);
    expect(fmt(undefined, 'ms')).toBe(DASH);
    expect(mbps(null)).toBe(DASH);
    expect(bytes(null)).toBe(DASH);
    expect(duration(null)).toBe(DASH);
  });

  it('keeps a real zero visible as a number', () => {
    expect(fmt(0, 'fps')).toBe('0 fps');
    expect(mbps(0)).toBe('0.00 Mbps');
  });

  it('refuses NaN and Infinity, which arrive from bad arithmetic', () => {
    expect(fmt(Number.NaN, 'ms')).toBe(DASH);
    expect(fmt(Number.POSITIVE_INFINITY, 'ms')).toBe(DASH);
  });

  it('formats duration as hh:mm:ss past an hour', () => {
    expect(duration(0)).toBe('00:00:00');
    expect(duration(3_723_000)).toBe('01:02:03');
    expect(duration(-5)).toBe(DASH);
  });

  it('switches from MB to GB at the gigabyte', () => {
    expect(bytes(500 * 1024 ** 2)).toBe('500 MB');
    expect(bytes(2.5 * 1024 ** 3)).toBe('2.50 GB');
  });
});
