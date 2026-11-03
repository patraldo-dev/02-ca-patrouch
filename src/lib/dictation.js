// src/lib/dictation.js — hands-free dictation engine + wake-word voice commands
// Framework-free: any editor can use it. Built for the writing flow:
//   - continuous dictation with live interim feedback
//   - auto-restart when the browser drops the session on silence
//   - wake-word commands ("patraldo guarda", "patraldo publica", …) that
//     never eat prose — only a final transcript that *starts with* the wake
//     word is treated as a command, everything else is typed into the editor.

// Wake word — the site founder's surname, and much easier to pronounce.
const WAKE = 'patraldo';

// Command phrases per site locale. Matched on the normalized words following
// the wake word; a phrase matches exactly or as a prefix of a longer phrase.
const COMMANDS = {
  es: {
    save: ['guarda', 'guardar', 'salva', 'salvar'],
    publish: ['publica', 'publicar'],
    pass: ['pasa', 'pasar', 'siguiente'],
    accept: ['acepta', 'aceptar'],
    stop: ['para', 'parar', 'detente', 'detener', 'alto'],
  },
  en: {
    save: ['save', 'store'],
    publish: ['publish', 'post'],
    pass: ['pass', 'next'],
    accept: ['accept'],
    stop: ['stop', 'halt'],
  },
  fr: {
    save: ['sauve', 'sauver', 'sauvegarde', 'sauvegarder', 'garde', 'enregistre', 'enregistrer'],
    publish: ['publie', 'publier'],
    pass: ['passe', 'suivant'],
    accept: ['accepte', 'accepter'],
    stop: ['stop', 'arrete', 'arreter', 'pause'],
  },
};

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a final transcript as a wake-word command.
 * Returns 'save' | 'publish' | 'pass' | 'accept' | 'stop', or null when the
 * transcript is ordinary prose (the overwhelmingly common case).
 */
export function parseCommand(transcript, lang = 'es') {
  const text = normalize(transcript);
  if (!text.startsWith(WAKE)) return null;
  const rest = text
    .slice(WAKE.length)
    .replace(/^[\s,.:;!?¿¡]+/, '')
    .replace(/[,.:;!?¿¡\s]+$/, '')
    .trim();
  if (!rest) return null;
  const table = COMMANDS[lang] || COMMANDS.es;
  for (const [cmd, phrases] of Object.entries(table)) {
    if (phrases.some((p) => rest === p || rest.startsWith(p + ' '))) return cmd;
  }
  return null;
}

/**
 * Create a dictation session.
 *   onFinal(text)        — a finalized utterance of prose (insert into the editor)
 *   onInterim(text)      — live preview of the utterance in progress ('' when cleared)
 *   onCommand(cmd)       — a matched wake-word command ('save'|'publish'|'pass'|'accept')
 *   onError(kind)        — 'unsupported' | 'not-allowed' | 'network' …
 *   onStateChange(on)    — listening state transitions
 * Returns { start() → boolean, stop() }.
 */
export function createDictation({
  lang = 'es',
  onFinal,
  onInterim,
  onCommand,
  onError,
  onStateChange,
} = {}) {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let rec = null;
  let active = false;
  let fatal = false;
  let errorStreak = 0;

  function setState(on) {
    active = on;
    onStateChange?.(on);
  }

  function spawn() {
    rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      errorStreak = 0;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const cmd = onCommand ? parseCommand(r[0].transcript, lang) : null;
          if (cmd === 'stop') {
            // "patrouch para" — stop listening, and confirm the command so
            // the UI can acknowledge it.
            stop();
            onCommand?.('stop');
            return;
          }
          if (cmd) onCommand?.(cmd);
          else onFinal?.(r[0].transcript);
        } else {
          interim += r[0].transcript;
        }
      }
      onInterim?.(interim);
    };

    rec.onerror = (e) => {
      const kind = e.error || 'error';
      if (kind === 'not-allowed' || kind === 'service-not-allowed' || kind === 'audio-capture') {
        fatal = true; // permission/hardware — never auto-restart
        onError?.(kind);
      } else if (kind === 'network') {
        errorStreak++;
        onError?.('network');
      }
      // 'no-speech' etc. are benign: onend restarts the session.
    };

    rec.onend = () => {
      if (active && !fatal && errorStreak < 5) {
        errorStreak++;
        setTimeout(spawn, 250); // browser dropped the session — pick it back up
      } else if (active) {
        setState(false);
      }
    };

    rec.start();
  }

  function start() {
    if (!SR) {
      onError?.('unsupported');
      return false;
    }
    if (active) return true;
    fatal = false;
    errorStreak = 0;
    setState(true);
    spawn();
    return true;
  }

  function stop() {
    if (rec) {
      try { rec.stop(); } catch {}
      rec = null;
    }
    setState(false);
  }

  return { start, stop };
}
