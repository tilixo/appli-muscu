import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtNumber, fmtShortDate } from '../../lib/format'
import { dayNumber, fromDayNumber } from '../tdee/tdee'

export interface WeightPoint {
  date: string
  raw: number
  smooth: number
}

const label = (n: number) => fmtShortDate(fromDayNumber(n) + 'T12:00:00')

/** Pesées brutes (points) et moyenne lissée sur 7 jours (ligne). */
export default function WeightChart({ points }: { points: WeightPoint[] }) {
  const data = points.map((p) => ({ x: dayNumber(p.date), raw: p.raw, smooth: Math.round(p.smooth * 10) / 10 }))
  return (
    <div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#27272a" vertical={false} />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickFormatter={label} tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} tickFormatter={(v) => fmtNumber(Math.round(v * 10) / 10)} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
              labelStyle={{ color: '#a1a1aa' }}
              labelFormatter={(l) => label(Number(l))}
              formatter={(v, name) => [`${fmtNumber(Number(v))} kg`, name === 'smooth' ? 'Moyenne 7 j' : 'Pesée']}
            />
            <Line dataKey="raw" stroke="none" dot={{ r: 2.5, fill: '#71717a', stroke: 'none' }} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line dataKey="smooth" type="monotone" stroke="#a3e635" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-500" />Pesée</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-lime-400" />Moyenne 7 jours</span>
      </div>
    </div>
  )
}
