// Engine tests: node --test tests/oulipo/
// Where behaviour is meant to match across languages, the three languages
// get the same assertion. Rules specific to one language have their own
// fixtures: fr elisions, es accents and ñ, en contractions, plural and
// gender folding, and inflected forms that pass or fail under each policy.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CONFIGS,
    analyze,
    countWords,
    defaultPolicy,
    explain,
    findViolations,
    isLang,
    judge,
    LANGS,
    markText,
    tierFor,
    tokenize,
    VERB_POLICIES
} from '../../src/lib/oulipo/engine.js';
import { FIXTURES } from './fixtures.js';

const FAMILIES = { verbs: 'families' };
const keyOf = (word, lang, policy = null) => explain(word, lang, policy).key;
const keysOf = (text, lang, policy = null) =>
    analyze(text, lang, policy).types.map((type) => type.key);
const contentOf = (text, lang, policy = null) =>
    tokenize(text, lang, policy)
        .filter((tok) => tok.content)
        .map((tok) => tok.form);

function sameKey(lang, policy, ...forms) {
    const first = keyOf(forms[0], lang, policy);
    for (const form of forms.slice(1)) assert.equal(keyOf(form, lang, policy), first, `${lang}: ${forms.join(' = ')}`);
    return first;
}

// ── Every language has the same machinery ──────────────────────────────

test('fr, en and es expose one config of the same shape', () => {
    assert.deepEqual([...LANGS].sort(), ['en', 'es', 'fr']);
    const [en, es, fr] = LANGS.map((lang) => Object.keys(CONFIGS[lang]).sort());
    assert.deepEqual(es, en);
    assert.deepEqual(fr, en);
    for (const lang of LANGS) {
        const cfg = CONFIGS[lang];
        assert.equal(cfg.code, lang);
        assert.equal(cfg.minWordLength, 4, lang);
        assert.ok(cfg.functionSet instanceof Set && cfg.functionSet.size > 150, lang);
        assert.ok(cfg.verbFamilyMap instanceof Map && cfg.verbFamilyMap.size > 100, lang);
        assert.equal(typeof cfg.fold, 'function', lang);
        assert.equal(cfg.tiers.length, 4, lang);
        assert.ok(VERB_POLICIES.includes(cfg.verbs), lang);
        assert.equal(defaultPolicy(lang).verbs, cfg.verbs, lang);
    }
    assert.ok(isLang('en') && isLang('es') && isLang('fr'));
    assert.ok(!isLang('de') && !isLang(null) && !isLang('toString'));
    assert.throws(() => analyze('text', 'de', null), /unsupported language/);
});

test('word lists are clean: lowercase letters only', () => {
    const letters = /^\p{L}+$/u;
    for (const lang of LANGS) {
        const cfg = CONFIGS[lang];
        for (const word of cfg.functionSet) assert.match(word, letters, `${lang} function word "${word}"`);
        for (const word of cfg.verbFamilyMap.keys()) assert.match(word, letters, `${lang} verb form "${word}"`);
        for (const word of cfg.verbFamilyMap.values()) assert.match(word, letters, `${lang} verb key "${word}"`);
        // Every family key is a form of its own family.
        for (const [form, family] of cfg.verbFamilyMap) assert.ok(cfg.verbFamilyMap.has(family), `${lang} ${form} → ${family}`);
    }
});

// ── Tokenizer ──────────────────────────────────────────────────────────

test('en: contractions are function words, a possessive keeps its noun', () => {
    const toks = tokenize("The writer's pencil doesn't work; it wasn't enough.", 'en', null);
    assert.deepEqual(
        toks.map((tok) => `${tok.form}${tok.content ? '*' : ''}`),
        ['the', 'writer*', 's', 'pencil*', 'doesn', 't', 'work*', 'it', 'wasn', 't', 'enough']
    );
    assert.equal(toks[1].key, 'writer');
});

test('fr: elisions split on the apostrophe and the base word is checked alone', () => {
    const toks = tokenize("L'avion n'est pas là, qu'il dise aujourd'hui quelqu'un.", 'fr', null);
    assert.deepEqual(
        toks.map((tok) => `${tok.form}${tok.content ? '*' : ''}`),
        ['l', 'avion*', 'n', 'est', 'pas', 'là', 'qu', 'il', 'dise*', 'aujourd', 'hui', 'quelqu', 'un']
    );
    assert.equal(toks[1].start, 2);
});

