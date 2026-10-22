import { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, GraduationCap, Cpu, Gamepad2, Bot, BookOpen, Home, Settings } from 'lucide-react';
import { useProgress, actions, isStorageOk } from '../hooks/useProgress.js';
import { LEVELS } from '../lib/progress.js';
import { useToast } from './ui.jsx';

export const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5" aria-label="¡Hola Ingeniero! home">
    <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><rect width="64" height="64" rx="14" fill="#0B2545" /><path d="M14 40h12l6-16 6 16h12" fill="none" stroke="#2DD4BF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="50" cy="40" r="4" fill="#FF7F6B" /></svg>
    <span className="whitespace-nowrap font-display text-xl font-extrabold text-navy-900">¡Hola Ingeniero!</span>
  </Link>
);

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/learn', label: 'Learn Spanish', icon: BookOpen },
  { to: '/tech', label: 'Tech Español', icon: Cpu },
  { to: '/play', label: 'Play & Practice', icon: Gamepad2 },
  { to: '/campus', label: 'Campus Español', icon: GraduationCap },
  { to: '/tutor', label: '¡Hola Amigo! AI', icon: Bot },
];

function SettingsPanel({ onClose }) {
  const state = useProgress();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="card pop absolute right-0 top-12 z-40 w-80 p-4" role="dialog" aria-label="Settings">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Settings</h2><button className="rounded p-1 hover:bg-paper-2" onClick={onClose} aria-label="Close settings"><X className="h-5 w-5" /></button></div>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Your Spanish level</legend>
        <div className="grid gap-1.5">
          {LEVELS.map((l) => (
            <label key={l.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${state.level === l.id ? 'border-teal-700 bg-teal-100' : 'border-[#d6d0bd]'}`}>
              <input type="radio" name="level" checked={state.level === l.id} onChange={() => { actions.setLevel(l.id); toast(`Level set to ${l.id} ${l.name}`, 'success'); }} />
              <span><b>{l.id}</b> · {l.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 border-t border-[#e4dfd0] pt-3">
        {!confirm
          ? <button className="text-sm font-semibold text-coral-600 underline" onClick={() => setConfirm(true)}>Reset all progress…</button>
          : (
            <div className="rounded-lg bg-coral-100 p-3 text-sm">
              <p className="font-semibold">Delete all progress, quiz results and chat history from this browser?</p>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-coral !min-h-9 !py-1" onClick={() => { actions.resetAll(); setConfirm(false); onClose(); toast('All progress was reset.', 'info'); }}>Yes, reset</button>
                <button className="btn btn-ghost !min-h-9 !py-1" onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const { pathname } = useLocation();
  const state = useProgress();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-[#e4dfd0] bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-1 whitespace-nowrap lg:flex" aria-label="Main">
            {links.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold ${isActive ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-paper-2'}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="relative flex items-center gap-2">
            {state.level && <span className="chip hidden sm:inline-flex">{state.level}</span>}
            <button className="btn btn-ghost !min-h-10 !px-3" onClick={() => setSettings((s) => !s)} aria-label="Open settings" aria-expanded={settings}><Settings className="h-5 w-5" /></button>
            {settings && <SettingsPanel onClose={() => setSettings(false)} />}
            <button className="btn btn-ghost !min-h-10 !px-3 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-[#e4dfd0] bg-paper px-4 py-2 lg:hidden" aria-label="Mobile">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 font-semibold ${isActive ? 'bg-navy-900 text-white' : 'text-navy-900'}`}><Icon className="h-5 w-5" aria-hidden />{label}</NavLink>
            ))}
          </nav>
        )}
      </header>
      {!isStorageOk() && <p className="bg-coral-100 px-4 py-2 text-center text-sm font-semibold">Your browser is blocking saved data, so progress will be lost when you close this tab.</p>}
      <main id="main" className="flex-1" key={pathname}><Outlet /></main>
      <footer className="mt-12 bg-navy-900 text-navy-100">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-xl font-extrabold text-white">¡Hola Ingeniero!</p>
            <p className="mt-1 text-teal-400">Aprende. Practica. Progresa.</p>
          </div>
          <p className="text-sm">A Spanish-learning project for engineering students: grammar, technical vocabulary, campus conversations and an AI tutor.</p>
          <p className="text-sm">Progress is stored only in this browser (LocalStorage). The AI tutor sends your typed messages to Google’s Gemini API through the local backend.</p>
        </div>
      </footer>
    </div>
  );
}
