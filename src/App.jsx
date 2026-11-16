import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { isConfigured, supabase } from './lib/supabase.js'
import { DEFAULT_EXERCISES } from './lib/exercises.js'
import BottomNav from './components/BottomNav.jsx'
import Setup from './pages/Setup.jsx'
import Home from './pages/Home.jsx'
import ActiveWorkout from './pages/ActiveWorkout.jsx'
import History from './pages/History.jsx'
import WorkoutDetail from './pages/WorkoutDetail.jsx'
import Progress from './pages/Progress.jsx'
import Exercises from './pages/Exercises.jsx'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isConfigured) { setReady(true); return }
    seedExercises()
  }, [])

  async function seedExercises() {
    try {
      const { count } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
      if (count === 0) {
        await supabase.from('exercises').insert(DEFAULT_EXERCISES)
      }
    } catch (err) {
      console.error('Seed error:', err)
    }
    setReady(true)
  }

  if (!isConfigured) return <Setup />

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-zinc-600 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout/active" element={<ActiveWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<WorkoutDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}
