import { useMemo, useState } from 'react';
import { Search, Check, ChevronLeft, ChevronRight, Shuffle, Eye, BookCheck, Layers, List } from 'lucide-react';
import { vocabulary, vocabCategories } from '../data/vocabulary.js';
import { actions, useProgress } from '../hooks/useProgress.js';
import { shuffle } from '../lib/quiz.js';
import { EmptyState, Page, PageHeader, ProgressBar, SpeakButton, useDocumentTitle } from '../components/ui.jsx';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function WordRow({ w, learned }) {
  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold text-navy-900" lang="es">{w.es} <SpeakButton text={w.es} /></p>
          <p className="font-semibold">{w.en}{w.pron && <span className="ml-2 text-sm font-normal text-ink-soft">/{w.pron}/</span>}</p>
        </div>
        <button className={`btn !min-h-10 !px-3 ${learned ? 'btn-teal' : 'btn-ghost'}`} aria-pressed={learned} onClick={() => actions.toggleLearned(w)}><Check className="h-4 w-4" aria-hidden />{learned ? 'Learned' : 'Mark learned'}</button>
      </div>
      <p className="mt-2 border-l-4 border-teal-400 pl-3 italic" lang="es">{w.exampleEs}</p>
      <p className="pl-4 text-sm text-ink-soft">{w.exampleEn}</p>
      <span className="chip mt-2">{w.category}</span>
    </li>
  );
}

function Flashcards({ deck, learned }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  if (deck.length === 0) return <EmptyState icon={Layers} title="No cards">Change the search or category to build a deck.</EmptyState>;
  const idx = Math.min(i, deck.length - 1);
  const w = deck[idx];
  const go = (d) => { setI((idx + d + deck.length) % deck.length); setShown(false); };
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-2 text-center text-sm font-semibold text-ink-soft">Card {idx + 1} of {deck.length}</p>
      <div className="card pop grid min-h-72 place-items-center p-8 text-center" aria-live="polite">
        <div>
          <span className="chip">{w.category}</span>
          <p className="mt-4 font-display text-4xl font-extrabold text-navy-900" lang="es">{w.es} <SpeakButton text={w.es} /></p>
          {shown
            ? <div className="pop mt-5"><p className="text-2xl font-bold text-teal-700">{w.en}</p>{w.pron && <p className="text-sm text-ink-soft">/{w.pron}/</p>}<p className="mt-3 italic" lang="es">{w.exampleEs}</p><p className="text-sm text-ink-soft">{w.exampleEn}</p></div>
            : <button className="btn btn-primary mt-6" onClick={() => setShown(true)}><Eye className="h-4 w-4" aria-hidden />Reveal translation</button>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button className="btn btn-ghost" onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" aria-hidden />Previous</button>
        <button className={`btn ${learned[w.id] ? 'btn-teal' : 'btn-ghost'}`} aria-pressed={!!learned[w.id]} onClick={() => actions.toggleLearned(w)}><Check className="h-4 w-4" aria-hidden />{learned[w.id] ? 'Learned' : 'Mark learned'}</button>
        <button className="btn btn-primary" onClick={() => go(1)}>Next<ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>
    </div>
  );
}