test('fr: œ and æ are written out in the folded form', () => {
    assert.equal(explain('cœur', 'fr').form, 'coeur');
    assert.equal(explain('cœur', 'fr').word, 'cœur');
    sameKey('fr', null, 'cœur', 'coeur');
    assert.equal(keyOf('œil', 'fr'), 'oeil');
    assert.equal(keyOf('sœur', 'fr'), 'soeur');
});

test('es: ñ and accents are distinct letters', () => {
    assert.notEqual(keyOf('año', 'es'), keyOf('ano', 'es'));
    assert.notEqual(keyOf('papa', 'es'), keyOf('papá', 'es'));
    assert.notEqual(keyOf('canción', 'es'), keyOf('cansion', 'es'));
    assert.notEqual(keyOf('llena', 'es'), keyOf('lena', 'es'));
});

test('es: articles, pronouns and conjunctions count with or without the accent', () => {
    for (const word of ['el', 'él', 'que', 'qué', 'si', 'sí', 'mas', 'más', 'tu', 'tú', 'mi', 'mí']) {
        assert.equal(explain(word, 'es').fn, true, word);
    }
    assert.deepEqual(contentOf('El niño y la niña están en la casa.', 'es'), ['niño', 'niña', 'casa']);
});

test('offsets point at the original text and lines are counted', () => {
    const text = 'Casa luna y sol\nmar “luz” 2026 pan\nfin.';
    assert.deepEqual(
        tokenize(text, 'es', null).map((tok) => [text.slice(tok.start, tok.end), tok.line]),
        [
            ['Casa', 1], ['luna', 1], ['y', 1], ['sol', 1], ['mar', 2],
            ['luz', 2], ['pan', 2], ['fin', 3]
        ]
    );
});

test('digits, punctuation and emoji are not words', () => {
    assert.deepEqual(
        tokenize('42 — «Bonjour» 🙂 a3b x_y', 'fr', null).map((tok) => `${tok.form}${tok.content ? '*' : ''}`),
        ['bonjour*', 'a', 'b', 'x', 'y']
    );
});

test('a curly apostrophe behaves like a straight one', () => {
    assert.deepEqual(contentOf('l’avion', 'fr'), contentOf("l'avion", 'fr'));
    assert.deepEqual(contentOf('doesn’t matter', 'en'), contentOf("doesn't matter", 'en'));
});

// ── Function words never count ─────────────────────────────────────────

test('a plain sentence yields exactly its content words', () => {
    assert.deepEqual(contentOf('The hound was running with a stick in its mouth.', 'en'), [
        'hound', 'running', 'stick', 'mouth'
    ]);
    assert.deepEqual(contentOf('She will not have been here.', 'en'), []);
    assert.deepEqual(
        contentOf("Elle ne savait pas s'ils auraient voulu rester dans la cuisine.", 'fr'),
        ['savait', 'voulu', 'rester', 'cuisine']
    );
    assert.deepEqual(
        contentOf('Ella no sabía si ellos habrían querido quedarse en la cocina.', 'es'),
        ['sabía', 'querido', 'quedarse', 'cocina']
    );
});

test('the same spelling can be a function word in one language and a word in another', () => {
    assert.equal(explain('son', 'es').fn, true);
    assert.equal(explain('son', 'en').fn, false);
    assert.equal(explain('he', 'es').fn, true);
    assert.equal(explain('mais', 'fr').fn, true);
    assert.equal(explain('más', 'es').fn, true);
    assert.equal(explain('well', 'en').fn, true);
    assert.equal(explain('esta', 'es').fn, true);
    assert.equal(explain('esta', 'en').fn, false);
});

