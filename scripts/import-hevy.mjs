/**
 * import-hevy.mjs
 * One-time script to import a Hevy CSV export into Supabase.
 *
 * Usage (from the workout-tracker directory):
 *   node scripts/import-hevy.mjs "C:\path\to\workout_data.csv"
 *
 * Requirements:
 *   - .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *   - supabase/schema.sql already run on your Supabase project
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env')
let env = {}
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=')
    if (k && !k.startsWith('#')) env[k.trim()] = rest.join('=').trim()
  })
} catch {
  console.error('❌  .env file not found. Create one with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key } = env
if (!url || !key) {
  console.error('❌  VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env')
  process.exit(1)
}

const supabase = createClient(url, key)

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const fields = []
  let field = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      fields.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  fields.push(field)
  return fields
}

function parseHevyDate(str) {
  // "12 Nov 2026, 11:57"
  if (!str) return null
  const d = new Date(str.trim())
  if (!isNaN(d.getTime())) return d.toISOString()
  // manual fallback
  const m = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4}),\s+(\d{1,2}):(\d{2})/)
  if (!m) return null
  return new Date(`${m[2]} ${m[1]}, ${m[3]} ${m[4]}:${m[5]}`).toISOString()
}

// ── Muscle group guesser for unknown exercises ───────────────────────────────
function guessGroup(name) {
  const n = name.toLowerCase()
  if (/squat|leg press|leg curl|leg ext|lunge|calf|hip thrust|glute|hamstring|quad|rdl|split squat/.test(n)) return 'Legs'
  if (/bench|chest|pec|fly|flye|push.?up/.test(n)) return 'Chest'
  if (/pull.?up|chin.?up|row|pulldown|lat |pullover|back/.test(n)) return 'Back'
  if (/shoulder|delt|lateral raise|front raise|overhead press|ohp|arnold/.test(n)) return 'Shoulders'
  if (/curl(?! leg| cable leg)/.test(n) && !/tricep/.test(n)) return 'Biceps'
  if (/tricep|pushdown|skull|close.grip|dip/.test(n)) return 'Triceps'
  if (/plank|crunch|ab |core|sit.up|leg raise|russian twist/.test(n)) return 'Core'
  if (/run|cycl|cardio|jump rope|row.*machine|ellip|stair|treadmill/.test(n)) return 'Cardio'
  return 'Other'
}

function guessCategory(name) {
  const n = name.toLowerCase()
  if (/\(barbell\)|barbell/.test(n)) return 'Barbell'
  if (/\(dumbbell\)|dumbbell/.test(n)) return 'Dumbbell'
  if (/\(cable\)|cable/.test(n)) return 'Cable'
  if (/\(machine\)|machine|smith/.test(n)) return 'Machine'
  if (/\(bodyweight\)|bodyweight/.test(n)) return 'Bodyweight'
  if (/cardio|run|cycl|ellip|stair|row.*erg/.test(n)) return 'Cardio'
  return 'Other'
}

// ── Main ─────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/import-hevy.mjs <path-to-csv>')
  process.exit(1)
}

console.log('📂  Reading CSV…')
const lines = readFileSync(resolve(csvPath), 'utf-8').split('\n').filter(Boolean)
const headers = parseCsvLine(lines[0])
const rows = lines.slice(1).map(line => {
  const vals = parseCsvLine(line)
  return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
})

console.log(`📊  ${rows.length} set rows found`)

// ── Group rows into workouts ──────────────────────────────────────────────────
// Key: title + start_time (unique per session)
const workoutMap = new Map()
for (const row of rows) {
  const key = `${row.title}|||${row.start_time}`
  if (!workoutMap.has(key)) {
    workoutMap.set(key, {
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time,
      description: row.description,
      exerciseOrder: [],         // preserves insertion order
      exerciseRows: new Map(),   // exerciseName → rows[]
    })
  }
  const w = workoutMap.get(key)
  const exName = row.exercise_title
  if (!w.exerciseRows.has(exName)) {
    w.exerciseOrder.push(exName)
    w.exerciseRows.set(exName, [])
  }
  w.exerciseRows.get(exName).push(row)
}

console.log(`🏋️   ${workoutMap.size} workout sessions to import`)

// ── Fetch existing exercise library ──────────────────────────────────────────
const { data: existingExercises } = await supabase.from('exercises').select('id, name')
const exerciseCache = new Map()
for (const ex of (existingExercises || [])) {
  exerciseCache.set(ex.name.toLowerCase(), ex.id)
}

async function getOrCreateExercise(name) {
  const key = name.toLowerCase()
  if (exerciseCache.has(key)) return exerciseCache.get(key)

  const { data, error } = await supabase
    .from('exercises')
    .insert({ name, muscle_group: guessGroup(name), category: guessCategory(name) })
    .select('id')
    .single()

  if (error) throw new Error(`Exercise insert failed for "${name}": ${error.message}`)
  exerciseCache.set(key, data.id)
  return data.id
}

// ── Fetch already-imported workout start times (for dedup) ───────────────────
const { data: existingWorkouts } = await supabase
  .from('workouts')
  .select('started_at')
const importedDates = new Set((existingWorkouts || []).map(w => w.started_at))

// ── Import ────────────────────────────────────────────────────────────────────
let imported = 0
let skipped = 0
let failed = 0

for (const [, wData] of workoutMap) {
  const startedAt = parseHevyDate(wData.start_time)
  const finishedAt = parseHevyDate(wData.end_time)

  if (!startedAt) {
    console.warn(`  ⚠️  Skipping unparseable date: "${wData.start_time}"`)
    skipped++
    continue
  }

  if (importedDates.has(startedAt)) {
    skipped++
    continue
  }

  try {
    // Insert workout
    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({
        name: wData.title || 'Workout',
        notes: wData.description || null,
        started_at: startedAt,
        finished_at: finishedAt,
      })
      .select('id')
      .single()
    if (wErr) throw wErr

    // Insert exercises + sets
    for (let oi = 0; oi < wData.exerciseOrder.length; oi++) {
      const exName = wData.exerciseOrder[oi]
      const setRows = wData.exerciseRows.get(exName)

      const exerciseId = await getOrCreateExercise(exName)

      const { data: we, error: weErr } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          exercise_id: exerciseId,
          exercise_name: exName,
          order_index: oi,
        })
        .select('id')
        .single()
      if (weErr) throw weErr

      const setsToInsert = setRows.map(s => ({
        workout_exercise_id: we.id,
        exercise_id: exerciseId,
        set_number: (parseInt(s.set_index) || 0) + 1,
        set_type: s.set_type || 'normal',
        weight: s.weight_lbs !== '' ? parseFloat(s.weight_lbs) : null,
        reps: s.reps !== '' ? parseInt(s.reps) : null,
        duration_seconds: s.duration_seconds !== '' ? parseInt(s.duration_seconds) : null,
        distance_miles: s.distance_miles !== '' ? parseFloat(s.distance_miles) : null,
        completed: true,
      }))

      await supabase.from('sets').insert(setsToInsert)
    }

    importedDates.add(startedAt)
    imported++
    process.stdout.write(`\r  ✅  ${imported} imported, ${skipped} skipped, ${failed} failed`)
  } catch (err) {
    failed++
    console.error(`\n  ❌  Failed: ${wData.title} (${wData.start_time}): ${err.message}`)
  }
}

console.log(`\n\n🎉  Done! ${imported} workouts imported, ${skipped} already existed, ${failed} failed.`)
