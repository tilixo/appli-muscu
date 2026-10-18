import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { btnPrimary } from '../../components/ui'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

type CameraError = { title: string; detail: string }

function describeError(e: unknown): CameraError {
  const name = e instanceof DOMException || e instanceof Error ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return {
      title: 'Accès à la caméra refusé',
      detail: "Autorise la caméra pour cette app : Réglages de l'iPhone > Safari > Caméra (ou Réglages > Confidentialité > Caméra), puis rouvre l'app. Tu peux aussi saisir le code ci-dessous.",
    }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return { title: 'Aucune caméra disponible', detail: 'Saisis le code-barres à la main ci-dessous.' }
  if (name === 'NotReadableError') return { title: 'Caméra occupée', detail: "Une autre app utilise peut-être la caméra. Ferme-la et réessaie." }
  return { title: 'Caméra indisponible', detail: 'Saisis le code-barres à la main ci-dessous.' }
}

/** Plein écran : flux caméra arrière, détection EAN/UPC, saisie manuelle de secours. */
export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<CameraError | null>(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ title: 'Caméra non disponible', detail: "La caméra n'est accessible qu'en HTTPS (version installée depuis GitHub Pages). Saisis le code ci-dessous." })
      return
    }
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]]])
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
    let controls: IScannerControls | null = null
    let stopped = false

    reader
      .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, videoRef.current!, (result, _err, c) => {
        if (result && !stopped) {
          stopped = true
          c.stop()
          onDetected(result.getText())
        }
      })
      .then((c) => {
        controls = c
        if (stopped) c.stop()
      })
      .catch((e) => setError(describeError(e)))

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [onDetected])

  const submitManual = () => {
    const code = manual.replace(/\D/g, '')
    if (code.length >= 6) onDetected(code)
  }

  return createPortal(
    <div className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex min-h-14 items-center justify-between px-4">
        <span className="font-semibold">Scanner un code-barres</span>
        <button type="button" onClick={onClose} className="min-h-11 px-2 font-medium text-lime-400">Fermer</button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* playsInline + muted : indispensables pour la lecture inline sur iOS */}
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-36 w-72 rounded-2xl border-4 border-lime-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-lg font-semibold">{error.title}</p>
            <p className="text-sm text-zinc-400">{error.detail}</p>
          </div>
        )}
      </div>

      <form
        className="flex gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          submitManual()
        }}
      >
        <input
          className="min-h-12 min-w-0 flex-1 rounded-xl bg-zinc-800 px-3 text-base outline-none focus:ring-2 focus:ring-lime-400"
          inputMode="numeric"
          placeholder="Ou saisis le code…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" className={btnPrimary} disabled={manual.replace(/\D/g, '').length < 6}>OK</button>
      </form>
    </div>,
    document.body,
  )
}
