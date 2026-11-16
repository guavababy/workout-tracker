import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { MUSCLE_GROUPS } from '../lib/exercises.js'

export default function ExercisePicker({ exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchGroup = group === 'All' || ex.muscle_group === group
    return matchSearch && matchGroup
  })

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-zinc-800">
        <button onClick={onClose} className="p-1 -ml-1">
          <X size={22} className="text-zinc-400" />
        </button>
        <h2 className="font-semibold text-lg">Add Exercise</h2>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-zinc-500 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-white placeholder-zinc-600 outline-none text-sm"
            placeholder="Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Muscle group chips */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2">
          {MUSCLE_GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                group === g ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(ex => (
          <button
            key={ex.id}
            onClick={() => onSelect(ex)}
            className="w-full flex items-center px-4 py-3.5 border-b border-zinc-900 active:bg-zinc-900 text-left"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{ex.name}</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {ex.muscle_group} · {ex.category}
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-zinc-600 py-16 text-sm">No exercises found</div>
        )}
      </div>
    </div>
  )
}
