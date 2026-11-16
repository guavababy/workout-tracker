export default function Setup() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏋️</div>
          <h1 className="text-2xl font-bold mb-2">Workout Tracker</h1>
          <p className="text-zinc-400 text-sm">Connect a database to get started</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 space-y-5 text-sm">
          <Step n={1} title="Create a free Supabase project">
            Go to <span className="text-indigo-400">supabase.com</span> → New project.
          </Step>

          <Step n={2} title="Run the schema SQL">
            In the Supabase dashboard, open{' '}
            <span className="text-zinc-200">SQL Editor</span> and paste the contents of{' '}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400">supabase/schema.sql</code>.
          </Step>

          <Step n={3} title="Add credentials to .env">
            Copy your Project URL and anon key from{' '}
            <span className="text-zinc-200">Settings → API</span>, then create a{' '}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400">.env</code> file:
            <pre className="mt-2 bg-zinc-800 rounded-xl p-3 text-xs text-zinc-300 overflow-x-auto leading-relaxed">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here`}
            </pre>
          </Step>

          <Step n={4} title="Restart the dev server">
            Run{' '}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400">npm run dev</code>{' '}
            again after creating the .env file.
          </Step>

          <Step n={5} title="Deploy to Vercel (for phone access)">
            Push to GitHub, then import the repo at{' '}
            <span className="text-indigo-400">vercel.com</span>. Add the two env vars in
            the Vercel project settings before deploying.
          </Step>
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold mt-0.5">
        {n}
      </div>
      <div>
        <div className="font-medium text-white mb-1">{title}</div>
        <div className="text-zinc-400 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
