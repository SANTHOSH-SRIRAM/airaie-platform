// Design Tokens — TypeScript access to CSS variable references
// Use these when you need token values in JS (inline styles, chart configs, etc.)

export const colors = {
  brand: {
    primary: 'var(--color-brand-primary)',
    primaryHover: 'var(--color-brand-primary-hover)',
    primaryActive: 'var(--color-brand-primary-active)',
    primaryMuted: 'var(--color-brand-primary-muted)',
    danger: 'var(--color-brand-danger)',
    dangerHover: 'var(--color-brand-danger-hover)',
  },
  surface: {
    bg: 'var(--color-surface-bg)',
    default: 'var(--color-surface)',
    raised: 'var(--color-surface-raised)',
    layer: 'var(--color-surface-layer)',
    hover: 'var(--color-surface-hover)',
    overlay: 'var(--color-surface-overlay)',
  },
  card: {
    bg: 'var(--color-card-bg)',
    header: 'var(--color-card-header)',
    border: 'var(--color-card-border)',
    borderInner: 'var(--color-card-border-inner)',
  },
  sidebar: {
    bg: 'var(--color-sidebar-bg)',
    hover: 'var(--color-sidebar-hover)',
    text: 'var(--color-sidebar-text)',
    textActive: 'var(--color-sidebar-text-active)',
    icon: 'var(--color-sidebar-icon)',
    border: 'var(--color-sidebar-border)',
    section: 'var(--color-sidebar-section)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    helper: 'var(--color-text-helper)',
    placeholder: 'var(--color-text-placeholder)',
    disabled: 'var(--color-text-disabled)',
    inverse: 'var(--color-text-inverse)',
    onColor: 'var(--color-text-on-color)',
  },
  border: {
    default: 'var(--color-border)',
    subtle: 'var(--color-border-subtle)',
    strong: 'var(--color-border-strong)',
    focus: 'var(--color-border-focus)',
  },
  status: {
    success: 'var(--color-status-success)',
    successBg: 'var(--color-status-success-bg)',
    warning: 'var(--color-status-warning)',
    warningBg: 'var(--color-status-warning-bg)',
    danger: 'var(--color-status-danger)',
    dangerBg: 'var(--color-status-danger-bg)',
    info: 'var(--color-status-info)',
    infoBg: 'var(--color-status-info-bg)',
  },
} as const;

export const layout = {
  sidebarWidth: 'var(--sidebar-width)',
  headerHeight: 'var(--header-height)',
  contentMaxWidth: 'var(--content-max-width)',
} as const;

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSize = keyof typeof iconSizes | number;
