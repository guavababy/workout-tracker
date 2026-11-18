import { useState, useEffect } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { MUSCLE_GROUPS } from '../lib/exercises.js'

const CATEGORIES = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other']
const MG_OPTIONS = MUSCLE_GROUPS.filter(g => g !== 'All')

export default function Exercises() {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMG, setNewMG] = useState('Chest')
  const [newCat, setNewCat] = useState('Barbell')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => {
      setExercises(data || [])
      setLoading(false)
    })
  }, [])

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
    if (!error && data) {
      setExercises(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setShowCreate(false)
      setNewName('')
      setNewMG('Chest')
      setNewCat('Barbell')
    }
  }

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
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-3xl font-bold">Exercises</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-zinc-900 text-indigo-400 text-sm font-medium px-3 py-2 rounded-xl active:bg-zinc-800"
          >
            <Plus size={15} /> New
          </button>
        </div>

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

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-zinc-950 w-full rounded-t-3xl max-h-[90vh] flex flex-col max-w-lg mx-auto border-t border-zinc-800">
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-lg">New Exercise</h2>
              <button onClick={() => setShowCreate(false)}>
                <X size={22} className="text-zinc-500" />
              </button>
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
        </div>
      )}
    </div>
  )
}