test('every form of the core auxiliaries and modals is a function word', () => {
    const samples = {
        en: 'be am is are was were been being have has had having do does did done doing will would shall should can could may might must ought',
        es: 'soy eres fue fueron eran serán sea fuese estoy estuviste estuvo estaban estén estado he has ha hay hemos hubo había haya tengo tiene tuvo tenía tendrán tenga hago haces hizo hacía harán haya hecho hecha puedo puede pudo podría debo debe debió debería',
        fr: 'suis es est fut étaient sera soient été ai as a ont eut avaient aura eu fais fait firent fera peux peut put pourra dois doit durent devra faut fallait faudra'
    };
    for (const lang of LANGS) {
        for (const word of samples[lang].split(' ')) assert.equal(explain(word, lang).fn, true, `${lang} ${word}`);
    }
});

test('words under the minimum length are neither ropes nor function words', () => {
    const toks = tokenize('luz sol pan mar eau feu roi', 'es', null);
    assert.equal(toks.length, 7);
    for (const tok of toks) {
        assert.equal(tok.content, false, tok.form);
        assert.equal(tok.fn, false, tok.form);
    }
    assert.equal(explain('eau', 'fr').content, false);
    assert.equal(explain('ciel', 'fr').content, true);
});

// ── Plural folding ─────────────────────────────────────────────────────

test('en: plurals fold onto their singular', () => {
    for (const [plural, singular] of [
        ['stories', 'story'], ['churches', 'church'], ['boxes', 'box'], ['wishes', 'wish'],
        ['kisses', 'kiss'], ['quizzes', 'quiz'], ['potatoes', 'potato'], ['canoes', 'canoe'],
        ['niches', 'niche'], ['waves', 'wave'], ['gloves', 'glove'], ['cats', 'cat'],
        ['houses', 'house'], ['phases', 'phase'], ['sizes', 'size'], ['dies', 'die'],
        ['glasses', 'glass'], ['classes', 'class'], ['crosses', 'cross']
    ]) sameKey('en', null, plural, singular);
    for (const word of ['news', 'means', 'glass', 'virus', 'crisis', 'chaos', 'lens']) {
        assert.equal(keyOf(word, 'en'), word, word);
    }
    assert.notEqual(keyOf('news', 'en'), keyOf('new', 'en'));
});

test('es: plurals fold onto their singular', () => {
    for (const [plural, singular] of [
        ['casas', 'casa'], ['libros', 'libro'], ['noches', 'noche'], ['madres', 'madre'],
        ['aires', 'aire'], ['luces', 'luz'], ['peces', 'pez'], ['felices', 'feliz'],
        ['veces', 'vez'], ['canciones', 'canción'], ['corazones', 'corazón'], ['razones', 'razón'],
        ['mares', 'mar'], ['flores', 'flor'], ['lugares', 'lugar'], ['dolores', 'dolor'],
        ['panes', 'pan'], ['canales', 'canal'], ['fáciles', 'fácil'], ['árboles', 'árbol'],
        ['azules', 'azul'], ['papeles', 'papel'], ['verdades', 'verdad'], ['paredes', 'pared'],
        ['virtudes', 'virtud'], ['mujeres', 'mujer'], ['mejores', 'mejor'], ['calles', 'calle'],
        ['probables', 'probable'], ['llaves', 'llave']
    ]) sameKey('es', null, plural, singular);
});

test('fr: plurals fold onto their singular', () => {
    for (const [plural, singular] of [
        ['chats', 'chat'], ['livres', 'livre'], ['nuits', 'nuit'], ['mères', 'mère'],
        ['châteaux', 'château'], ['oiseaux', 'oiseau'], ['chevaux', 'cheval'],
        ['animaux', 'animal'], ['journaux', 'journal'], ['travaux', 'travail'], ['yeux', 'oeil'],
        ['lieux', 'lieu'], ['cheveux', 'cheveu'], ['genoux', 'genou'], ['bijoux', 'bijou'],
        ['champs', 'champ'], ['larmes', 'larme'], ['fleurs', 'fleur'], ['ponts', 'pont']
    ]) sameKey('fr', null, plural, singular);
    assert.notEqual(keyOf('fils', 'fr'), keyOf('fil', 'fr'));
});

