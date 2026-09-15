import { useEffect } from 'react';

// Título de documento por ruta (A11Y-10). Cada página declara el suyo.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} · Dental Matching`;
  }, [title]);
}
