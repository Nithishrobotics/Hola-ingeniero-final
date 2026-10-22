import { useCallback, useEffect, useRef, useState } from 'react';

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
const Recognition = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
export const canListen = () => !!Recognition();

export function speak(text, lang = 'es-ES') {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.toLowerCase().startsWith('es'));
  if (voice) u.voice = voice;
  u.lang = voice?.lang || lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

// Browser speech recognition (Chrome/Edge). Text-only fallback when unsupported.
export function useDictation(onText) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  const start = useCallback(() => {
    const R = Recognition();
    if (!R) { setError('Your browser does not support speech recognition. Please type instead (Chrome or Edge work best).'); return; }
    setError('');
    const rec = new R();
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => onText(e.results[0][0].transcript);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Microphone permission was blocked. Allow the microphone in your browser’s address bar, or type instead.');
      else if (e.error === 'no-speech') setError('I did not hear anything. Try again, or type your message.');
      else if (e.error === 'network') setError('Speech recognition needs an internet connection in this browser.');
      else setError('Speech recognition stopped. You can type instead.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setError('Could not start the microphone.'); }
  }, [onText]);

  useEffect(() => () => recRef.current?.abort?.(), []);
  return { listening, error, start, stop, supported: canListen() };
}
