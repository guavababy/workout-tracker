import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, X, Trash2, LayoutTemplate, Link2, Trophy, ChevronUp, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ExercisePicker from '../components/ExercisePicker.jsx'

const SUPERSET_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#f43f5e', '#3b82f6', '#a855f7']

export default function ActiveWorkout() {
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(null)
  const [exercises, setExercises] = useState([])
  const [previousPerformance, setPreviousPerformance] = useState({})
  const [records, setRecords] = useState({}) // historical best est1RM per exercise
  const [newPRs, setNewPRs] = useState(0)
  const [allExercises, setAllExercises] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [congrats, setCongrats] = useState(null)
  const [savedTemplate, setSavedTemplate] = useState(false)
  const [timer, setTimer] = useState(0)
  const [restTimer, setRestTimer] = useState(null) // { remaining, total, exerciseName }
  const nextId = useRef(1)
  const nextSupersetId = useRef(1)
  const sessionBests = useRef({})

  useEffect(() => {
    const stored = localStorage.getItem('activeWorkout')
    if (!stored) { navigate('/'); return }
    const data = JSON.parse(stored)
    setWorkout(data.workout)
    setExercises(data.exercises || [])
    nextId.current = data.nextSetId || 1
    nextSupersetId.current = data.nextSupersetId || 1
  }, [])

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => setAllExercises(data || []))
  }, [])

  useEffect(() => {
    if (!workout || exercises.length === 0) return
    const ids = exercises.map(e => e.exerciseId).filter(Boolean)
    if (ids.length > 0) {
      fetchPreviousPerformance(ids)
      fetchRecords(ids)
    }
  }, [workout?.id, exercises.map(e => e.exerciseId).join(',')])

  async function fetchPreviousPerformance(exerciseIds) {
    const perf = {}
    await Promise.all(exerciseIds.map(async (exerciseId) => {
      const { data: we } = await supabase
        .from('workout_exercises')
        .select('id, workouts!inner(started_at), sets(weight, reps, set_number, duration_seconds)')
        .eq('exercise_id', exerciseId)
        .neq('workout_id', workout.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (we?.sets?.length > 0) {
        perf[exerciseId] = {
          date: we.workouts.started_at,
          sets: (we.sets || []).sort((a, b) => a.set_number - b.set_number),
        }
      }
    }))
    setPreviousPerformance(perf)
  }

  async function fetchRecords(exerciseIds) {
    const { data } = await supabase
      .from('sets')
      .select('exercise_id, weight, reps')
      .in('exercise_id', exerciseIds)
      .not('weight', 'is', null)
      .not('reps', 'is', null)
      .gt('weight', 0)
      .gt('reps', 0)
    const best = {}
    for (const s of (data || [])) {
      const e1rm = s.weight * (1 + s.reps / 30)
      if (!best[s.exercise_id] || e1rm > best[s.exercise_id]) best[s.exercise_id] = e1rm
    }
    setRecords(best)
  }

  useEffect(() => {
    if (!workout) return
    localStorage.setItem('activeWorkout', JSON.stringify({
      workout, exercises, nextSetId: nextId.current, nextSupersetId: nextSupersetId.current,
    }))
  }, [workout, exercises])

  useEffect(() => {
    if (!workout) return
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - new Date(workout.started_at).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [workout?.started_at])

  // Rest countdown
  useEffect(() => {
    if (!restTimer || restTimer.remaining <= 0) return
    const id = setTimeout(() => {
      setRestTimer(t => t ? { ...t, remaining: t.remaining - 1 } : null)
    }, 1000)
    return () => clearTimeout(id)
  }, [restTimer?.remaining])

  function fmt(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  function makeSet() {
    return { id: nextId.current++, weight: '', reps: '', completed: false, isPR: false }
  }

  function addExercise(ex) {
    setExercises(prev => [
      ...prev,
      { exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscle_group, sets: [makeSet()], isBodyweight: false, supersetGroup: null },
    ])
    setShowPicker(false)
  }

  function addSet(ei) {
    setExercises(prev => prev.map((ex, i) => i === ei ? { ...ex, sets: [...ex.sets, makeSet()] } : ex))
  }

  function removeExercise(ei) {
    setExercises(prev => prev.filter((_, i) => i !== ei))
  }

  function updateSet(ei, si, field, value) {
    setExercises(prev => prev.map((ex, i) =>
      i !== ei ? ex : { ...ex, sets: ex.sets.map((s, j) => j !== si ? s : { ...s, [field]: value }) }
    ))
  }

  function toggleSet(ei, si) {
    const ex = exercises[ei]
    const set = ex.sets[si]
    const nowCompleted = !set.completed

    let isPR = false
    if (nowCompleted && ex.exerciseId && !ex.isBodyweight && set.weight && set.reps) {
      const e1rm = parseFloat(set.weight) * (1 + parseInt(set.reps) / 30)
      const historicalBest = records[ex.exerciseId] || 0
      const sessionBest = sessionBests.current[ex.exerciseId] || 0
      const currentBest = Math.max(historicalBest, sessionBest)
      if (e1rm > sessionBest) sessionBests.current[ex.exerciseId] = e1rm
      if (historicalBest > 0 && e1rm > currentBest) {
        isPR = true
        setNewPRs(n => n + 1)
      }
    }

    setExercises(prev => prev.map((e, i) =>
      i !== ei ? e : {
        ...e,
        sets: e.sets.map((s, j) => j !== si ? s : { ...s, completed: nowCompleted, isPR: nowCompleted ? isPR : false }),
      }
    ))

    if (nowCompleted) {
      const restSecs = ex.restSeconds || 90
      setRestTimer({ remaining: restSecs, total: restSecs, exerciseName: ex.name })
    } else {
      setRestTimer(null)
    }
  }

  function toggleBodyweight(ei) {
    setExercises(prev => prev.map((ex, i) => i !== ei ? ex : { ...ex, isBodyweight: !ex.isBodyweight }))
  }

  function moveExercise(ei, dir) {
    setExercises(prev => {
      const exs = [...prev]
      const target = ei + dir
      if (target < 0 || target >= exs.length) return prev
      ;[exs[ei], exs[target]] = [exs[target], exs[ei]]
      return exs
    })
  }

  function toggleSuperset(ei) {
    setExercises(prev => {
      const exs = [...prev]
      const ex = exs[ei]
      const next = exs[ei + 1]
      if (!next) return prev
      if (ex.supersetGroup !== null && ex.supersetGroup === next.supersetGroup) {
        exs[ei] = { ...ex, supersetGroup: null }
        exs[ei + 1] = { ...next, supersetGroup: null }
      } else {
        const groupId = nextSupersetId.current++
        exs[ei] = { ...ex, supersetGroup: groupId }
        exs[ei + 1] = { ...next, supersetGroup: groupId }
      }
      return exs
    })
  }

  async function finishWorkout() {
    setSaving(true)
    try {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        const { data: we, error: weErr } = await supabase
          .from('workout_exercises')
          .insert({
            workout_id: workout.id,
            exercise_id: ex.exerciseId,
            exercise_name: ex.name,
            order_index: i,
            superset_group: ex.supersetGroup || null,
          })
          .select()
          .single()
        if (weErr) throw weErr

        const rows = ex.sets
          .filter(s => ex.isBodyweight ? s.reps !== '' : (s.weight !== '' || s.reps !== ''))
          .map((s, j) => ({
            workout_exercise_id: we.id,
            exercise_id: ex.exerciseId,
            set_number: j + 1,
            weight: ex.isBodyweight ? null : (s.weight === '' ? null : parseFloat(s.weight)),
            reps: s.reps === '' ? null : parseInt(s.reps),
            completed: s.completed,
          }))
        if (rows.length > 0) {
          const { error: sErr } = await supabase.from('sets').insert(rows)
          if (sErr) throw sErr
        }
      }

      const finishedAt = new Date().toISOString()
      await supabase.from('workouts').update({ finished_at: finishedAt }).eq('id', workout.id)
      localStorage.removeItem('activeWorkout')

      const durationMins = Math.floor((new Date(finishedAt) - new Date(workout.started_at)) / 60000)
      setCongrats({
        name: workout.name,
        duration: durationMins,
        exerciseCount: exercises.length,
        setCount: exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0),
        volume: exercises.reduce((t, ex) => t + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0),
        workoutId: workout.id,
        exercises,
        newPRs,
      })
    } catch (err) {
      console.error(err)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function saveAsTemplate(c) {
    const { data: existing } = await supabase.from('templates').select('id').eq('name', c.name).maybeSingle()
    let templateId
    if (existing) {
      await supabase.from('template_exercises').delete().eq('template_id', existing.id)
      templateId = existing.id
    } else {
      const { data: t } = await supabase.from('templates').insert({ name: c.name }).select('id').single()
      templateId = t.id
    }
    const rows = c.exercises.map((ex, i) => ({
      template_id: templateId,
      exercise_id: ex.exerciseId,
      exercise_name: ex.name,
      order_index: i,
      rest_seconds: ex.restSeconds || null,
    }))
    await supabase.from('template_exercises').insert(rows)
    setSavedTemplate(true)
  }

  async function discardWorkout() {
    await supabase.from('workouts').delete().eq('id', workout.id)
    localStorage.removeItem('activeWorkout')
    navigate('/')
  }

  if (congrats) return (
    <CongratsScreen
      congrats={congrats}
      savedTemplate={savedTemplate}
      onSaveTemplate={() => saveAsTemplate(congrats)}
      onDone={() => navigate('/')}
    />
  )

  if (!workout) return null

  const completedSets = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0)

  return (
    <div className="bg-black min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-black px-4 pt-10 pb-3 border-b border-zinc-900">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold">{workout.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-indigo-400 font-mono text-sm">{fmt(timer)}</span>
            <button onClick={() => setShowDiscard(true)} className="p-1 text-zinc-700 active:text-red-400">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-600 mt-0.5">{completedSets} sets completed</p>
      </div>

      {/* Rest timer banner */}
      {restTimer && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-xs text-zinc-600">Rest · {restTimer.exerciseName}</p>
              <p className={`text-2xl font-mono font-bold leading-none mt-0.5 ${
                restTimer.remaining === 0 ? 'text-green-400' : 'text-indigo-400'
              }`}>
                {restTimer.remaining === 0 ? 'Go!' : fmt(restTimer.remaining)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#27272a" strokeWidth="3" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={restTimer.remaining === 0 ? '#10b981' : '#6366f1'}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (restTimer.remaining / restTimer.total)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
              </svg>
              <button
                onClick={() => setRestTimer(null)}
                className="text-xs text-zinc-500 font-medium px-3 py-1.5 bg-zinc-800 rounded-xl active:bg-zinc-700"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4 pb-36">
        {exercises.length === 0 && (
          <p className="text-center text-zinc-700 text-sm py-10">
            Tap "Add Exercise" to get started
          </p>
        )}

        {exercises.map((ex, ei) => (
          <ExerciseBlock
            key={ei}
            exercise={ex}
            previousPerformance={previousPerformance[ex.exerciseId]}
            exerciseRecord={records[ex.exerciseId]}
            hasNext={ei < exercises.length - 1}
            onAddSet={() => addSet(ei)}
            onRemove={() => removeExercise(ei)}
            onUpdateSet={(si, field, value) => updateSet(ei, si, field, value)}
            onToggleSet={(si) => toggleSet(ei, si)}
            onToggleBodyweight={() => toggleBodyweight(ei)}
            onToggleSuperset={() => toggleSuperset(ei)}
            onMoveUp={ei > 0 ? () => moveExercise(ei, -1) : null}
            onMoveDown={ei < exercises.length - 1 ? () => moveExercise(ei, 1) : null}
          />
        ))}

        <button
          onClick={() => setShowPicker(true)}
          className="w-full border-2 border-dashed border-zinc-800 text-zinc-600 font-medium py-4 rounded-2xl flex items-center justify-center gap-2 active:border-zinc-600"
        >
          <Plus size={18} /> Add Exercise
        </button>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-black border-t border-zinc-900 flex gap-3 max-w-lg mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3 bg-zinc-900 text-zinc-400 font-medium rounded-xl text-sm"
        >
          Back
        </button>
        <button
          onClick={() => setShowFinish(true)}
          disabled={exercises.length === 0 || saving}
          className="flex-grow py-3 bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl text-sm"
        >
          {saving ? 'Saving…' : 'Finish Workout'}
        </button>
      </div>

      {showFinish && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-zinc-900 w-full rounded-t-3xl p-6 max-w-lg mx-auto">
            <h3 className="font-semibold text-lg mb-1">Finish Workout?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {completedSets} sets completed
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowFinish(false); finishWorkout() }}
                className="w-full py-4 bg-indigo-500 text-white font-semibold rounded-2xl"
              >
                Save Workout
              </button>
              <button
                onClick={() => setShowFinish(false)}
                className="w-full py-4 bg-zinc-800 text-zinc-300 font-medium rounded-2xl"
              >
                Keep Going
              </button>
              <button
                onClick={() => { setShowFinish(false); discardWorkout() }}
                className="w-full py-2 text-red-400 text-sm font-medium"
              >
                Discard Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscard && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-zinc-900 w-full rounded-t-3xl p-6 max-w-lg mx-auto">
            <h3 className="font-semibold text-lg mb-1">Discard Workout?</h3>
            <p className="text-zinc-400 text-sm mb-6">This workout won't be saved.</p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowDiscard(false); discardWorkout() }}
                className="w-full py-4 bg-red-500/20 text-red-400 font-semibold rounded-2xl"
              >
                Discard
              </button>
              <button
                onClick={() => setShowDiscard(false)}
                className="w-full py-4 bg-zinc-800 text-zinc-300 font-medium rounded-2xl"
              >
                Keep Going
              </button>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <ExercisePicker exercises={allExercises} onSelect={addExercise} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

function ExerciseBlock({
  exercise, previousPerformance, exerciseRecord, hasNext,
  onAddSet, onRemove, onUpdateSet, onToggleSet, onToggleBodyweight, onToggleSuperset,
  onMoveUp, onMoveDown,
}) {
  function fmtPrevSet(s) {
    if (s.duration_seconds != null) return `${s.duration_seconds}s`
    if (s.weight == null) return `BW×${s.reps ?? '—'}`
    return `${s.weight}×${s.reps ?? '—'}`
  }

  const supersetColor = exercise.supersetGroup != null
    ? SUPERSET_COLORS[(exercise.supersetGroup - 1) % SUPERSET_COLORS.length]
    : null

  return (
    <div
      className="bg-zinc-900 rounded-2xl overflow-hidden"
      style={supersetColor ? { borderLeft: `3px solid ${supersetColor}` } : {}}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{exercise.name}</p>
            {exercise.supersetGroup != null && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ color: supersetColor, backgroundColor: supersetColor + '20' }}
              >
                SS
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {exercise.muscleGroup && <p className="text-xs text-zinc-500">{exercise.muscleGroup}</p>}
            {exercise.restSeconds && (
              <p className="text-xs text-amber-600">
                {exercise.restSeconds >= 60
                  ? `${Math.floor(exercise.restSeconds / 60)}${exercise.restSeconds % 60 ? `:${String(exercise.restSeconds % 60).padStart(2, '0')}` : ' min'} rest`
                  : `${exercise.restSeconds}s rest`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="p-0.5 text-zinc-700 active:text-zinc-300 disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="p-0.5 text-zinc-700 active:text-zinc-300 disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <button
            onClick={onToggleBodyweight}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
              exercise.isBodyweight ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600'
            }`}
          >
            BW
          </button>
          {hasNext && (
            <button
              onClick={onToggleSuperset}
              className={`p-1 rounded transition-colors ${
                exercise.supersetGroup != null ? 'text-amber-400' : 'text-zinc-700 active:text-zinc-400'
              }`}
              title="Link as superset with next exercise"
            >
              <Link2 size={15} />
            </button>
          )}
          <button onClick={onRemove} className="p-1 text-zinc-700 active:text-red-400">
            <X size={16} />
          </button>
        </div>
      </div>

      {previousPerformance && previousPerformance.sets?.length > 0 && (
        <div className="px-4 py-2 bg-zinc-950 border-y border-zinc-800">
          <p className="text-xs text-zinc-600">
            <span className="text-zinc-700">Last · </span>
            {previousPerformance.sets.map((s, i) => (
              <span key={i}>{i > 0 && ' · '}{fmtPrevSet(s)}</span>
            ))}
          </p>
        </div>
      )}

      <div className="flex items-center px-4 py-1.5 border-b border-zinc-800">
        <div className="w-7 text-xs text-zinc-600">Set</div>
        {!exercise.isBodyweight && <div className="flex-1 text-xs text-zinc-600 text-center">Weight (lbs)</div>}
        <div className="flex-1 text-xs text-zinc-600 text-center">Reps</div>
        <div className="w-9 text-xs text-zinc-600 text-center">✓</div>
      </div>

      {exercise.sets.map((set, si) => (
        <div
          key={set.id}
          className={`flex items-center px-4 py-2 ${set.completed ? 'bg-indigo-500/10' : ''}`}
        >
          <div className="w-7 text-xs text-zinc-500 font-medium">{si + 1}</div>
          {!exercise.isBodyweight && (
            <div className="flex-1 px-2">
              <input
                type="number"
                inputMode="decimal"
                value={set.weight}
                onChange={e => onUpdateSet(si, 'weight', e.target.value)}
                placeholder={previousPerformance?.sets?.[si]?.weight ?? '—'}
                className={`w-full text-center bg-zinc-800 rounded-lg py-2 text-sm font-medium outline-none ${
                  set.completed ? 'text-indigo-300' : 'text-white'
                }`}
              />
            </div>
          )}
          <div className="flex-1 px-2">
            <input
              type="number"
              inputMode="numeric"
              value={set.reps}
              onChange={e => onUpdateSet(si, 'reps', e.target.value)}
              placeholder={previousPerformance?.sets?.[si]?.reps ?? '—'}
              className={`w-full text-center bg-zinc-800 rounded-lg py-2 text-sm font-medium outline-none ${
                set.completed ? 'text-indigo-300' : 'text-white'
              }`}
            />
          </div>
          <div className="w-9 flex justify-center items-center gap-0.5">
            {set.isPR && set.completed && <Trophy size={10} className="text-amber-400 shrink-0" />}
            <button
              onClick={() => onToggleSet(si)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                set.completed ? 'bg-indigo-500' : 'bg-zinc-800'
              }`}
            >
              {set.completed && <Check size={14} className="text-white" />}
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={onAddSet}
        className="w-full py-2.5 text-zinc-600 text-xs font-medium flex items-center justify-center gap-1 active:bg-zinc-800"
      >
        <Plus size={12} /> Add Set
      </button>
    </div>
  )
}

const CONFETTI_COLORS = ['#6366f1','#f59e0b','#10b981','#f43f5e','#3b82f6','#a855f7','#ec4899']

function CongratsScreen({ congrats, savedTemplate, onSaveTemplate, onDone }) {
  const confetti = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${(i * 37) % 100}%`,
    size: 6 + (i % 5),
    duration: `${1.4 + (i % 7) * 0.2}s`,
    delay: `${(i % 5) * 0.1}s`,
  }))

  const dStr = congrats.duration < 60
    ? `${congrats.duration}m`
    : `${Math.floor(congrats.duration / 60)}h ${congrats.duration % 60}m`

  const stats = [
    { label: 'Duration', value: dStr },
    { label: 'Exercises', value: congrats.exerciseCount },
    { label: 'Sets Done', value: congrats.setCount },
    ...(congrats.newPRs > 0 ? [{ label: 'New PRs', value: `🏆 ${congrats.newPRs}` }] : []),
  ]

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center px-6 overflow-hidden">
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute top-0 anim-confetti rounded-full"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        />
      ))}

      <div className="anim-scale-in w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center mb-6">
        <Check size={48} className="text-white" strokeWidth={3} />
      </div>

      <div className="anim-fade-up text-center mb-8" style={{ animationDelay: '0.15s', opacity: 0 }}>
        <h1 className="text-3xl font-bold mb-1">Workout Complete!</h1>
        <p className="text-zinc-500 text-sm">{congrats.name}</p>
      </div>

      <div
        className={`anim-fade-up grid gap-3 w-full max-w-sm mb-10 ${stats.length >= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}
        style={{ animationDelay: '0.25s', opacity: 0 }}
      >
        {stats.map(s => (
          <div key={s.label} className="bg-zinc-900 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
            <div className="font-bold">{s.value}</div>
          </div>
        ))}
      </div>
      {congrats.volume > 0 && (
        <p className="anim-fade-up text-zinc-600 text-sm mb-10 -mt-6" style={{ animationDelay: '0.3s', opacity: 0 }}>
          {congrats.volume.toLocaleString()} lbs total volume
        </p>
      )}

      <div className="anim-fade-up w-full max-w-sm space-y-3" style={{ animationDelay: '0.35s', opacity: 0 }}>
        <button
          onClick={onSaveTemplate}
          disabled={savedTemplate}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            savedTemplate
              ? 'bg-green-500/20 text-green-400'
              : 'bg-zinc-900 text-zinc-200 active:bg-zinc-800'
          }`}
        >
          {savedTemplate ? <><Check size={16} /> Saved as Template</> : <><LayoutTemplate size={16} /> Save as Template</>}
        </button>
        <button
          onClick={onDone}
          className="w-full py-4 bg-indigo-500 text-white font-semibold rounded-2xl active:bg-indigo-700"
        >
          Done
        </button>
      </div>
    </div>
  )
}
