import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

interface Props {
  title: ReactNode
  /** Affiche un bouton retour (historique du navigateur, ou `backTo`). */
  back?: boolean
  backTo?: string
  right?: ReactNode
}

export function PageHeader({ title, back, backTo, right }: Props) {
  const navigate = useNavigate()
  const goBack = () => {
    if (backTo) navigate(backTo)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }
  return (
    <header className="pt-safe sticky top-0 z-20 bg-zinc-950/90 backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-2">
        {back || backTo ? (
          <button type="button" onClick={goBack} aria-label="Retour" className="flex h-11 w-11 items-center justify-center rounded-full text-lime-400 active:bg-zinc-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        ) : (
          <div className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
        {right}
      </div>
    </header>
  )
}
