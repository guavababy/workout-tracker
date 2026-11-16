import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutTemplate, Check, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function WorkoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(null)
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedTemplate, setSavedTemplate] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('workouts').select('*').eq('id', id).single(),
      supabase
        .from('workout_exercises')
        .select('*, sets(*)')
        .eq('workout_id', id)
        .order('order_index'),
    ]).then(([{ data: w }, { data: exes }]) => {
      setWorkout(w)
      setNameValue(w?.name || '')
      setExercises((exes || []).map(ex => ({
        ...ex,
        sets: (ex.sets || []).sort((a, b) => a.set_number - b.set_number),
      })))
      setLoading(false)
    })
  }, [id])

  async function deleteWorkout() {
    await supabase.from('workouts').delete().eq('id', workout.id)
    navigate('/history')
  }

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === workout.name) { setEditingName(false); return }
    await supabase.from('workouts').update({ name: trimmed }).eq('id', workout.id)
    setWorkout(prev => ({ ...prev, name: trimmed }))
    setEditingName(false)
  }

  async function saveAsTemplate() {
    if (savedTemplate || savingTemplate) return
    setSavingTemplate(true)

    try {
      // Check if a template with this name already exists
      const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('name', workout.name || 'Workout')
        .maybeSingle()

      let templateId

      if (existing) {
        // Overwrite: delete old exercises and replace
        await supabase.from('template_exercises').delete().eq('template_id', existing.id)
        templateId = existing.id
      } else {
        const { data: t } = await supabase
          .from('templates')
          .insert({ name: workout.name || 'Workout' })
          .select('id')
          .single()
        templateId = t.id
      }

      const rows = exercises.map((ex, i) => ({
        template_id: templateId,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        order_index: ex.order_index ?? i,
        rest_seconds: ex.rest_seconds || null,
      }))

      await supabase.from('template_exercises').insert(rows)
      setSavedTemplate(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingTemplate(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-zinc-600 text-sm">
        Loading…
      </div>
    )
  }
  if (!workout) return null

  const duration = workout.finished_at
    ? Math.floor((new Date(workout.finished_at) - new Date(workout.started_at)) / 60000)
    : null

  const totalVolume = exercises.reduce(
    (total, ex) => total + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0),
    0,
  )

  return (
    <div className="px-4 pt-10 pb-28 bg-black min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">History</span>
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-zinc-700 active:text-red-400"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 mr-3">
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-2xl font-bold bg-zinc-900 rounded-xl px-3 py-1 w-full outline-none border border-indigo-500"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 group text-left"
            >
              <h1 className="text-2xl font-bold">{workout.name || 'Workout'}</h1>
              <Pencil size={14} className="text-zinc-700 group-active:text-zinc-400 shrink-0 mt-1" />
            </button>
          )}
        </div>
        <button
          onClick={saveAsTemplate}
          disabled={savingTemplate}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            savedTemplate
              ? 'bg-green-500/20 text-green-400'
              : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'
          }`}
        >
          {savedTemplate ? (
            <><Check size={12} /> Saved</>
          ) : (
            <><LayoutTemplate size={12} /> Save as Template</>
          )}
        </button>
      </div>

      <p className="text-zinc-500 text-sm mb-6">
        {new Date(workout.started_at).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        })}
        {' · '}
        {new Date(workout.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat
          label="Duration"
          value={duration != null ? (duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`) : '—'}
        />
        <Stat label="Exercises" value={exercises.length} />
        <Stat
          label="Volume"
          value={totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : '—'}
        />
      </div>

      <div className="space-y-4">
        {exercises.map(ex => (
          <div key={ex.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 font-semibold text-sm">{ex.exercise_name}</div>
            <div className="border-t border-zinc-800">
              {ex.sets.map(set => (
                <div key={set.id} className="flex items-center px-4 py-2.5 border-b border-zinc-800 last:border-0">
                  <span className="w-12 text-xs text-zinc-500">Set {set.set_number}</span>
                  <span className="flex-1 text-sm">
                    {set.weight != null && set.reps != null
                      ? `${set.weight} lbs × ${set.reps} reps`
                      : set.weight != null
                      ? `${set.weight} lbs`
                      : set.reps != null
                      ? `${set.reps} reps`
                      : set.duration_seconds != null
                      ? `${set.duration_seconds}s`
                      : '—'}
                  </span>
                  {set.set_type && set.set_type !== 'normal' && (
                    <span className="text-xs text-zinc-600 capitalize">{set.set_type}</span>
                  )}
                  {set.completed && (
                    <span className="text-xs text-indigo-400 font-medium ml-2">✓</span>
                  )}
                </div>
              ))}
              {ex.sets.length === 0 && (
                <div className="px-4 py-3 text-xs text-zinc-600">No sets logged</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-zinc-900 w-full rounded-t-3xl p-6 max-w-lg mx-auto">
            <h3 className="font-semibold text-lg mb-1">Delete Workout?</h3>
            <p className="text-zinc-400 text-sm mb-6">This can't be undone.</p>
            <div className="space-y-3">
              <button
                onClick={deleteWorkout}
                className="w-full py-4 bg-red-500/20 text-red-400 font-semibold rounded-2xl"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-4 bg-zinc-800 text-zinc-300 font-medium rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-3 text-center">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  )
}
