'use client';

import { useState } from 'react';
import { signIn } from '@/lib/actions/auth.actions';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased flex flex-col min-h-screen">
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800">
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center mb-10">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_6_330)">
                    <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd" />
                  </g>
                  <defs>
                    <clipPath id="clip0_6_330"><rect fill="white" height="48" width="48" /></clipPath>
                  </defs>
                </svg>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Autentificare</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-center text-sm leading-relaxed">
                Accesați platforma de suport instituțional folosind contul dumneavoastră.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="email">
                  Adresă Email
                </label>
                <input
                  className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  id="email"
                  name="email"
                  placeholder="nume.prenume@institutie.ro"
                  type="email"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                    Parolă
                  </label>
                </div>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 pr-12 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    id="password"
                    name="password"
                    placeholder="********"
                    type={showPassword ? 'text' : 'password'}
                    required
                  />
                  <button
                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                className="w-full h-14 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Se conectează...' : 'Conectare'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aveți nevoie de asistență? Contactați administratorul IT
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full py-8 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            &copy; 2024 Portal HelpDesk Instituțional
          </p>
        </div>
      </footer>
    </div>
  );
}
