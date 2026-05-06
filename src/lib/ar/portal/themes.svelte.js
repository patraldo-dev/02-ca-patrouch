/**
 * AR Portal Literary Themes
 * Each theme defines: visual skin, narrator voice, and content behavior.
 * The Narrator (Albot Camus) uses these to generate proclamations
 * that match the literary world of each writer.
 */

export const THEMES = {
  arboleda: {
    id: 'arboleda',
    name: 'Arboleda',
    nameEn: 'The Grove',
    icon: '🌿',
    description: 'Naturaleza, contemplación, soledad',

    // Visual
    colors: {
      reticle: 0x2d5a27,
      ambient: 0xc8e6c9,
      directional: 0xffffff,
      uiPrimary: '#2d5a27',
      uiBackground: 'rgba(200, 230, 201, 0.9)',
      uiText: '#1b3a18',
    },

    // Narrator voice config — how Albot speaks in this world
    narrator: {
      tone: 'contemplativo, susurrante',
      vocabulary: ['raíz', 'sombra', 'hojarasca', 'musgo', 'luz filtrada', 'silencio', 'crecimiento', 'estación'],
      proclamationStyle: 'observación poética sobre la escritura como árbol que crece',
      directivaStyle: 'invitación a detenerse y mirar',
      greetingPrefix: 'Bajo este dosel de palabras...',
    },

    // Portal behavior
    portal: {
      defaultDistance: -1.5,
      defaultY: -0.3,
      placementMode: 'floor', // floor | wall | floating
      audioAmbient: null, // Phase 3 — forest sounds
    },

    // Detection keywords from El Ágora writings
    triggers: ['naturaleza', 'árbol', 'bosque', 'hoja', 'raíz', 'silencio', 'soledad', 'contemplación', 'estación', 'crecer', 'jardín', 'flor', 'pájaro', 'cielo'],
  },

  fiesta: {
    id: 'fiesta',
    name: 'Fiesta',
    nameEn: 'The Celebration',
    icon: '🎂',
    description: 'Celebración, humor, comunión',

    colors: {
      reticle: 0xff6b35,
      ambient: 0xfff3e0,
      directional: 0xffe082,
      uiPrimary: '#ff6b35',
      uiBackground: 'rgba(255, 243, 224, 0.9)',
      uiText: '#4a2800',
    },

    narrator: {
      tone: 'festivo, effusivo, ligeramente irreverente',
      vocabulary: ['brindis', 'confetti', 'vela', 'pastel', 'risa', 'sorpresa', 'regalo', 'invitado', 'copa', 'baile'],
      proclamationStyle: 'proclama jubilosa que conecta el escrito con la celebración',
      directivaStyle: 'invitación a participar, compartir, celebrar',
      greetingPrefix: '¡Se armó la fiesta de las palabras!',
    },

    portal: {
      defaultDistance: -1.2,
      defaultY: -0.2,
      placementMode: 'floating',
      sharedAR: true, // WebRTC DataChannels
      audioAmbient: null,
    },

    triggers: ['fiesta', 'celebración', 'risa', 'brindis', 'alegría', 'cumpleaños', 'juntos', 'compartir', 'divertido', 'humor', 'regalo', 'sorprender'],
  },

  oceano: {
    id: 'oceano',
    name: 'Océano',
    nameEn: 'The Ocean',
    icon: '🌊',
    description: 'Melancolía, viaje, misterio',

    colors: {
      reticle: 0x0277bd,
      ambient: 0xb3e5fc,
      directional: 0xe1f5fe,
      uiPrimary: '#0277bd',
      uiBackground: 'rgba(179, 229, 252, 0.9)',
      uiText: '#013a5e',
    },

    narrator: {
      tone: 'melancólico, profundo, con ritmo de marea',
      vocabulary: ['marea', 'ola', 'profundidad', 'deriva', 'horizonte', 'corriente', 'botella', 'sal', 'espuma', 'reflejo'],
      proclamationStyle: 'meditación que conecta el escrito con el movimiento del mar',
      directivaStyle: 'invitación a dejarse llevar, explorar la profundidad',
      greetingPrefix: 'Arrullado por las corrientes de la palabra...',
    },

    portal: {
      defaultDistance: -1.2,
      defaultY: -0.5,
      placementMode: 'floor',
      audioAmbient: null,
    },

    triggers: ['mar', 'océano', 'ola', 'marea', 'barco', 'viaje', 'deriva', 'profundidad', 'misterio', 'melancolía', 'horizonte', 'agua', 'isla', 'botella'],
  },

  narrador: {
    id: 'narrador',
    name: 'Narrador',
    nameEn: 'The Narrator',
    icon: '📖',
    description: 'Meta-narrativa, filosofía',

    colors: {
      reticle: 0xc9a87c,
      ambient: 0xfff8e1,
      directional: 0xffffff,
      uiPrimary: '#c9a87c',
      uiBackground: 'rgba(255, 248, 225, 0.9)',
      uiText: '#3e2723',
    },

    narrator: {
      tone: 'filosófico, autorreflexivo, ligeramente cínico',
      vocabulary: ['narrativa', 'capítulo', 'trama', 'personaje', 'voz', 'silencio', 'verdad', 'ficción', 'lector', 'autor'],
      proclamationStyle: 'reflexión meta-literaria que desmenuza el escrito y lo reconstruye',
      directivaStyle: 'directiva que rompe la cuarta pared, habla al lector directamente',
      greetingPrefix: 'El Narrador se ajusta las gafas y dice...',
    },

    portal: {
      defaultDistance: -1.0,
      defaultY: -0.2,
      placementMode: 'wall',
      audioAmbient: null,
    },

    triggers: ['historia', 'narrativa', 'escribir', 'palabra', 'texto', 'página', 'autor', 'lector', 'capítulo', 'verdad', 'ficción', 'meta', 'filosofía'],
  },

  espacio: {
    id: 'espacio',
    name: 'Espacio',
    nameEn: 'The Cosmos',
    icon: '🚀',
    description: 'Imaginación, futurismo, absurdo',

    colors: {
      reticle: 0x7c4dff,
      ambient: 0xede7f6,
      directional: 0xd1c4e9,
      uiPrimary: '#7c4dff',
      uiBackground: 'rgba(237, 231, 246, 0.9)',
      uiText: '#1a0033',
    },

    narrator: {
      tone: 'cosmic, absurdo, con humor científico',
      vocabulary: ['galaxia', 'órbita', 'gravitación', 'paradoja', 'vacío', 'estrella', 'agujero negro', 'nebulosa', 'fotón', 'dimensión'],
      proclamationStyle: 'pronunciamiento que escala el escrito a dimensiones cósmicas',
      directivaStyle: 'instrucción absurda que suena científica',
      greetingPrefix: 'Transmisión desde la frontera del conocimiento...',
    },

    portal: {
      defaultDistance: -1.8,
      defaultY: -0.1,
      placementMode: 'floating',
      audioAmbient: null,
    },

    triggers: ['espacio', 'universo', 'galaxia', 'estrella', 'ciencia', 'futuro', 'tecnología', 'robot', 'dimensiones', 'paradoja', 'absurdo', 'cosmos', 'planet'],
  },

  urbano: {
    id: 'urbano',
    name: 'Urbano',
    nameEn: 'The Street',
    icon: '🏙️',
    description: 'Cotidianidad, crónica social',

    colors: {
      reticle: 0x546e7a,
      ambient: 0xefebf0,
      directional: 0xffffff,
      uiPrimary: '#546e7a',
      uiBackground: 'rgba(239, 235, 240, 0.9)',
      uiText: '#263238',
    },

    narrator: {
      tone: 'crónico, observador, con humor seco',
      vocabulary: ['esquina', 'neón', 'bus', 'café', 'acera', 'semáforo', 'gente', 'ruido', 'edificio', 'ventana'],
      proclamationStyle: 'crónica brevísima que convierte el escrito en escena urbana',
      directivaStyle: 'instrucción práctica como dirección de calle',
      greetingPrefix: 'En la esquina de la palabra y la acera...',
    },

    portal: {
      defaultDistance: -1.2,
      defaultY: -0.4,
      placementMode: 'wall',
      audioAmbient: null,
    },

    triggers: ['ciudad', 'calle', 'edificio', 'gente', 'trabajo', 'café', 'noche', 'neón', 'ruido', 'metro', 'bus', 'ventana', 'vecino', 'cotidiano'],
  },

  fantasia: {
    id: 'fantasia',
    name: 'Fantasía',
    nameEn: 'The Dream',
    icon: '🔮',
    description: 'Sueño, mito, símbolo',

    colors: {
      reticle: 0x9c27b0,
      ambient: 0xf3e5f5,
      directional: 0xce93d8,
      uiPrimary: '#9c27b0',
      uiBackground: 'rgba(243, 229, 245, 0.9)',
      uiText: '#311b40',
    },

    narrator: {
      tone: 'místico, simbólico, entre sueño y vigilia',
      vocabulary: ['sueño', 'umbral', 'espejo', 'sombras', 'luz', 'velo', 'revelación', 'antiguo', 'ritual', 'cristal'],
      proclamationStyle: 'oráculo que interpreta el escrito como augurio o profecía',
      directivaStyle: 'enigma que el lector debe descifrar',
      greetingPrefix: 'En el umbral entre lo soñado y lo escrito...',
    },

    portal: {
      defaultDistance: -1.5,
      defaultY: -0.2,
      placementMode: 'floating',
      audioAmbient: null,
    },

    triggers: ['sueño', 'fantasía', 'mágico', 'mito', 'sombra', 'espejo', 'velo', 'ritual', 'misterio', 'luna', 'noche', 'espíritu', 'antiguo', 'profecía'],
  },
};

/** Get theme by ID, fallback to narrador */
export function getTheme(id) {
  return THEMES[id] || THEMES.narrador;
}

/** Classify a text into matching theme(s) based on trigger keywords */
export function classifyText(text) {
  const lower = text.toLowerCase();
  const scores = {};

  for (const [id, theme] of Object.entries(THEMES)) {
    scores[id] = theme.triggers.reduce((count, word) => {
      return count + (lower.includes(word) ? 1 : 0);
    }, 0);
  }

  // Sort by score descending
  const ranked = Object.entries(scores)
    .sort(([,a], [,b]) => b - a)
    .filter(([, score]) => score > 0);

  return ranked.map(([id, score]) => ({
    theme: id,
    confidence: score,
  }));
}

/** Get narrator voice config for a theme */
export function getNarratorVoice(themeId) {
  return getTheme(themeId).narrator;
}
