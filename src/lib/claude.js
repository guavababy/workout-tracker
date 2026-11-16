const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function getWorkoutRecommendation(recentWorkouts) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const workoutSummary = recentWorkouts.map(w => {
    const date = new Date(w.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const exercises = (w.workout_exercises || []).map(we => {
      const sets = (we.sets || []).filter(s => s.weight || s.reps)
      const setStr = sets.map(s => `${s.weight ?? '?'}lbs×${s.reps ?? '?'}`).join(', ')
      return `  - ${we.exercise_name}${setStr ? ': ' + setStr : ''}`
    }).join('\n')
    return `${date}:\n${exercises || '  (no exercises logged)'}`
  }).join('\n\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-5-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a personal trainer. Based on this recent workout history, recommend a workout for today (${today}).

Recent workouts:
${workoutSummary}

Recommend a workout that avoids muscle groups trained in the last 48 hours and balances the week.

Respond with JSON only (no markdown, no code fences):
{
  "name": "workout name",
  "reasoning": "1-2 sentence explanation",
  "exercises": [
    {"name": "Exercise Name", "sets": 3, "reps": "8-10", "rest_seconds": 90, "notes": "optional tip"}
  ]
}

rest_seconds should reflect the goal: ~60s for hypertrophy/pump work, ~90-120s for moderate strength, ~180-300s for heavy compound lifts.`,
      }],
    }),
  })

  const raw = await res.text()
  console.log('Claude API status:', res.status)
  console.log('Claude API response:', raw)

  if (!res.ok) {
    let msg = `HTTP ${res.status}: ${raw}`
    try { msg = JSON.parse(raw)?.error?.message || msg } catch {}
    throw new Error(msg)
  }

  const data = JSON.parse(raw)
  const textBlock = data.content?.find(b => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text in response: ' + raw)
  return JSON.parse(textBlock.text)
}
