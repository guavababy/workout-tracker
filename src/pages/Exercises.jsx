import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { MUSCLE_GROUPS } from '../lib/exercises.js'

export default function Exercises() {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => {
      setExercises(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchGroup = group === 'All' || ex.muscle_group === group
    return matchSearch && matchGroup
  })

  const grouped = filtered.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = []
    acc[ex.muscle_group].push(ex)
    return acc
  }, {})

  return (
    <div className="pt-14 pb-28">
      <div className="px-4 mb-4">
        <h1 className="text-3xl font-bold mb-5">Exercises</h1>

        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2.5 mb-3">
          <Search size={16} className="text-zinc-600 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-white placeholder-zinc-600 outline-none text-sm"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2">
            {MUSCLE_GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  group === g ? 'bg-indigo-500 text-white' : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-700 text-sm px-4 py-4">Loading…</div>
      ) : (
        <>
          {Object.entries(grouped).map(([groupName, exes]) => (
            <div key={groupName}>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-black sticky top-0">
                {groupName}
              </div>
              {exes.map(ex => (
                <div key={ex.id} className="flex items-center px-4 py-3.5 border-b border-zinc-900">
                  <div>
                    <div className="text-sm font-medium">{ex.name}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{ex.category}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-zinc-600 py-16 text-sm px-4">
              No exercises found
            </div>
          )}
        </>
      )}
    </div>
  )
}