test('folding is stable: folding a key again changes nothing', () => {
    const samples = {
        en: 'stories churches waves news cats story walked running kisses dies',
        es: 'casas luces canciones flores pequeñas amigas trabaja llega sigue buena niña roja sueña pequeña calle mejores',
        fr: 'chats châteaux chevaux lieux petites grandes belles curieuses bonnes anciennes présentes naturelles douces fermées jolies venues connues rênes'
    };
    for (const lang of LANGS) {
        for (const word of samples[lang].split(' ')) {
            const once = keyOf(word, lang);
            assert.equal(keyOf(once, lang), once, `${lang} ${word}`);
        }
    }
});

// ── Gender folding ─────────────────────────────────────────────────────

test('es: the feminine folds onto the masculine', () => {
    for (const [feminine, masculine] of [
        ['cansada', 'cansado'], ['perdida', 'perdido'], ['viva', 'vivo'], ['hermosa', 'hermoso'],
        ['única', 'único'], ['amiga', 'amigo'], ['ciega', 'ciego'], ['sigue', 'sigo'],
        ['trabaja', 'trabajo'], ['hija', 'hijo'], ['niña', 'niño'], ['roja', 'rojo'],
        ['pequeña', 'pequeño'], ['sueña', 'sueño'], ['derecha', 'derecho'], ['bella', 'bello'],
        ['perra', 'perro'], ['soñadora', 'soñador'], ['necesaria', 'necesario'], ['humana', 'humano'],
        ['buena', 'bueno'], ['larga', 'largo'], ['fría', 'frío'],
        ['japonesa', 'japonés'], ['pequeñas', 'pequeño'], ['amigas', 'amigo']
    ]) sameKey('es', null, feminine, masculine);
});

test('es: a feminine that is another word is never folded', () => {
    for (const [word, other] of [
        ['cosa', 'coso'], ['hora', 'hor'], ['señora', 'señor'], ['hermana', 'hermano'],
        ['manzana', 'manzano'], ['música', 'músico'], ['política', 'político'], ['crítica', 'crítico'],
        ['física', 'físico'], ['oliva', 'olivo'], ['crea', 'creo'], ['marea', 'mareo'],
        ['abaja', 'abajo'], ['pecha', 'pecho'], ['barra', 'barro'], ['rodilla', 'rodillo'],
        ['mejilla', 'mejillo'], ['mejora', 'mejor'], ['puerta', 'puerto'], ['casa', 'caso'],
        ['tienda', 'tiendo'], ['punta', 'punto']
    ]) {
        assert.equal(keyOf(word, 'es'), word, `${word}`);
        assert.notEqual(keyOf(word, 'es'), keyOf(other, 'es'), `${word} vs ${other}`);
    }
    sameKey('es', null, 'cosas', 'cosa');
    sameKey('es', null, 'horas', 'hora');
});

test('fr: the feminine folds onto the masculine', () => {
    for (const [feminine, masculine] of [
        ['petite', 'petit'], ['chaude', 'chaud'], ['froide', 'froid'], ['fraîche', 'frais'],
        ['grosse', 'gros'], ['basse', 'bas'], ['sûre', 'sûr'], ['vraie', 'vrai'], ['seule', 'seul'],
        ['claire', 'clair'], ['sèche', 'sec'], ['blanche', 'blanc'], ['franche', 'franc'],
        ['fausse', 'faux'], ['rousse', 'roux'], ['veuve', 'veuf'],
        ['brève', 'bref'], ['jalouse', 'jaloux'], ['curieuse', 'curieux'], ['heureuse', 'heureux'],
        ['ancienne', 'ancien'], ['humaine', 'humain'], ['prochaine', 'prochain'], ['voisine', 'voisin'],
        ['paysanne', 'paysan'], ['bonne', 'bon'], ['mignonne', 'mignon'], ['charmante', 'charmant'],
        ['présente', 'présent'], ['naturelle', 'naturel'], ['réelle', 'réel'], ['morale', 'moral'],
        ['nette', 'net'], ['muette', 'muet'], ['légère', 'léger'], ['première', 'premier'],
        ['noire', 'noir'], ['haute', 'haut'], ['grande', 'grand'], ['profonde', 'profond'],
        ['longue', 'long'], ['vive', 'vif'], ['active', 'actif'], ['actrice', 'acteur'],
        ['parfaite', 'parfait'], ['éteinte', 'éteint'], ['sainte', 'saint'], ['douce', 'doux'],
        ['fermée', 'fermé'], ['jolie', 'joli'], ['venue', 'venu'], ['connue', 'connu'],
        ['belles', 'beau'], ['nouveaux', 'nouveau'], ['vieilles', 'vieux'], ['folle', 'fou'],
        ['molle', 'mou'], ['petites', 'petit']
    ]) sameKey('fr', null, feminine, masculine);
});

