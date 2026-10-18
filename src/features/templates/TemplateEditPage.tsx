import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { btnDanger, btnPrimary, card, input } from '../../components/ui'
import { db } from '../../db/db'
import type { PlanItem, Template } from '../../db/types'
import { ExercisePicker } from '../exercises/ExercisePicker'
import { useStartWorkout } from '../workouts/WorkoutsHome'

export default function TemplateEditPage() {
  const id = Number(useParams().id)
  const template = useLiveQuery(() => db.templates.get(id), [id])
  if (template === undefined) return null
  if (!template) return <PageHeader title="Modèle introuvable" backTo="/modeles" />
  return <TemplateEditor template={template} />
}

function TemplateEditor({ template }: { template: Template }) {
  const navigate = useNavigate()
  const start = useStartWorkout()
  const [name, setName] = useState(template.name)
  const [picker, setPicker] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.bulkGet(template.items.map((i) => i.exerciseId)), [template.items])

  useEffect(() => setName(template.name), [template.name])

  const save = (patch: Partial<Template>) => db.templates.update(template.id, { ...patch, updatedAt: new Date().toISOString() })
  const setItems = (items: PlanItem[]) => save({ items })

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= template.items.length) return
    const items = [...template.items]
    ;[items[idx], items[j]] = [items[j], items[idx]]
    void setItems(items)
  }

  const smallBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 active:bg-zinc-700 disabled:opacity-30'

  return (
    <div>
      <PageHeader title="Modifier le modèle" backTo="/modeles" />
      <div className="space-y-4 px-3 pb-6">
        <input
          className={`${input} text-lg font-semibold`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && void save({ name: name.trim() })}
          aria-label="Nom du modèle"
        />

        <ul className="space-y-2">
          {template.items.map((item, idx) => (
            <li key={item.exerciseId} className={`${card} space-y-2 p-3`}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-semibold">{exercises?.[idx]?.name ?? '…'}</span>
                <button type="button" className={smallBtn} disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Monter">↑</button>
                <button type="button" className={smallBtn} disabled={idx === template.items.length - 1} onClick={() => move(idx, 1)} aria-label="Descendre">↓</button>
                <button type="button" className={`${smallBtn} text-red-400`} onClick={() => void setItems(template.items.filter((i) => i !== item))} aria-label="Retirer">✕</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-zinc-400">Séries</span>
                <button type="button" className={smallBtn} onClick={() => void setItems(template.items.map((i) => (i === item ? { ...i, targetSets: Math.max(1, i.targetSets - 1) } : i)))}>−</button>
                <span className="w-8 text-center font-mono text-lg">{item.targetSets}</span>
                <button type="button" className={smallBtn} onClick={() => void setItems(template.items.map((i) => (i === item ? { ...i, targetSets: i.targetSets + 1 } : i)))}>+</button>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => setPicker(true)} className="min-h-14 w-full rounded-2xl border border-dashed border-zinc-700 font-medium text-lime-400 active:bg-zinc-900">
          + Ajouter des exercices
        </button>

        <button type="button" className={`${btnPrimary} min-h-14 w-full`} disabled={template.items.length === 0} onClick={() => void start(template.name, template.items, template.id)}>
          Lancer la séance
        </button>
        <button
          type="button"
          className={`${btnDanger} w-full`}
          onClick={async () => {
            if (!confirm(`Supprimer le modèle « ${template.name} » ? Les séances déjà faites sont conservées.`)) return
            await db.templates.delete(template.id)
            navigate('/modeles', { replace: true })
          }}
        >
          Supprimer le modèle
        </button>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ids) => {
          const fresh = ids.filter((id) => !template.items.some((i) => i.exerciseId === id))
          void setItems([...template.items, ...fresh.map((exerciseId) => ({ exerciseId, targetSets: 3 }))])
        }}
      />
    </div>
  )
}
