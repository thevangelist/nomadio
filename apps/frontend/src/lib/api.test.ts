import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adoptTokenFromUrl, authHeaders, hasToken, setToken, wsUrl } from './api';

beforeEach(() => {
  localStorage.clear();
  setToken('');
  history.replaceState(null, '', '/');
});

describe('token handling', () => {
  it('takes a token from the URL and strips it from the address bar', () => {
    history.replaceState(null, '', '/?view=control&token=abc123');
    adoptTokenFromUrl();

    expect(hasToken()).toBe(true);
    expect(location.search).toBe('?view=control');
    expect(localStorage.getItem('nomadio.token')).toBe('abc123');
  });

  it('sends the token as a bearer header and in the socket query', () => {
    setToken('abc123');
    expect(authHeaders()).toEqual({ authorization: 'Bearer abc123' });
    expect(wsUrl()).toContain('token=abc123');
  });

  it('sends nothing at all when no token is set', () => {
    expect(authHeaders()).toEqual({});
    expect(wsUrl()).not.toContain('token');
  });

  it('survives storage being unavailable, as in private mode', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => setToken('abc123')).not.toThrow();
    expect(hasToken()).toBe(true);
    spy.mockRestore();
  });
});