test('fr: a feminine that is another word is never folded', () => {
    for (const [word, other] of [
        ['graine', 'grain'], ['machine', 'machin'], ['médecine', 'médecin'], ['colonne', 'colon'],
        ['chante', 'chant'], ['manière', 'manier'], ['glande', 'gland'], ['mousse', 'mou'],
        ['issue', 'issu'], ['moue', 'mou']
    ]) {
        assert.equal(keyOf(word, 'fr'), word, `${word}`);
        assert.notEqual(keyOf(word, 'fr'), keyOf(other, 'fr'), `${word} vs ${other}`);
    }
    sameKey('fr', null, 'graines', 'graine');
    sameKey('fr', null, 'colonnes', 'colonne');
    // No rule reaches these: the noun is not the feminine of anything.
    for (const word of ['porte', 'terre', 'guerre', 'ville', 'fille', 'pierre']) {
        assert.equal(CONFIGS.fr.fold(word), null, word);
    }
    assert.notEqual(keyOf('porte', 'fr'), keyOf('port', 'fr'));
});

test('en: nothing folds for gender', () => {
    assert.equal(keyOf('writer', 'en'), 'writer');
    assert.equal(keyOf('actress', 'en'), 'actress');
});

// ── Verb policy ────────────────────────────────────────────────────────

test('strict is the default everywhere: verb forms are each their own word', () => {
    for (const lang of LANGS) assert.equal(defaultPolicy(lang).verbs, 'strict', lang);
    assert.notEqual(keyOf('went', 'en'), keyOf('go', 'en'));
    assert.notEqual(keyOf('went', 'en'), keyOf('gone', 'en'));
    assert.notEqual(keyOf('vengo', 'es'), keyOf('vino', 'es'));
    assert.notEqual(keyOf('vais', 'fr'), keyOf('irai', 'fr'));
    assert.notEqual(keyOf('prit', 'fr'), keyOf('prenait', 'fr'));
});

test('families folds the closed list of irregular verbs, in all three languages', () => {
    sameKey('en', FAMILIES, 'went', 'goes', 'going', 'gone', 'going');
    sameKey('en', FAMILIES, 'think', 'thought', 'thoughts');
    sameKey('en', FAMILIES, 'write', 'writes', 'wrote', 'written');
    sameKey('en', FAMILIES, 'break', 'broke', 'broken');
    // "lay" is both the past of lie and a verb of its own: one family.
    // (lie and lay themselves are three letters long and never count.)
    sameKey('en', FAMILIES, 'lain', 'laid', 'lying', 'lies', 'lays', 'laying');
    sameKey('es', FAMILIES, 'venir', 'vengo', 'vino', 'viniendo', 'venga');
    sameKey('es', FAMILIES, 'querer', 'quiero', 'quise', 'querido', 'querida');
    sameKey('fr', FAMILIES, 'aller', 'vais', 'irons', 'allé');
    sameKey('fr', FAMILIES, 'prendre', 'prit', 'prenait', 'pris');
    sameKey('fr', FAMILIES, 'partir', 'part', 'partait', 'parti');
    assert.equal(keyOf('went', 'en', FAMILIES), 'go');
    assert.equal(keyOf('querida', 'es', FAMILIES), 'querer');
    assert.equal(keyOf('allé', 'fr', FAMILIES), 'aller');
});

test('regular verbs stay form-exact even under families, as do listed homographs', () => {
    assert.notEqual(keyOf('walked', 'en', FAMILIES), keyOf('walk', 'en', FAMILIES));
    assert.notEqual(keyOf('caminó', 'es', FAMILIES), keyOf('caminar', 'es', FAMILIES));
    assert.notEqual(keyOf('parlait', 'fr', FAMILIES), keyOf('parler', 'fr', FAMILIES));
    // "bois" (the woods) is not folded onto "boire"; "boit" is.
    assert.notEqual(keyOf('bois', 'fr', FAMILIES), 'boire');
    assert.equal(keyOf('boit', 'fr', FAMILIES), 'boire');
});

