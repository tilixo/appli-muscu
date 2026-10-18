import { Link, useLocation } from 'react-router'

const icon = (d: string) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const TABS = [
  { to: '/', label: 'Séances', icon: icon('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11') },
  { to: '/nutrition', label: 'Nutrition', icon: icon('M12 21c-4.4 0-8-3.6-8-8 0-3.5 2.5-6 5-6 1.2 0 2.2.5 3 1 .8-.5 1.8-1 3-1 2.5 0 5 2.5 5 6 0 4.4-3.6 8-8 8zM12 8c0-2 1-4 3-5') },
  { to: '/corps', label: 'Corps', icon: icon('M4 20h16M7 20V10M12 20V4M17 20v-7') },
  { to: '/reglages', label: 'Réglages', icon: icon('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z') },
]

export function TabBar() {
  const { pathname } = useLocation()
  // "Séances" reste actif sur toutes les routes qui n'appartiennent pas aux autres onglets.
  const isActive = (to: string) =>
    to === '/' ? !TABS.slice(1).some((t) => pathname.startsWith(t.to)) : pathname.startsWith(to)

  return (
    <nav className="pb-safe border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <ul className="flex">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <Link
              to={t.to}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive(t.to) ? 'text-lime-400' : 'text-zinc-500'}`}
            >
              {t.icon}
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
