import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  /** Hauteur pleine (listes longues). */
  tall?: boolean
}

/** Panneau modal qui monte du bas de l'écran. */
export function Sheet({ open, onClose, title, children, tall }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`pb-safe relative flex flex-col rounded-t-3xl bg-zinc-900 ${tall ? 'h-[92dvh]' : 'max-h-[92dvh]'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex min-h-14 items-center gap-2 px-4">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 active:bg-zinc-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
