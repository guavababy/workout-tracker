import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Dumbbell, LayoutTemplate, Trash2, X, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { getWorkoutRecommendation } from '../lib/claude.js'

export default function Home() {
  const navigate = useNavigate()
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [startingSuggestion, setStartingSuggestion] = useState(false)
  const hasActive = !!localStorage.getItem('activeWorkout')

  useEffect(() => {
    supabase
      .from('workouts')
      .select('id, name, started_at, finished_at')
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setRecentWorkouts(data || [])
        setLoading(false)
      })
  }, [])

  async function openTemplates() {
    const { data } = await supabase
      .from('templates')
      .select('id, name, template_exercises(count)')
      .order('created_at', { ascending: false })
    setTemplates(data || [])
    setShowTemplates(true)
  }

  async function getSuggestion() {
    setLoadingSuggestion(true)
    setSuggestionError('')
    setSuggestion(null)
    setShowSuggestion(true)
    try {
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, name, started_at, workout_exercises(exercise_name, sets(weight, reps, set_number))')
        .not('finished_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(7)
      const result = await getWorkoutRecommendation(workouts || [])
      setSuggestion(result)
    } catch (err) {
      setSuggestionError(err.message || 'Something went wrong')
    } finally {
      setLoadingSuggestion(false)
    }
  }

  async function startSuggestion() {
    if (!suggestion) return
    setStartingSuggestion(true)

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ name: suggestion.name, started_at: new Date().toISOString() })
      .select()
      .single()

    if (error) { console.error(error); setStartingSuggestion(false); return }

    // Fetch existing exercises to match by name
    const { data: allExercises } = await supabase.from('exercises').select('id, name, muscle_group')

    let nextId = 1
    const exercises = suggestion.exercises.map(se => {
      const match = (allExercises || []).find(
        e => e.name.toLowerCase() === se.name.toLowerCase()
      )
      const sets = Array.from({ length: se.sets || 3 }, () => ({
        id: nextId++, weight: '', reps: '', completed: false,
      }))
      return {
        exerciseId: match?.id || null,
        name: se.name,
        muscleGroup: match?.muscle_group || '',
        sets,
        note: se.notes || '',
        restSeconds: se.rest_seconds || null,
        isBodyweight: false,
        supersetGroup: null,
      }
    })

    localStorage.setItem('activeWorkout', JSON.stringify({ workout, exercises, nextSetId: nextId }))
    setStartingSuggestion(false)
    setShowSuggestion(false)
    navigate('/workout/active')
  }

  async function deleteTemplate(e, templateId) {
    e.stopPropagation()
    await supabase.from('templates').delete().eq('id', templateId)
    setTemplates(prev => prev.filter(t => t.id !== templateId))
  }

  async function startWorkout(template = null) {
    if (hasActive && !template) {
      navigate('/workout/active')
      return
    }

    if (template) setLoadingTemplate(true)

    const hour = new Date().getHours()
    const defaultName = hour < 12 ? 'Morning Workout' : hour < 17 ? 'Afternoon Workout' : 'Evening Workout'
    const name = template ? template.name : defaultName

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ name, started_at: new Date().toISOString() })
      .select()
      .single()

    if (error) { console.error(error); setLoadingTemplate(false); return }

    let exercises = []

    if (template) {
      // Load template exercises
      const { data: templateExercises } = await supabase
        .from('template_exercises')
        .select('exercise_id, exercise_name, rest_seconds, exercises(muscle_group)')
        .eq('template_id', template.id)
        .order('order_index')

      let nextId = 1

      // For each exercise, fetch last performance to pre-fill sets
      exercises = await Promise.all((templateExercises || []).map(async (te) => {
        const { data: we } = await supabase
          .from('workout_exercises')
          .select('id, sets(weight, reps, set_number)')
          .eq('exercise_id', te.exercise_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const lastSets = (we?.sets || [])
          .sort((a, b) => a.set_number - b.set_number)
          .map(s => ({
            id: nextId++,
            weight: s.weight != null ? String(s.weight) : '',
            reps: s.reps != null ? String(s.reps) : '',
            completed: false,
          }))

        return {
          exerciseId: te.exercise_id,
          name: te.exercise_name,
          muscleGroup: te.exercises?.muscle_group || '',
          sets: lastSets.length > 0 ? lastSets : [{ id: nextId++, weight: '', reps: '', completed: false }],
          restSeconds: te.rest_seconds || null,
          isBodyweight: false,
          supersetGroup: null,
        }
      }))

      localStorage.setItem('activeWorkout', JSON.stringify({ workout, exercises, nextSetId: exercises.reduce((n, e) => n + e.sets.length, 1) + 1 }))
      setLoadingTemplate(false)
      setShowTemplates(false)
    } else {
      localStorage.setItem('activeWorkout', JSON.stringify({ workout, exercises: [], nextSetId: 1 }))
    }

    navigate('/workout/active')
  }

  function relativeDate(iso) {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function duration(start, end) {
    const mins = Math.floor((new Date(end) - new Date(start)) / 60000)
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <div className="px-4 pt-14 pb-28">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workout</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => startWorkout()}
          className="flex-1 bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          {hasActive ? 'Resume' : <><Plus size={20} /> Start</>}
        </button>
        <button
          onClick={openTemplates}
          className="flex-1 bg-zinc-900 active:bg-zinc-800 text-zinc-200 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          <LayoutTemplate size={18} />
          Templates
        </button>
      </div>

      <button
        onClick={getSuggestion}
        className="w-full bg-zinc-900 active:bg-zinc-800 text-amber-400 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors mb-10"
      >
        <Sparkles size={17} />
        Suggest a Workout
      </button>

      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recent</h2>

        {loading ? (
          <div className="text-zinc-700 text-sm py-4">Loading…</div>
        ) : recentWorkouts.length === 0 ? (
          <div className="text-center py-16 text-zinc-700">
            <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No workouts yet. Start your first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map(w => (
              <button
                key={w.id}
                onClick={() => navigate(`/history/${w.id}`)}
                className="w-full bg-zinc-900 rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-zinc-800 transition-colors"
              >
                <div className="text-left">
                  <div className="font-medium text-sm">{w.name || 'Workout'}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {relativeDate(w.started_at)}
                    {w.finished_at && ` · ${duration(w.started_at, w.finished_at)}`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-700" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggestion sheet */}
      {showSuggestion && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-zinc-950 w-full rounded-t-3xl max-h-[85vh] flex flex-col max-w-lg mx-auto border-t border-zinc-800">
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" /> Suggested Workout
              </h2>
              <button onClick={() => setShowSuggestion(false)}>
                <X size={22} className="text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingSuggestion && (
                <div className="text-center py-16 text-zinc-600 text-sm">
                  <Sparkles size={32} className="mx-auto mb-3 opacity-30 animate-pulse text-amber-400" />
                  <p>Analyzing your workouts…</p>
                </div>
              )}

              {suggestionError && (
                <div className="text-center py-8 text-red-400 text-sm">
                  <p className="mb-2">Could not get suggestion</p>
                  <p className="text-zinc-600 text-xs">{suggestionError}</p>
                  <p className="text-zinc-700 text-xs mt-3">Make sure VITE_ANTHROPIC_API_KEY is set in your .env file</p>
                </div>
              )}

              {suggestion && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{suggestion.name}</h3>
                    <p className="text-zinc-500 text-sm mt-1">{suggestion.reasoning}</p>
                  </div>

                  <div className="space-y-2">
                    {(suggestion.exercises || []).map((ex, i) => (
                      <div key={i} className="bg-zinc-900 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{ex.name}</p>
                          <span className="text-xs text-indigo-400 font-medium">
                            {ex.sets} × {ex.reps}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {ex.rest_seconds && (
                            <span className="text-xs text-zinc-500">
                              {ex.rest_seconds >= 60
                                ? `${Math.floor(ex.rest_seconds / 60)}${ex.rest_seconds % 60 ? `:${String(ex.rest_seconds % 60).padStart(2, '0')}` : ' min'} rest`
                                : `${ex.rest_seconds}s rest`}
                            </span>
                          )}
                          {ex.notes && (
                            <p className="text-xs text-zinc-600">{ex.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {suggestion && (
              <div className="px-4 py-4 border-t border-zinc-800 space-y-2">
                <button
                  onClick={startSuggestion}
                  disabled={startingSuggestion}
                  className="w-full py-4 bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-2xl"
                >
                  {startingSuggestion ? 'Starting…' : 'Start this Workout'}
                </button>
                <button
                  onClick={() => { setSuggestion(null); getSuggestion() }}
                  className="w-full py-3 bg-zinc-800 text-zinc-400 font-medium rounded-xl text-sm"
                >
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template sheet */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-zinc-950 w-full rounded-t-3xl max-h-[80vh] flex flex-col max-w-lg mx-auto border-t border-zinc-800">
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-lg">Templates</h2>
              <button onClick={() => setShowTemplates(false)}>
                <X size={22} className="text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="text-center py-16 text-zinc-600 text-sm px-6">
                  <LayoutTemplate size={36} className="mx-auto mb-3 opacity-30" />
                  <p>No templates yet.</p>
                  <p className="mt-1 text-zinc-700">Open any past workout in History and tap "Save as Template".</p>
                </div>
              ) : (
                templates.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center border-b border-zinc-900"
                  >
                    <button
                      onClick={() => startWorkout(t)}
                      disabled={loadingTemplate}
                      className="flex-1 flex items-center justify-between px-4 py-4 active:bg-zinc-900 text-left"
                    >
                      <div>
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {t.template_exercises?.[0]?.count ?? 0} exercises
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-zinc-600" />
                    </button>
                    <button
                      onClick={e => deleteTemplate(e, t.id)}
                      className="px-4 py-4 text-zinc-700 active:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {loadingTemplate && (
              <div className="px-4 py-3 border-t border-zinc-800 text-center text-sm text-zinc-500">
                Loading template…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
