-- Arbooty physical bottles: 5 in GDL for testing
-- Run: npx wrangler d1 execute patrouch-ca-book-app --remote --file=./scripts/seed-arbooty-gdl.sql

INSERT OR REPLACE INTO bottles (id, bottle_type, title, content, content_type, status, launch_lat, launch_lon, current_lat, current_lon, launched_at, is_test, bottle_key, user_id) VALUES

-- GDL #1: Centro
('phys-gdl-001', 'physical',
 '📜 Pista 1 — Plaza de Armas',
 '🔥 Cadena del Tesoro GDL · Pista 1 de 5 🔥

        📜 POEMA 📜

   Bajo las arcadas que tiemblan
   de historias que el tiempo no olvida,
   busca la fuente donde llora
   una leyenda en cada piedra.

   Al oriente, el mercado espera
   con colores de mil tierras.
   Sigue el río de gente hasta
   donde el sol besa los portales.

         — El Narrador',
 'treasure_clue', 'launched',
 20.6767, -103.3475, 20.6767, -103.3475, datetime('now'), 0, 'GDL-001', '07384453'),

-- GDL #2
('phys-gdl-002', 'physical',
 '📜 Pista 2 — Mercado Libertad',
 '🔥 Cadena del Tesoro GDL · Pista 2 de 5 🔥

        🧭 INSTRUCCIONES 🧭

  1. Desde donde estás, camina al norte.
  2. Busca la iguana más antigua de GDL.
  3. Está hecha de piedra y oro.
  4. Al pie de la catedral, gira a la derecha.
  5. Camina hasta donde los artistas
     pintan el cielo cada tarde.
  6. La botella espera entre lienzos.

         — El Narrador',
 'treasure_clue', 'launched',
 20.680868, -103.372203, 20.680868, -103.372203, datetime('now'), 0, 'GDL-002', '07384453'),

-- GDL #3
('phys-gdl-003', 'physical',
 '📜 Pista 3 — Santa Tere',
 '🔥 Cadena del Tesoro GDL · Pista 3 de 5 🔥

        🗺️ MAPA 🗺️

     🏛️  →  🎨  →  🌮
      |        |       |
     🛍️  →  📚  →  🍺
      |        |       |
     ⛪  ←  💃  ←  🎵

   📍 De los artistas, baja al sur.
   📍 Busca el barrio que baila solo.
   📍 La botella está donde la música
      nunca deja de sonar.

         — El Narrador',
 'treasure_clue', 'launched',
 20.6799822, -103.3710819, 20.6799822, -103.3710819, datetime('now'), 0, 'GDL-003', '07384453'),

-- GDL #4
('phys-gdl-004', 'physical',
 '📜 Pista 4 — Minerva',
 '🔥 Cadena del Tesoro GDL · Pista 4 de 5 🔥

        ❓ ACERTIJO ❓

  Miro al occidente con mi lanza dorada.
  Los tapatíos me aman y me odian.
  Soy el símbolo de una ciudad entera,
  pero nadie recuerda mi verdadero nombre.

  Estoy donde la avenida se vuelve glorieta.
  ¿Quién soy?

  🅰️ L_ _ _ _ _ A

         — El Narrador',
 'treasure_clue', 'launched',
 20.6756872, -103.3655049, 20.6756872, -103.3655049, datetime('now'), 0, 'GDL-004', '07384453'),

-- GDL #5: El Tesoro
('phys-gdl-005', 'physical',
 '🏴‍☠️ EL TESORO DEL CAPITÁN GARRAS — GDL 🏴‍☠️',
 '🏴‍☠️════════════════════════════════🏴‍☠️

   ¡LO ENCONTRASTE, VALENTE TAPATÍO!

   Has recorrido Guadalajara de punta
   a punta siguiendo las pistas del viejo
   Capitán Garras:

   🏴‍☠️ Centro → Mercado → Santa Tere
   🏴‍☠️ → Minerva → El Tesoro

   🎨 La ilustración de Antoine que el
      Capitán guardaba en su cofre:
      «Una iguana pirata con sombrero
       de charro, montada en una botella
       de tequila sobre las olas del
       lago de Chapala.»

   🏆 +250 Combustible · +500 Puntos
   🏆 Logro: Tesorero Tapatío 🦀

         — El Narrador, orgulloso
            (con tequila en la pata)

🏴‍☠️════════════════════════════════🏴‍☠️',
 'treasure_clue', 'launched',
 20.6728627, -103.3460157, 20.6728627, -103.3460157, datetime('now'), 0, 'GDL-005', '07384453');
