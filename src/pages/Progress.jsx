import { useState, useEffect } from 'react'
import { TrendingUp, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'

const MG_COLORS = ['#6366f1','#10b981','#f59e0b','#3b82f6','#a855f7','#f43f5e','#06b6d4','#84cc16','#71717a']

export default function Progress() {
  const [usedExercises, setUsedExercises] = useState([])
  const [selected, setSelected] = useState('')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [weeklyVolume, setWeeklyVolume] = useState([])
  const [weeklyGroups, setWeeklyGroups] = useState([])

  useEffect(() => {
    supabase
      .from('sets')
      .select('exercise_id, exercises(name, muscle_group)')
      .not('exercise_id', 'is', null)
      .then(({ data }) => {
        if (!data) return
        const seen = new Map()
        data.forEach(r => {
          if (!seen.has(r.exercise_id) && r.exercises) {
            seen.set(r.exercise_id, { id: r.exercise_id, name: r.exercises.name, group: r.exercises.muscle_group })
          }
        })
        setUsedExercises([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)))
      })

    loadWeeklyVolume()
  }, [])

  async function loadWeeklyVolume() {
    const eightWeeksAgo = new Date()
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

    const { data } = await supabase
      .from('workouts')
      .select('started_at, workout_exercises(exercises(muscle_group), sets(weight, reps))')
      .not('finished_at', 'is', null)
      .gte('started_at', eightWeeksAgo.toISOString())
      .order('started_at')

    if (!data?.length) return

    const weekMap = new Map()
    for (const w of data) {
      const date = new Date(w.started_at)
      const day = date.getDay()
      const monday = new Date(date)
      monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
      const weekKey = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, { week: weekKey })
      const row = weekMap.get(weekKey)
      for (const we of (w.workout_exercises || [])) {
        const mg = we.exercises?.muscle_group || 'Other'
        if (!row[mg]) row[mg] = 0
        for (const s of (we.sets || [])) {
          row[mg] = Math.round(row[mg] + (s.weight || 0) * (s.reps || 0))
        }
      }
    }

    const rows = [...weekMap.values()]
    const mgTotals = {}
    rows.forEach(row => {
      Object.keys(row).filter(k => k !== 'week').forEach(mg => {
        mgTotals[mg] = (mgTotals[mg] || 0) + row[mg]
      })
    })
    const groups = Object.keys(mgTotals).sort((a, b) => mgTotals[b] - mgTotals[a])

    setWeeklyVolume(rows)
    setWeeklyGroups(groups)
  }

  async function loadChart(exerciseId) {
    setSelected(exerciseId)
    setLoading(true)

    const { data } = await supabase
      .from('sets')
      .select('weight, reps, completed, workout_exercises!inner(workouts!inner(started_at))')
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .not('weight', 'is', null)

    if (!data || data.length === 0) {
      setChartData([])
      setLoading(false)
      return
    }

    const byDate = new Map()
    data.forEach(row => {
      const dateStr = new Date(row.workout_exercises.workouts.started_at)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const existing = byDate.get(dateStr) || { date: dateStr, maxWeight: 0, est1RM: 0, bestReps: 0, volume: 0 }
      const w = row.weight || 0
      const r = row.reps || 0
      existing.maxWeight = Math.max(existing.maxWeight, w)
      const e1rm = r > 0 ? Math.round(w * (1 + r / 30) * 10) / 10 : w
      if (e1rm > existing.est1RM) {
        existing.est1RM = e1rm
        existing.bestWeight = w
        existing.bestReps = r
      }
      existing.volume += w * r
      byDate.set(dateStr, existing)
    })

    setChartData([...byDate.values()])
    setLoading(false)
  }

  const selectedEx = usedExercises.find(e => e.id === selected)
  const personalBest = chartData.length > 0
    ? chartData.reduce((b, d) => d.est1RM > b.est1RM ? d : b, chartData[0])
    : null

  const tooltipStyle = {
    contentStyle: { background: '#18181b', border: '1px solid #27272a', borderRadius: 10, fontSize: 12 },
    labelStyle: { color: '#fff' },
    itemStyle: { color: '#818cf8' },
  }

  return (
    <div className="px-4 pt-14 pb-28">
      <h1 className="text-3xl font-bold mb-6">Progress</h1>

      {usedExercises.length === 0 ? (
        <div className="text-center py-16 text-zinc-700">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Complete workouts to track progress</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
              Exercise
            </label>
            <select
              value={selected}
              onChange={e => loadChart(e.target.value)}
              className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3 text-sm outline-none border border-zinc-800 appearance-none"
            >
              <option value="" disabled>Choose an exercise…</option>
              {usedExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {loading && <div className="text-zinc-700 text-sm py-4">Loading…</div>}

          {!loading && selected && chartData.length === 0 && (
            <div className="text-center text-zinc-600 text-sm py-8">
              No completed sets with weight for this exercise yet.
            </div>
          )}

          {!loading && chartData.length > 0 && (
            <div className="space-y-4 mb-8">
              {/* Personal best banner */}
              {personalBest && (
                <div className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-4">
                  <Trophy size={22} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Personal Best · {selectedEx?.name}</p>
                    <p className="font-bold text-sm">
                      {personalBest.bestWeight} lbs × {personalBest.bestReps} reps
                    </p>
                    <p className="text-xs text-zinc-500">
                      Est. 1RM: {personalBest.est1RM} lbs · {personalBest.date}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-1 text-zinc-200">
                  {selectedEx?.name} — Strength (lbs)
                </p>
                <p className="text-xs text-zinc-600 mb-4">Est. 1RM uses Epley formula: weight × (1 + reps/30)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#52525b' }} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v, name) => [
                        `${v} lbs`,
                        name === 'maxWeight' ? 'Max weight' : 'Est. 1RM',
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#71717a' }}
                      formatter={name => name === 'maxWeight' ? 'Max weight' : 'Est. 1RM'}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="est1RM"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ fill: '#f59e0b', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-4 text-zinc-200">
                  {selectedEx?.name} — Volume (lbs)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#52525b' }} />
                    <Tooltip {...tooltipStyle} formatter={v => [`${v.toLocaleString()} lbs`, 'Volume']} />
                    <Bar dataKey="volume" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Weekly volume by muscle group */}
          {weeklyVolume.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4">
              <p className="text-sm font-semibold mb-1 text-zinc-200">Weekly Volume by Muscle Group</p>
              <p className="text-xs text-zinc-600 mb-4">Last 8 weeks · weighted exercises only</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyVolume} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#52525b' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 10, fontSize: 12 }}
                    formatter={(v, name) => [`${v.toLocaleString()} lbs`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                  {weeklyGroups.map((mg, i) => (
                    <Bar
                      key={mg}
                      dataKey={mg}
                      stackId="a"
                      fill={MG_COLORS[i % MG_COLORS.length]}
                      radius={i === weeklyGroups.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
