// Set de iconos SVG inline (24×24, stroke currentColor). Sin dependencias:
// reemplaza FontAwesome CDN (~100KB) por los ~28 iconos que la app realmente usa.
// Decorativo por defecto (aria-hidden); pasar `label` solo si el icono aporta significado.

const PATHS = {
  tooth: 'M7 4c-2 0-3.5 1.6-3.5 3.8 0 3 1.6 4.4 2 7.2.3 2.2.6 6 2 6 1.6 0 1-4.5 4.5-4.5s2.9 4.5 4.5 4.5c1.4 0 1.7-3.8 2-6 .4-2.8 2-4.2 2-7.2C20.5 5.6 19 4 17 4c-1.7 0-2.6 1-5 1s-3.3-1-5-1z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  chart: 'M21.2 15.9A10 10 0 1 1 8 2.8M22 12A10 10 0 0 0 12 2v10z',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16.8 11.6a2.6 2.6 0 1 0-1.3-5M16.5 14.6c2.2.3 3.7 1.9 4.1 4.4',
  'grad-cap': 'M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M21.5 9.5V15',
  robot: 'M5 8h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM12 8V5M12 5a1 1 0 1 0 0-2M2 13h1M21 13h1M9 13v1.5M15 13v1.5',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  clipboard: 'M8 4h8a1 1 0 0 1 1 1v2H7V5a1 1 0 0 1 1-1zM7 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1M9 12h6M9 16h4',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11',
  mail: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3.5 7l8.5 6 8.5-6',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  login: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 7l5 5-5 5M19 12H9',
  eye: 'M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  'eye-slash': 'M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-2.9 3.9M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 6.5 10 6.5a9.6 9.6 0 0 0 4.4-1M4 4l16 16',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.5l2.5 2.5 5-5.5',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'id-card': 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16.5c.5-1.8 1.6-2.6 3-2.6s2.5.8 3 2.6M14.5 10h4M14.5 14h4',
  chat: 'M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2zM12 8.5v5M9.5 11h5',
  send: 'M21 3L10 14M21 3l-7 18-3-8-8-3 18-7z',
  'user-injured': 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21c.8-3.8 3.4-6 7-6s6.2 2.2 7 6M18.5 2v4M16.5 4h4',
  'user-plus': 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c.8-3.8 3.4-6 7-6 1.6 0 3 .4 4.2 1.1M18.5 14v6M15.5 17h6',
  'user-check': 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c.8-3.8 3.4-6 7-6 1.6 0 3 .4 4.2 1.1M15.5 16.5l2 2 4-4',
  stethoscope: 'M6 3v5a4 4 0 0 0 8 0V3M6 3H4.5M13.5 3H12M10 15.5V17a5 5 0 0 0 10 0v-1.5M20 14a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z',
  plus: 'M12 5v14M5 12h14',
  warning: 'M12 3L2 20h20L12 3zM12 10v5M12 17.6v.4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.6V8',
  pencil: 'M12 20h9M15.5 5.5l3 3L8 19H5v-3L15.5 5.5z',
};

export default function Icon({ name, size = 20, label, className = '', style }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`dm-icon ${className}`}
      style={style}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}
    >
      <path d={d} />
    </svg>
  );
}
