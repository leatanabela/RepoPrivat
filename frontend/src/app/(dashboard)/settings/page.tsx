'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { updateProfileAction, updatePassword } from '@/lib/actions/auth.actions';
import { User, Shield, Sliders, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { darkMode, setDarkMode, fontSize, setFontSize } = useUIStore();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.full_name || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    if (!newName.trim()) return;
    setSaving(true);
    const result = await updateProfileAction({ full_name: newName.trim() });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (user) {
      setUser({ ...user, full_name: newName.trim() });
    }
    setEditingName(false);
    toast.success('Nume actualizat cu succes!');
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('Parola nouă trebuie să aibă cel puțin 6 caractere');
      return;
    }
    setSaving(true);
    const result = await updatePassword(currentPassword, newPassword);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    toast.success('Parola a fost actualizată!');
  }

  function handleDarkModeToggle() {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function handleFontSizeChange(size: number) {
    setFontSize(size);
    document.documentElement.style.fontSize = `${size}px`;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-8 flex flex-col gap-8">
        {/* Profile Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <User size={20} className="text-primary" />
            <h3 className="text-lg font-bold">Profil</h3>
          </div>
          <div className="bg-white dark:bg-dm-surface rounded-xl shadow-sm border border-slate-200 dark:border-dm-surface-high overflow-hidden">
            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-dm-surface-high pb-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-500">Nume complet</span>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="h-10 px-3 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="h-10 px-4 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {saving ? '...' : 'Salvează'}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNewName(user?.full_name || ''); }}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-600"
                      >
                        Anulează
                      </button>
                    </div>
                  ) : (
                    <span className="text-base font-semibold">{user?.full_name || '—'}</span>
                  )}
                </div>
                {!editingName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-medium text-sm self-start md:self-center"
                  >
                    Editează
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-500">Adresă Email</span>
                  <span className="text-base font-semibold">{user?.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <Shield size={20} className="text-primary" />
            <h3 className="text-lg font-bold">Securitate</h3>
          </div>
          <div className="bg-white dark:bg-dm-surface rounded-xl shadow-sm border border-slate-200 dark:border-dm-surface-high p-6">
            {showPasswordForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Parola curentă</label>
                  <input
                    type="password"
                    className="w-full h-12 px-4 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Parola nouă</label>
                  <input
                    type="password"
                    className="w-full h-12 px-4 border border-slate-200 dark:border-dm-surface-bright/15 rounded-lg bg-transparent focus:ring-2 focus:ring-primary/20 outline-none"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="h-10 px-6 bg-primary text-white rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    {saving ? 'Se actualizează...' : 'Actualizează parola'}
                  </button>
                  <button
                    onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); }}
                    className="h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-600"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-500">Parolă</span>
                  <span className="text-base font-semibold">••••••••••••</span>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="bg-primary text-white px-6 py-2 rounded-lg font-medium text-sm self-start md:self-center"
                >
                  Actualizează parola
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2">
            <Sliders size={20} className="text-primary" />
            <h3 className="text-lg font-bold">Preferințe</h3>
          </div>
          <div className="bg-white dark:bg-dm-surface rounded-xl shadow-sm border border-slate-200 dark:border-dm-surface-high p-6 flex flex-col gap-8">
            {/* Font Size */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold">Dimensiune font</span>
                <span className="text-sm px-3 py-1 bg-slate-100 dark:bg-dm-surface-high rounded-full font-medium">
                  {fontSize}px
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold">A</span>
                <input
                  className="w-full h-2 bg-slate-200 dark:bg-dm-surface-bright rounded-lg appearance-none cursor-pointer accent-primary"
                  max={24}
                  min={12}
                  type="range"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                />
                <span className="text-xl font-bold">A</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-dm-surface-high">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dm-surface-high/50 rounded-xl">
                <div className="flex flex-col">
                  <span className="font-semibold">Mod Întunecat</span>
                  <span className="text-xs text-slate-500">Aspect vizual relaxant</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    className="sr-only peer"
                    type="checkbox"
                    checked={darkMode}
                    onChange={handleDarkModeToggle}
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-dm-surface-bright peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
