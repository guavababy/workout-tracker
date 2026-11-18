import { useState } from 'react'
import { Search, X, Plus, ChevronLeft } from 'lucide-react'
import { MUSCLE_GROUPS } from '../lib/exercises.js'
import { supabase } from '../lib/supabase.js'

const CATEGORIES = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other']
const MG_OPTIONS = MUSCLE_GROUPS.filter(g => g !== 'All')

export default function ExercisePicker({ exercises, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMG, setNewMG] = useState('Chest')
  const [newCat, setNewCat] = useState('Barbell')
  const [saving, setSaving] = useState(false)

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchGroup = group === 'All' || ex.muscle_group === group
    return matchSearch && matchGroup
  })

  function openCreate() {
    setNewName(search)
    setCreating(true)
  }

  async function saveExercise() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name, muscle_group: newMG, category: newCat })
      .select()
      .single()
    setSaving(false)
    if (!error && data) onSelect(data)
  }

  if (creating) {
    return (
      <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-zinc-800">
          <button onClick={() => setCreating(false)} className="p-1 -ml-1">
            <ChevronLeft size={22} className="text-zinc-400" />
          </button>
          <h2 className="font-semibold text-lg">New Exercise</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Name</label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Romanian Deadlift"
              className="w-full bg-zinc-900 rounded-xl px-4 py-3 text-sm outline-none border border-zinc-800 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Muscle Group</label>
            <div className="flex flex-wrap gap-2">
              {MG_OPTIONS.map(mg => (
                <button
                  key={mg}
                  onClick={() => setNewMG(mg)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    newMG === mg ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {mg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    newCat === cat ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-zinc-800">
          <button
            onClick={saveExercise}
            disabled={!newName.trim() || saving}
            className="w-full py-4 bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-2xl"
          >
            {saving ? 'Saving…' : 'Create Exercise'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-zinc-800">
        <button onClick={onClose} className="p-1 -ml-1">
          <X size={22} className="text-zinc-400" />
        </button>
        <h2 className="font-semibold text-lg flex-1">Add Exercise</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 text-indigo-400 text-sm font-medium"
        >
          <Plus size={15} /> New
        </button>
      </div>

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
          <div className="text-center text-zinc-600 py-12 text-sm px-4">
            <p>No exercises found</p>
            <button
              onClick={openCreate}
              className="mt-3 text-indigo-400 font-medium flex items-center gap-1 mx-auto"
            >
              <Plus size={15} /> Create "{search || 'new exercise'}"
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
