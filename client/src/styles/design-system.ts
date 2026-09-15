/**
 * Espejo TS de styles/tokens.css para uso en JS (gráficos, estilos inline puntuales).
 * Mantener sincronizado con tokens.css. Los valores de color están
 * verificados para contraste WCAG 2.1 AA (ver DESIGN.md).
 */
export const tokens = {
  color: {
    primary: {
      50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 500: '#0ea5e9',
      600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e',
    },
    teal: {
      50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6',
      600: '#0d9488', 700: '#0f766e', 800: '#115e59',
    },
    bg: '#f0f9ff',
    surface: '#ffffff',
    surfaceSunken: '#f8fafc',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    text: '#0f172a',
    textMuted: '#475569',
    onDark: '#f1f5f9',
    onDarkMuted: '#bae6fd',
  },
  status: {
    success: { bg: '#d1fae5', text: '#047857', solid: '#047857' },
    warning: { bg: '#fef3c7', text: '#92400e', solid: '#b45309' },
    danger: { bg: '#fee2e2', text: '#b91c1c', solid: '#b91c1c' },
    info: { bg: '#e0f2fe', text: '#0369a1', solid: '#0369a1' },
    neutral: { bg: '#e2e8f0', text: '#475569', solid: '#475569' },
  },
  space: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  duration: { fast: 120, base: 200, slow: 320 },
  breakpoint: { sm: 640, md: 768, lg: 1024 },
} as const;

/**
 * Normaliza estados/urgencias que llegan de la API (claves mixtas es/en,
 * mayúsculas, guiones bajos) a una variante de Badge. Fix A11Y-13.
 */
export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_MAP: Record<string, StatusVariant> = {
  // urgencias
  alta: 'danger', high: 'danger', urgente: 'danger',
  media: 'warning', medium: 'warning', moderada: 'warning',
  baja: 'success', low: 'success',
  // estados de asignación/paciente
  pendiente: 'info', asignado: 'info',
  notificado: 'info', contactado: 'info', en_tratamiento: 'info',
  atendido: 'success', completado: 'success', completada: 'success', activo: 'success',
  cancelado: 'danger', cancelada: 'danger', abandono: 'danger', inactivo: 'danger',
};

export function statusVariant(value: string | null | undefined): StatusVariant {
  if (!value) return 'neutral';
  return STATUS_MAP[value.toLowerCase().trim()] ?? 'neutral';
}
