/** Environment mode configuration. */

export type EnvMode = 'development' | 'staging' | 'production';

export const ENV: EnvMode = (import.meta.env.VITE_ENV as EnvMode) || 'development';

export const IS_DEV = ENV === 'development';
export const IS_PROD = ENV === 'production' || ENV === 'staging';

/** Allow mock auth fallback only in development when explicitly enabled. */
export const USE_MOCKS = IS_DEV && import.meta.env.VITE_USE_MOCKS !== 'false';
