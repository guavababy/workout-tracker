import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Dumbbell } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function History() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('workouts')
      .select('id, name, started_at, finished_at')
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setWorkouts(data || [])
        setLoading(false)
      })
  }, [])

  function duration(start, end) {
    const mins = Math.floor((new Date(end) - new Date(start)) / 60000)
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  // Group by month
  const grouped = workouts.reduce((acc, w) => {
    const key = new Date(w.started_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(w)
    return acc
  }, {})

  return (
    <div className="px-4 pt-14 pb-28">
      <h1 className="text-3xl font-bold mb-6">History</h1>

      {loading ? (
        <div className="text-zinc-700 text-sm py-4">Loading…</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 text-zinc-700">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No completed workouts yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, ws]) => (
          <div key={month} className="mb-6">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{month}</div>
            <div className="space-y-2">
              {ws.map(w => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/history/${w.id}`)}
                  className="w-full bg-zinc-900 rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-zinc-800"
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">{w.name || 'Workout'}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {new Date(w.started_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                      {w.finished_at && ` · ${duration(w.started_at, w.finished_at)}`}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-700" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