function RandomPractice({ learned }) {
  const [seed, setSeed] = useState(0);
  const [picked, setPicked] = useState(null);
  const round = useMemo(() => {
    const [target, ...others] = shuffle(vocabulary);
    const options = shuffle([target, ...others.slice(0, 3)]);
    return { target, options };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const { target, options } = round;
  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6">
        <p className="text-sm font-semibold text-ink-soft">What does this mean?</p>
        <p className="mt-1 font-display text-4xl font-extrabold" lang="es">{target.es} <SpeakButton text={target.es} /></p>
        <div className="mt-5 grid gap-2">
          {options.map((o) => {
            let style = 'border-[#d6d0bd] bg-white hover:bg-paper-2';
            if (picked) { if (o.id === target.id) style = 'border-teal-700 bg-teal-100'; else if (o.id === picked) style = 'border-coral-600 bg-coral-100'; }
            return <button key={o.id} disabled={!!picked} onClick={() => setPicked(o.id)} className={`min-h-12 rounded-xl border-2 px-4 py-2 text-left font-medium ${style}`}>{o.en}</button>;
          })}
        </div>
        {picked && (
          <div className="pop mt-4 rounded-xl bg-paper-2 p-3" role="status">
            <p className="font-bold">{picked === target.id ? '✓ Correct!' : `✗ It means: ${target.en}`}</p>
            <p className="mt-1 italic" lang="es">{target.exampleEs}</p><p className="text-sm text-ink-soft">{target.exampleEn}</p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={() => { setSeed(seed + 1); setPicked(null); }}><Shuffle className="h-4 w-4" aria-hidden />Another word</button>
          {picked && !learned[target.id] && picked === target.id && <button className="btn btn-ghost" onClick={() => actions.toggleLearned(target)}>Mark learned</button>}
        </div>
      </div>
    </div>
  );
}

export default function TechPage() {
  useDocumentTitle('Tech Español');
  const { vocabLearned } = useProgress();
  const [tab, setTab] = useState('browse');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return vocabulary.filter((w) => (cat === 'All' || w.category === cat) && (!q || norm(`${w.es} ${w.en} ${w.exampleEs}`).includes(q)));
  }, [query, cat]);
  const learnedWords = vocabulary.filter((w) => vocabLearned[w.id]);
  const learnedCount = learnedWords.length;

  const tabs = [
    { id: 'browse', label: 'Browse', icon: List },
    { id: 'cards', label: 'Flashcards', icon: Layers },
    { id: 'random', label: 'Random practice', icon: Shuffle },
    { id: 'review', label: `Review learned (${learnedCount})`, icon: BookCheck },
  ];

  return (
    <>
      <PageHeader title="Tech Español" subtitle={`${vocabulary.length} engineering terms in ${vocabCategories.length} categories, each with an example sentence and translation.`}>
        <div className="max-w-md"><ProgressBar value={learnedCount} max={vocabulary.length} label="Words learned" /><p className="mt-2 text-sm font-semibold">{learnedCount} of {vocabulary.length} words learned</p></div>
      </PageHeader>
      <Page>
        <div role="tablist" aria-label="Tech Español modes" className="mb-6 flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`btn !min-h-10 ${tab === id ? 'btn-primary' : 'btn-ghost'}`}><Icon className="h-4 w-4" aria-hidden />{label}</button>
          ))}
        </div>

        {(tab === 'browse' || tab === 'cards') && (
          <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-ink-soft" aria-hidden /><input className="input !pl-10" type="search" placeholder="Search Spanish or English…" aria-label="Search vocabulary" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <select className="input md:w-72" aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option>{vocabCategories.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        )}

        {tab === 'browse' && (filtered.length === 0
          ? <EmptyState icon={Search} title="No matches" action={<button className="btn btn-ghost" onClick={() => { setQuery(''); setCat('All'); }}>Clear filters</button>}>Try a different word or category.</EmptyState>
          : <><p className="mb-3 text-sm font-semibold text-ink-soft">{filtered.length} terms</p><ul className="grid gap-3 md:grid-cols-2">{filtered.map((w) => <WordRow key={w.id} w={w} learned={!!vocabLearned[w.id]} />)}</ul></>)}
        {tab === 'cards' && <Flashcards key={`${cat}-${query}`} deck={filtered} learned={vocabLearned} />}
        {tab === 'random' && <RandomPractice learned={vocabLearned} />}
        {tab === 'review' && (learnedWords.length === 0
          ? <EmptyState icon={BookCheck} title="No learned words yet">Mark words as learned while browsing or in flashcards and they will appear here for review.</EmptyState>
          : <ul className="grid gap-3 md:grid-cols-2">{learnedWords.map((w) => <WordRow key={w.id} w={w} learned />)}</ul>)}
      </Page>
    </>
  );
}
