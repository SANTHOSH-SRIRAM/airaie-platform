import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCsrfToken, isSafeMethod, CSRF_COOKIE_NAME } from './csrf';

// Tests run in the default `node` vitest environment (no DOM). We stub
// `globalThis.document` with a minimal { cookie: string } object — that's
// the only surface getCsrfToken touches.

type DocLike = { cookie: string } | undefined;

let originalDoc: DocLike;

beforeEach(() => {
  originalDoc = (globalThis as unknown as { document?: DocLike }).document;
});

afterEach(() => {
  (globalThis as unknown as { document?: DocLike }).document = originalDoc;
});

function setDocCookie(value: string | undefined) {
  if (value === undefined) {
    (globalThis as unknown as { document?: DocLike }).document = undefined;
    return;
  }
  (globalThis as unknown as { document: { cookie: string } }).document = { cookie: value };
}

describe('csrf cookie parser', () => {
  it('returns null when document is undefined', () => {
    setDocCookie(undefined);
    expect(getCsrfToken()).toBeNull();
  });

  it('returns null when the cookie string is empty', () => {
    setDocCookie('');
    expect(getCsrfToken()).toBeNull();
  });

  it('returns null when the csrf cookie is not present', () => {
    setDocCookie('foo=bar; baz=qux');
    expect(getCsrfToken()).toBeNull();
  });

  it('returns the token when only the csrf cookie is set', () => {
    setDocCookie(`${CSRF_COOKIE_NAME}=abc123`);
    expect(getCsrfToken()).toBe('abc123');
  });

  it('finds the csrf cookie among many', () => {
    setDocCookie(`foo=bar; ${CSRF_COOKIE_NAME}=hex-deadbeef; baz=qux`);
    expect(getCsrfToken()).toBe('hex-deadbeef');
  });

  it('strips surrounding quotes if present', () => {
    setDocCookie(`${CSRF_COOKIE_NAME}="quoted-token"`);
    expect(getCsrfToken()).toBe('quoted-token');
  });
});

describe('isSafeMethod', () => {
  it('classifies GET/HEAD/OPTIONS as safe', () => {
    expect(isSafeMethod('GET')).toBe(true);
    expect(isSafeMethod('head')).toBe(true);
    expect(isSafeMethod('OPTIONS')).toBe(true);
  });
  it('classifies state-changing verbs as unsafe', () => {
    expect(isSafeMethod('POST')).toBe(false);
    expect(isSafeMethod('PUT')).toBe(false);
    expect(isSafeMethod('PATCH')).toBe(false);
    expect(isSafeMethod('DELETE')).toBe(false);
  });
  it('defaults missing method to GET (safe)', () => {
    expect(isSafeMethod()).toBe(true);
  });
});
