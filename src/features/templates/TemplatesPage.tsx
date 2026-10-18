import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { btnGhost, btnPrimary, card } from '../../components/ui'
import { db } from '../../db/db'
import { useStartWorkout } from '../workouts/WorkoutsHome'

export default function TemplatesPage() {
  const navigate = useNavigate()
  const start = useStartWorkout()
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const nameOf = (id: number) => exercises?.find((e) => e.id === id)?.name ?? '?'

  const create = async () => {
    const id = await db.templates.add({ name: 'Nouveau modèle', items: [], updatedAt: new Date().toISOString() })
    navigate(`/modeles/${id}`)
  }

  return (
    <div>
      <PageHeader title="Modèles" backTo="/" right={<button type="button" onClick={() => void create()} className={btnGhost}>+ Nouveau</button>} />
      <ul className="space-y-2 px-3 pb-6">
        {templates?.length === 0 && <p className="px-1 text-zinc-500">Aucun modèle. Crée-en un pour lancer tes séances en un tap.</p>}
        {templates?.map((t) => (
          <li key={t.id} className={`${card} flex items-center gap-2 p-2 pl-4`}>
            <Link to={`/modeles/${t.id}`} className="min-w-0 flex-1 py-2">
              <span className="block font-semibold">{t.name}</span>
              <span className="block truncate text-sm text-zinc-500">{t.items.map((i) => nameOf(i.exerciseId)).join(', ') || 'Vide'}</span>
            </Link>
            <button type="button" onClick={() => void start(t.name, t.items, t.id)} className={btnPrimary}>
              Lancer
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