test('an unknown policy falls back to the language default', () => {
    assert.equal(explain('went', 'en', null).key, 'went');
    assert.equal(explain('went', 'en', {}).key, 'went');
    assert.equal(explain('went', 'en', { verbs: 'nope' }).key, 'went');
});

// ── findViolations ─────────────────────────────────────────────────────

test('the plural or the other gender of a banned word is caught, in every language', () => {
    const cases = [
        ['en', 'story', 'She told stories all night.'],
        ['es', 'canción', 'Ella cantó canciones toda la noche.'],
        ['fr', 'chanson', 'Elle a chanté des chansons toute la nuit.'],
        ['es', 'pequeño', 'Una niña pequeña.'],
        ['fr', 'petit', 'Une petite maison.'],
        ['fr', 'grand', 'Une grande maison.'],
        ['es', 'verdad', 'Dos verdades duras.'],
        ['fr', 'œil', 'Deux yeux bleus.']
    ];
    for (const [lang, banned, text] of cases) {
        const found = findViolations(text, [keyOf(banned, lang)], lang, null);
        assert.equal(found.length, 1, `${lang}: "${banned}" banned, text "${text}"`);
    }
});

test('an inflected form passes under strict and fails under families', () => {
    // en: "went" is banned and the rewrite says "goes".
    assert.deepEqual(findViolations('She goes home.', [keyOf('went', 'en')], 'en', null), []);
    assert.equal(findViolations('She goes home.', [keyOf('went', 'en', FAMILIES)], 'en', FAMILIES).length, 1);
    // es: "vino" is banned and the rewrite says "venía".
    assert.deepEqual(findViolations('Venía de lejos.', [keyOf('vino', 'es')], 'es', null), []);
    assert.equal(findViolations('Venía de lejos.', [keyOf('vino', 'es', FAMILIES)], 'es', FAMILIES).length, 1);
    // fr: "pris" is banned and the rewrite says "prenait".
    assert.deepEqual(findViolations('Elle prenait son temps.', [keyOf('pris', 'fr')], 'fr', null), []);
    assert.equal(
        findViolations('Elle prenait son temps.', [keyOf('pris', 'fr', FAMILIES)], 'fr', FAMILIES).length,
        1
    );
});

test('a different word is never a violation', () => {
    assert.deepEqual(findViolations('They were waving.', [keyOf('wave', 'en')], 'en', null), []);
    assert.deepEqual(findViolations('El puerto estaba cerrado.', [keyOf('puerta', 'es')], 'es', null), []);
    assert.deepEqual(findViolations('Le port était fermé.', [keyOf('porte', 'fr')], 'fr', null), []);
    assert.deepEqual(findViolations('Elle a parié.', [keyOf('parti', 'fr')], 'fr', null), []);
});

test('function words can never be violations', () => {
    assert.deepEqual(findViolations('The house.', ['the'], 'en', null), []);
    assert.deepEqual(findViolations('La casa.', ['casa'], 'es', null).length, 1);
    assert.deepEqual(findViolations('La maison.', ['la', 'maison'], 'fr', null).map((v) => v.word), ['maison']);
});

test('violations carry the word, its line and its position', () => {
    const text = 'Una casa.\nOtra casa grande.';
    assert.deepEqual(
        findViolations(text, [keyOf('casa', 'es')], 'es', null).map((v) => [v.word, v.line, text.slice(v.start, v.end)]),
        [['casa', 1, 'casa'], ['casa', 2, 'casa']]
    );
    assert.deepEqual(
        markText('casa casas luna', [keyOf('casa', 'es')], 'es', null).map((span) => span.form),
        ['casa', 'casas']
    );
});

// ── judge ──────────────────────────────────────────────────────────────

