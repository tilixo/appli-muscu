// Signal sonore via Web Audio. Sur iOS, le contexte audio doit être
// débloqué par un geste utilisateur : on le (re)lance à chaque toucher.
// Attention : le mode silencieux de l'iPhone coupe ce son.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  // "ambient" : se mélange à la musique en cours au lieu de la couper.
  const nav = navigator as Navigator & { audioSession?: { type: string } }
  if (nav.audioSession) nav.audioSession.type = 'ambient'
  ctx = new Ctor()
  return ctx
}

export function unlockAudio() {
  const c = getCtx()
  if (c && c.state !== 'running') void c.resume()
}

export function installAudioUnlock() {
  window.addEventListener('pointerdown', unlockAudio, { passive: true })
}

/** Trois bips courts. */
export function beep() {
  const c = getCtx()
  if (!c || c.state !== 'running') return
  const t0 = c.currentTime + 0.02
  for (let i = 0; i < 3; i++) {
    const start = t0 + i * 0.22
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = i === 2 ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.6, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.18)
  }
}
