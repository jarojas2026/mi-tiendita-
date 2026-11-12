// Íconos SVG livianos (trazo 2, estilo Lucide) — sin librerías externas.
import type { SVGProps } from 'react'

const P: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-5.2-5.2',
  cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm8 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  heart: 'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z',
  moon: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  x: 'M6 6l12 12M18 6 6 18',
  chat: 'M21 12a8 8 0 0 1-11.8 7L4 20.5l1.5-4.6A8 8 0 1 1 21 12Z',
  send: 'M4 12 20 4l-6 16-2.5-6.5L4 12Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  truck: 'M2 6h11v9H2zM13 9h4l4 4v2h-8M6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  chevron: 'm9 6 6 6-6 6',
  back: 'm15 6-6 6 6 6',
  leaf: 'M5 19c0-8 5-14 15-15-1 10-7 15-15 15Zm0 0c3-4 6-6 9-8',
  repeat: 'M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15m0 5v-5h5',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  whatsapp: 'M4 20l1.3-3.9A8 8 0 1 1 8 19.2L4 20Zm5-11.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2L9.5 8Z',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z',
  card: 'M3 6h18v12H3zM3 10h18',
  navigation: 'M3 11 21 3l-8 18-2-8-8-2Z',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v7h4v-7h3l1-4h-4V8Z',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0L12 12m0 0 9-4.5M12 12v9',
}

export type IconName = keyof typeof P

export function Icon({ name, size = 20, className = '', filled, ...rest }: { name: IconName; size?: number; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
      <path d={P[name]} />
    </svg>
  )
}

/** Logo "Mi Tiendita Digital": techito de pulpería + hoja de la finca. */
export function Logo({ compact, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0 drop-shadow-sm">
        <rect width="48" height="48" rx="13" fill="#1c562d" />
        <path d="M8 21 24 9l16 12" fill="none" stroke="#f9a62b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 20v16a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V20" fill="#faf4ec" />
        <path d="M12 20h24l-2 5c-1.3 2-3.7 2-5 0-1.3 2-3.7 2-5 0-1.3 2-3.7 2-5 0-1.3 2-3.7 2-5 0l-2-5Z" fill="#c06a0b" />
        <path d="M24 37c0-6 3.5-9.6 9-10-.5 5.6-3.8 9.5-9 10Zm0 0c-.2-3.6-2.6-6.4-6.6-7 .2 4 2.8 6.6 6.6 7Z" fill="#2f7f43" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[19px] font-bold tracking-tight">Mi Tiendita</span>
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent-300">Digital · Pérez Zeledón</span>
        </span>
      )}
    </span>
  )
}