test('judge scores hits and misses and rejects ropes that are not in the story', () => {
    const story = 'Luna luna casa noche puertas niebla mar';
    const draft = 'La luna sobre la casa. La noche cerró sus puertas.';
    const result = judge(story, draft, 'es', null, ['luna', 'casa', 'noche', 'puerta', 'niebla', 'mar']);
    assert.deepEqual(
        result.ropes.map((rope) => [rope.key, rope.hit, rope.draftCount]),
        [
            ['luna', true, 1], ['casa', true, 1], ['noche', true, 1],
            ['puerta', true, 1], ['niebla', false, 0]
        ]
    );
    assert.deepEqual(result.invalid, ['mar']); // three letters: never a word
    assert.equal(result.hits, 4);
    assert.equal(result.misses, 1);
    assert.equal(result.score, 3);
    assert.deepEqual(result.ropes[3], {
        key: 'puerta', forms: ['puertas'], hit: true, draftCount: 1, draftForms: ['puertas']
    });
    assert.equal(result.draftTokens, 5);
});

test('judge: the muzzle is the share of the draft that is now off-limits', () => {
    const story = 'luna casa noche puertas niebla viento';
    const draft = 'La luna luna sobre la casa. La noche.';
    // Content tokens: luna ×2, casa, noche. Banning luna and noche forbids 3 of 4.
    assert.equal(judge(story, draft, 'es', null, ['luna', 'noche']).muzzlePct, 75);
    assert.equal(judge(story, draft, 'es', null, ['viento']).muzzlePct, 0);
});

test('judge: duplicate ropes count once, junk is ignored', () => {
    const result = judge('luna casa noche', 'La luna.', 'es', null, ['luna', 'luna', 'casa']);
    assert.deepEqual(result.ropes.map((rope) => rope.key), ['luna', 'casa']);
    assert.equal(result.hits, 1);
    assert.equal(result.misses, 1);
    assert.equal(result.score, 0);
    const junk = judge('luna casa', 'La luna.', 'es', null, [null, 7, '', 'luna']);
    assert.deepEqual(junk.invalid, ['', '', '']);
    assert.equal(junk.ropes.length, 1);
    assert.deepEqual(judge('luna', 'La luna.', 'es', null, 'luna').ropes, []);
});

test('judge: an empty draft scores nothing and never divides by zero', () => {
    const result = judge('luna casa noche', '', 'es', null, ['luna']);
    assert.equal(result.muzzlePct, 0);
    assert.equal(result.ropes[0].hit, false);
    assert.equal(result.draftTokens, 0);
});

test('judge: a hit can come through a plural, the other gender, or a verb family', () => {
    sameKey('es', FAMILIES, 'querida', 'querer');
    const story = 'historias pequeñas vengo';
    const draft = 'Una historia pequeña, y ella vino.';
    assert.deepEqual(
        judge(story, draft, 'es', null, keysOf(story, 'es')).ropes.map((rope) => rope.hit),
        [true, true, false]
    );
    assert.deepEqual(
        judge(story, draft, 'es', FAMILIES, keysOf(story, 'es', FAMILIES)).ropes.map((rope) => rope.hit),
        [true, true, true]
    );
});

// ── analyze, tiers, word count ─────────────────────────────────────────

test('analyze groups a family into one type, shown by its most frequent form', () => {
    const analysis = analyze('The stories, a story; stories. Waves wave.', 'en', null);
    assert.deepEqual(analysis.types.map((type) => [type.key, type.count, type.display]), [
        ['story', 3, 'stories'],
        ['wave', 2, 'waves']
    ]);
    assert.deepEqual(analysis.types[0].forms, { stories: 2, story: 1 });
    assert.equal(analysis.vocabSize, 2);
    assert.equal(analysis.contentTokens, 5);
    assert.equal(analysis.functionTokens, 2);
    assert.equal(analysis.totalTokens, 7);
});

test('analyze counts function words and short words separately', () => {
    const analysis = analyze('El sol y la luz de la luna llena.', 'es', null);
    assert.equal(analysis.functionTokens, 5);
    assert.equal(analysis.shortTokens, 2);
    assert.equal(analysis.contentTokens, 2);
    assert.equal(analysis.vocabSize, 2);
});

