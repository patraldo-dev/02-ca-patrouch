-- Seed physical bottles — treasure hunt chain (Puerto Vallarta)
-- 5 DIFFERENT clue formats. Run: npx wrangler d1 execute patrouch-ca-book-app --local --file=./scripts/seed-physical-bottles.sql

INSERT OR IGNORE INTO bottles (id, bottle_type, title, content, content_type, status, launch_lat, launch_lon, current_lat, current_lon, launched_at, is_test, bottle_key, user_id) VALUES

-- #1: Malecón — CRYPTIC POEM → leads to Los Muertos
('phys-malecon-001', 'physical',
 '📜 Pista 1 — El Poema del Malecón',
 '🔥 Cadena del Tesoro · Pista 1 de 5 🔥\n\n                ✨ POEMA ✨\n\n        Bajo los caballeros de bronce\n        que montan olas que no existen,\n        el sol traza un camino dorado\n        hacia el sur, donde la arena ríe.\n\n        Los vivos la llaman playa,\n        los muertos la llaman hogar.\n        Busca donde las palapas danzan\n        y el mar es turquesa como un sueño.\n\n        La botella te espera entre sombras\n        de palmeras y margaritas blancas.\n\n              — El Narrador',
 'treasure_clue', 'launched',
 20.6534, -105.2253, 20.6534, -105.2253, datetime('now'), 0, 'PV-MALECON', '07384453'),

-- #2: Los Muertos — INSTRUCTIONS → leads to Isla Cuale
('phys-losmuertos-002', 'physical',
 '📜 Pista 2 — Las Instrucciones del Navegante',
 '🔥 Cadena del Tesoro · Pista 2 de 5 🔥\n\n            🧭 INSTRUCCIONES 🧭\n\n  1. Desde donde estás, busca el Río Cuale.\n  2. Camina 300 pasos río arriba por la orilla oeste.\n  3. Cruza el puente peatonal de madera.\n  4. En la isla, sigue el sendero entre bugambilias.\n  5. Busca las estatuas de artistas junto al mercado.\n  6. La botella está bajo la sombra de una higuera,\n     donde las iguanas toman el sol como reyes.\n\n  ⚠️ Cuidado con los cocodrilos — no, broma.\n     Solo iguanas. Son inofensivas. Mientras no las\n     provoques. Que no las provoques.\n\n              — El Narrador',
 'treasure_clue', 'launched',
 20.6440, -105.2270, 20.6440, -105.2270, datetime('now'), 0, 'PV-LOS-MUERTOS', '07384453'),

-- #3: Isla Cuale — ASCII MAP → leads to Zona Romántica pier
('phys-cuale-003', 'physical',
 '📜 Pista 3 — Fragmento del Mapa del Capitán',
 '🔥 Cadena del Tesoro · Pista 3 de 5 🔥\n\n            🗺️ MAPA DEL CAPITÁN 🗺️\n\n        N O R T E\n         ↑\n    🌴  🏖️  🌴\n   ╱    ╱│╲    ╲\n  ╱ Isla  │  Zona ╲\n 🏝️ Cuale │ Romántica\n  ╲      │      ╱\n   ╲  ≈≈≈≈≈≈≈  ╱\n    ╲  RÍO CUALE ╱\n     ╲  ≈≈≈≈≈≈╱\n      🌊🌊🌊🌊🌊\n        │  🚶‍♂️\n        │\n        🪵 ← MUELLE\n        │\n        🌊 PACÍFICO\n\n   📍 Sigue al SUR desde la isla.\n   🪵 Busca el muelle de madera al\n      final de la Zona Romántica.\n   🐦 Los pelícanos te guiarán.\n\n        — El Narrador',
 'treasure_clue', 'launched',
 20.6465, -105.2300, 20.6465, -105.2300, datetime('now'), 0, 'PV-ISLA-CUALE', '07384453'),

-- #4: Zona Romántica pier — RIDDLE → leads to Olas Altas
('phys-romantica-004', 'physical',
 '📜 Pista 4 — El Acertijo del Pirata',
 '🔥 Cadena del Tesoro · Pista 4 de 5 🔥\n\n            ❓ ACERTIJO ❓\n\n  Soy una playa sin arena suave,\n  mis olas son altas como la ambición.\n  Los pescadores me prefieren al amanecer,\n  lanzan sus redes desde mis rocas negras.\n\n  Estoy al NORTE del muelle donde estás,\n  donde el viento golpea sin compasión\n  y los surfistas buscan su gloria.\n\n  ¿Qué lugar soy?\n\n  🅰️ _ _ _ _ _   _ _ _ _ _ _\n\n  (La primera letra de cada nombre de\n   las 3 pistes anteriores forma la\n   respuesta... o no. Piensa en las\n   olas ALTAS.)\n\n              — El Narrador',
 'treasure_clue', 'launched',
 20.6380, -105.2240, 20.6380, -105.2240, datetime('now'), 0, 'PV-ROMANTICA', '07384453'),

-- #5: Olas Altas — THE TREASURE
('phys-olasaltas-005', 'physical',
 '🏴‍☠️ EL TESORO DEL CAPITÁN GARRAS 🏴‍☠️',
 '🏴‍☠️════════════════════════════════🏴‍☠️\n\n   ¡LO ENCONTRASTE, VALIENTE NAVEGANTE!\n\n   Has recorrido Puerto Vallarta de punta\n   a punta siguiendo las pistas del viejo\n   Capitán Garras:\n\n   🏴‍☠️ Malecón → Los Muertos → Isla Cuale\n   🏴‍☠️ → Muelle Romántico → Olas Altas\n\n   ¿El tesoro? No es oro ni esmeraldas.\n\n   🎨 Es la ilustración que Antoine dejó\n      guardada en el cofre del Capitán:\n      «Un mapache pirata sobre las olas\n       del Pacífico, con corona de conchas\n       y una botella de ron en la pata.»\n\n   📍 El tesoro eres tú — y esta ciudad\n      que caminaste con tus propios pies.\n\n   🏆 +250 Combustible · +500 Puntos\n   🏆 Logro: Seguidor del Capitán 🦀\n\n        — El Narrador, orgulloso\n           (y con un guiño de mapache)\n\n🏴‍☠️════════════════════════════════🏴‍☠️',
 'treasure_clue', 'launched',
 20.6570, -105.2280, 20.6570, -105.2280, datetime('now'), 0, 'PV-OLAS-ALTAS', '07384453');
