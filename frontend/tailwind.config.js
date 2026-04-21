/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* ── Semantic tokens (CSS variable–backed, theme-aware) ── */
        brand: {
          primary:        'var(--color-brand-primary)',
          'primary-hover':'var(--color-brand-primary-hover)',
          'primary-active':'var(--color-brand-primary-active)',
          'primary-muted': 'var(--color-brand-primary-muted)',
          danger:         'var(--color-brand-danger)',
          'danger-hover': 'var(--color-brand-danger-hover)',
        },
        surface: {
          bg:     'var(--color-surface-bg)',
          DEFAULT:'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          layer:  'var(--color-surface-layer)',
          hover:  'var(--color-surface-hover)',
          active: 'var(--color-surface-active)',
        },
        card: {
          bg:       'var(--color-card-bg)',
          header:   'var(--color-card-header)',
          border:   'var(--color-card-border)',
          'border-inner': 'var(--color-card-border-inner)',
        },
        sidebar: {
          bg:       'var(--color-sidebar-bg)',
          hover:    'var(--color-sidebar-hover)',
          text:     'var(--color-sidebar-text)',
          'text-active': 'var(--color-sidebar-text-active)',
          icon:     'var(--color-sidebar-icon)',
          border:   'var(--color-sidebar-border)',
          section:  'var(--color-sidebar-section)',
          'active-border': 'var(--color-sidebar-active-border)',
        },
        content: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          helper:    'var(--color-text-helper)',
          placeholder:'var(--color-text-placeholder)',
          disabled:  'var(--color-text-disabled)',
          inverse:   'var(--color-text-inverse)',
        },
        border: {
          DEFAULT:  'var(--color-border)',
          subtle:   'var(--color-border-subtle)',
          strong:   'var(--color-border-strong)',
          focus:    'var(--color-border-focus)',
        },
        status: {
          success:       'var(--color-status-success)',
          'success-bg':  'var(--color-status-success-bg)',
          'success-text':'var(--color-status-success-text)',
          warning:       'var(--color-status-warning)',
          'warning-bg':  'var(--color-status-warning-bg)',
          danger:        'var(--color-status-danger)',
          'danger-bg':   'var(--color-status-danger-bg)',
          'danger-text': 'var(--color-status-danger-text)',
          info:          'var(--color-status-info)',
          'info-bg':     'var(--color-status-info-bg)',
          'info-text':   'var(--color-status-info-text)',
        },
        focus: 'var(--color-focus)',

        /* ── CDS compat tokens (theme-aware) ─────────────────── */
        cds: {
          'field-01':          'var(--color-cds-field-01)',
          'background-hover':  'var(--color-cds-background-hover)',
          'background-active': 'var(--color-cds-background-active)',
          'icon-secondary':    'var(--color-cds-icon-secondary)',
          'text-primary':      'var(--color-cds-text-primary)',
          'text-secondary':    'var(--color-cds-text-secondary)',
          'text-placeholder':  'var(--color-cds-text-placeholder)',
          'text-helper':       'var(--color-cds-text-helper)',
          'text-disabled':     'var(--color-cds-text-disabled)',
          'text-error':        'var(--color-cds-text-error)',
          'border-subtle':     'var(--color-cds-border-subtle)',
          'border-strong':     'var(--color-cds-border-strong)',
          'layer-01':          'var(--color-cds-layer-01)',
          'layer-02':          'var(--color-cds-layer-02)',
          'layer-hover-02':    'var(--color-cds-layer-hover-02)',
          'layer-active-01':   'var(--color-cds-layer-active-01)',
          'support-error':     'var(--color-cds-support-error)',
          'support-warning':   'var(--color-cds-support-warning)',
          'focus':             'var(--color-cds-focus)',
        },

        /* ── Primitive palette (not theme-dependent) ─────────── */
        gray: {
          10:  'var(--gray-10)',
          20:  'var(--gray-20)',
          30:  'var(--gray-30)',
          40:  'var(--gray-40)',
          50:  'var(--gray-50)',
          60:  'var(--gray-60)',
          70:  'var(--gray-70)',
          80:  'var(--gray-80)',
          90:  'var(--gray-90)',
          100: 'var(--gray-100)',
        },
        blue: {
          10:  'var(--blue-10)',
          20:  'var(--blue-20)',
          30:  'var(--blue-30)',
          40:  'var(--blue-40)',
          50:  'var(--blue-50)',
          60:  'var(--blue-60)',
          70:  'var(--blue-70)',
          80:  'var(--blue-80)',
          90:  'var(--blue-90)',
          100: 'var(--blue-100)',
        },
        green: {
          10:  'var(--green-10)',
          20:  'var(--green-20)',
          30:  'var(--green-30)',
          40:  'var(--green-40)',
          50:  'var(--green-50)',
          60:  'var(--green-60)',
          70:  'var(--green-70)',
          80:  'var(--green-80)',
        },
        red: {
          10:  'var(--red-10)',
          20:  'var(--red-20)',
          30:  'var(--red-30)',
          40:  'var(--red-40)',
          50:  'var(--red-50)',
          60:  'var(--red-60)',
          70:  'var(--red-70)',
          80:  'var(--red-80)',
        },
        yellow: {
          20:  'var(--yellow-20)',
          30:  'var(--yellow-30)',
        },
        orange: {
          10: 'var(--orange-10)',
          50: 'var(--orange-50)',
          60: 'var(--orange-60)',
        },
        purple: { 10: 'var(--purple-10)', 50: 'var(--purple-50)', 60: 'var(--purple-60)' },
        teal:   { 50: 'var(--teal-50)', 60: 'var(--teal-60)' },
      },

      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SF Mono', 'Menlo', 'Monaco', 'monospace'],
      },

      fontSize: {
        '2xs':  ['0.6875rem', { lineHeight: '1rem' }],       // 11px — section labels
        'xs':   ['0.75rem',   { lineHeight: '1rem' }],       // 12px — helper
        'sm':   ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px — body
        'base': ['0.875rem',  { lineHeight: '1.25rem' }],    // 14px — titles
        'lg':   ['1rem',      { lineHeight: '1.375rem' }],   // 16px — headings
        'xl':   ['1.25rem',   { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',    { lineHeight: '2rem' }],
        '3xl':  ['1.75rem',   { lineHeight: '2.25rem' }],    // 28px — hero
        '4xl':  ['2.25rem',   { lineHeight: '2.5rem' }],
      },

      spacing: {
        'sidebar': 'var(--sidebar-width)',
        'header':  'var(--header-height)',
      },

      boxShadow: {
        'xs':         '0 1px 2px rgba(0,0,0,0.04)',
        'card':       '0px 1px 8px 0px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 3px 12px rgba(0, 0, 0, 0.08)',
        'elevated':   '0px 1px 8px 0px rgba(0, 0, 0, 0.05)',
        'dropdown':   '0 3px 16px rgba(0, 0, 0, 0.10)',
        'raised':     '0 3px 16px rgba(0, 0, 0, 0.10)',
        'node-selected': '0px 1px 8px 0px rgba(0, 0, 0, 0.05), 0 0 0 2px #2196f3',
      },

      borderRadius: {
        'none': '0',
        'sm':   '4px',
        'DEFAULT': '8px',
        'md':   '8px',
        'lg':   '10px',
        'xl':   '12px',
        '2xl':  '16px',
        'full': '999px',
      },

      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky:   'var(--z-sticky)',
        fixed:    'var(--z-fixed)',
        overlay:  'var(--z-overlay)',
        modal:    'var(--z-modal)',
        popover:  'var(--z-popover)',
        tooltip:  'var(--z-tooltip)',
        toast:    'var(--z-toast)',
      },

      animation: {
        'fade-in':  'fadeIn var(--duration-normal) var(--ease-out)',
        'slide-in': 'slideIn var(--duration-normal) var(--ease-out)',
        'slide-up': 'slideUp var(--duration-slower) var(--ease-out)',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'skeleton': 'skeletonPulse 1s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn:  { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideUp:  { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        skeletonPulse: { '0%': { opacity: '0.3' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