test('the fixture pieces tokenize into a real vocabulary in each language', () => {
    for (const lang of LANGS) {
        for (const piece of [FIXTURES[lang].human, FIXTURES[lang].ai]) {
            const analysis = analyze(piece, lang, null);
            assert.ok(analysis.vocabSize >= 45, `${lang}: ${analysis.vocabSize} types`);
            const share = analysis.functionTokens / analysis.totalTokens;
            assert.ok(share > 0.35 && share < 0.75, `${lang}: function share ${share.toFixed(2)}`);
            for (const type of analysis.types) {
                assert.equal(CONFIGS[lang].functionSet.has(type.key), false, `${lang} ${type.key}`);
            }
        }
    }
});

test('tiers follow the share of the vocabulary sent', () => {
    for (const lang of LANGS) {
        assert.equal(tierFor(lang, 0, 100), 0);
        assert.equal(tierFor(lang, 14, 100), 0);
        assert.equal(tierFor(lang, 15, 100), 1);
        assert.equal(tierFor(lang, 35, 100), 2);
        assert.equal(tierFor(lang, 60, 100), 3);
        assert.equal(tierFor(lang, 85, 100), 4);
        assert.equal(tierFor(lang, 100, 100), 4);
        assert.equal(tierFor(lang, 0, 0), 0);
    }
});

test('countWords counts whitespace-separated words', () => {
    assert.equal(countWords('  one two\nthree  '), 3);
    assert.equal(countWords(''), 0);
    assert.equal(countWords(null), 0);
});

// ── Guards found by the collision audit ────────────────────────────────
// Each of these pairs is two real, unrelated words: one must never fold
// onto the other.

test('es: audited pairs never merge', () => {
    for (const [word, other] of [
        ['reina', 'reino'], ['flora', 'flor'], ['talla', 'tallo'], ['deseja', 'desejo'],
        ['porra', 'porro'], ['chorra', 'chorro'], ['grana', 'grano'],
        ['vida', 'vido'], ['hoja', 'hojo'], ['tierra', 'tierro'], ['guerra', 'guerro'],
        ['pena', 'peno'], ['idea', 'ideo'], ['línea', 'líneo'], ['aurora', 'auror']
    ]) {
        assert.equal(keyOf(word, 'es'), word, word);
        assert.notEqual(keyOf(word, 'es'), keyOf(other, 'es'), `${word} vs ${other}`);
    }
    sameKey('es', null, 'reinas', 'reina');
    sameKey('es', null, 'vidas', 'vida');
    sameKey('es', null, 'hojas', 'hoja');
    sameKey('es', null, 'tierras', 'tierra');
    sameKey('es', null, 'flores', 'flor');
});

test('fr: audited pairs never merge', () => {
    for (const [word, other] of [
        ['appelle', 'appel'], ['rappelle', 'rappel'], ['donne', 'don'], ['vente', 'vent'],
        ['avale', 'aval'], ['étale', 'étal'], ['motive', 'motif'], ['mère', 'mer'],
        ['pardonne', 'pardon'], ['raisonne', 'raison'], ['commente', 'comment']
    ]) {
        assert.notEqual(keyOf(word, 'fr'), keyOf(other, 'fr'), `${word} vs ${other}`);
    }
    assert.equal(keyOf('donne', 'fr'), 'donne');
    assert.equal(keyOf('vente', 'fr'), 'vente');
    sameKey('fr', null, 'ventes', 'vente');
    sameKey('fr', null, 'donnes', 'donne');
    // The pairs the dropped -onne rule used to cover.
    sameKey('fr', null, 'bonne', 'bon');
    sameKey('fr', null, 'mignonne', 'mignon');
    sameKey('fr', null, 'patronne', 'patron');
    // -aux plurals of adjectives in -ental.
    sameKey('fr', null, 'sentimentaux', 'sentimental');
    sameKey('fr', null, 'mentaux', 'mental');
    // "comment" and "voire" are function words.
    assert.equal(explain('comment', 'fr').fn, true);
    assert.equal(explain('voire', 'fr').fn, true);
});

test('en: audited plurals', () => {
    sameKey('en', null, 'buzzes', 'buzz');
    sameKey('en', null, 'fizzes', 'fizz');
    sameKey('en', null, 'quizzes', 'quiz');
    sameKey('en', null, 'fezzes', 'fez');
});
