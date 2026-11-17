'use client';
import { useActionState } from 'react';
import { login } from './actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <form action={action} className="max-w-sm w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-5">
        <h1 className="text-3xl font-[900] text-yellow-500 italic tracking-tight">Cinema SKG · Admin</h1>
        <label className="block space-y-2">
          <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white/70">Κωδικός</span>
          <input
            type="password"
            name="password"
            autoFocus
            required
            autoComplete="current-password"
            className="w-full rounded-xl bg-black/60 border border-white/15 px-4 py-3 text-white outline-none focus:border-yellow-500"
          />
        </label>
        {state?.error && <p className="text-red-400 text-sm font-bold">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-yellow-500 text-black font-[900] uppercase tracking-wider py-3 hover:bg-yellow-400 disabled:opacity-60 cursor-pointer"
        >
          {pending ? 'Έλεγχος…' : 'Είσοδος'}
        </button>
      </form>
    </main>
  );
}
