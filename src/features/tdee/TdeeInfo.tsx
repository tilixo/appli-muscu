import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { KCAL_PER_KG, MIN_COVERED_DAYS, MIN_LOGGED_DAYS, MIN_LOGGED_KCAL, MIN_WEIGH_INS } from './tdee'

/** Bouton "i" ouvrant l'explication de la méthode de calcul. */
export function TdeeInfo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Comment est calculé le TDEE ?"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-xs font-bold italic">i</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Calcul du TDEE">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
          <p>
            Le <strong>TDEE</strong> (dépense énergétique totale journalière) est le nombre de calories que tu dépenses en moyenne par jour. Le
            manger maintient ton poids.
          </p>
          <section className="space-y-1">
            <h3 className="font-semibold text-zinc-100">TDEE théorique</h3>
            <p>
              Métabolisme de base par la formule de Mifflin-St Jeor (10 × poids + 6,25 × taille − 5 × âge, +5 pour un homme, −161 pour une
              femme), multiplié par ton coefficient d'activité. Le poids utilisé est ta moyenne lissée sur 7 jours.
            </p>
            <p className="text-zinc-500">
              C'est une estimation de population : l'écart réel peut dépasser ±10 %, et le coefficient d'activité est souvent surestimé.
            </p>
          </section>
          <section className="space-y-1">
            <h3 className="font-semibold text-zinc-100">TDEE adaptatif</h3>
            <p>
              Calculé à partir de tes vraies données : apport calorique moyen − variation de poids × {KCAL_PER_KG.toLocaleString('fr-FR')} kcal/kg.
              La variation est la pente d'une régression linéaire sur ton poids lissé, sur une fenêtre glissante (21 jours par défaut).
            </p>
            <p>
              Seuls les jours où tu as loggé au moins {MIN_LOGGED_KCAL} kcal comptent. Il faut au moins {MIN_COVERED_DAYS} jours d'historique,{' '}
              {MIN_LOGGED_DAYS} jours loggés et {MIN_WEIGH_INS} pesées.
            </p>
            <p className="text-zinc-500">
              Limites : sa fiabilité dépend de la précision de tes logs (oublis, huiles, sauces). Les variations d'eau (sel, glucides, cycle,
              reprise de l'entraînement) faussent la tendance à court terme. Une prise de muscle n'a pas la même valeur calorique qu'une prise
              de gras. Plus la fenêtre est longue et les données régulières, plus la valeur est fiable.
            </p>
          </section>
        </div>
      </Sheet>
    </>
  )
}
