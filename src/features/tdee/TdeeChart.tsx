import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtInt, fmtShortDate } from '../../lib/format'
import type { WeeklyPoint } from './tdee'

/** Évolution hebdomadaire du TDEE adaptatif, avec l'apport moyen de la semaine. */
export default function TdeeChart({ points }: { points: WeeklyPoint[] }) {
  const data = points.map((p) => ({ week: fmtShortDate(p.weekStart + 'T12:00:00'), tdee: p.tdee, intake: p.avgIntake }))
  return (
    <div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={48} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
              labelStyle={{ color: '#a1a1aa' }}
              labelFormatter={(l) => `Semaine du ${l}`}
              formatter={(v, name) => [`${fmtInt(Number(v))} kcal`, name === 'tdee' ? 'TDEE adaptatif' : 'Apport moyen']}
            />
            <Line type="monotone" dataKey="intake" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="tdee" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 3, fill: '#a3e635' }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-lime-400" />TDEE adaptatif</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t border-dashed border-zinc-500" />Apport moyen</span>
      </div>
    </div>
  )
}
