// French — one of three equal language configs (contract: ../engine.js).
//
// Accents are meaningful and never stripped. Elisions are split on the
// apostrophe (l'avion → l' + avion, qu'elle → qu' + elle), so both halves are
// checked on their own; œ and æ are written out (oe, ae) in the folded form.
import { familyMap, pairMap, wordSet, words } from './_shared.js';

const FUNCTION_WORDS = `
le la les l un une des du
ce cet cette ces ça ca cela ceci celui celle ceux celles
mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs
mien mienne miens miennes tien tienne tiens tiennes sien sienne siens siennes
nôtre nôtres vôtre vôtres
je me moi tu te toi il elle on ils elles lui eux soi se s y en nous vous
qu qui que quoi dont quelqu jusqu lorsqu aujourd prud entr chaqu hui
quel quelle quels quelles où
chacun chacune personne rien tout toute tous toutes aucun aucuns aucune aucunes
certains certaines plusieurs quelque quelques autre autres même
à de d en dans sur sous avec sans pour par vers chez entre parmi contre
depuis pendant durant selon devant derrière avant après jusque malgré sauf hors
dès lors afin quant près autour via
et ou mais ni car or donc que quand lorsque puisque comme si afin quoique
comment voire
ne n pas plus jamais guère non oui si aussi ainsi alors puis encore déjà deja
toujours trop très tant autant peu beaucoup moins bien mal ici là maintenant
aussitôt enfin seulement presque plutôt tellement combien voilà voici même autre
tel telle tels telles quelconque
dedans dehors dessus dessous arrière
zéro deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze
quinze seize vingt trente quarante cinquante soixante cent cents mille million
millions milliard milliards
`;

// Every form of the core auxiliaries/copulas plus the modals.
const AUXILIARY_FORMS = `
être suis es est sommes êtes sont fus fut fûmes fûtes furent étais était étions
étiez étaient serai seras sera serons serez seront serais serait serions seriez
seraient sois soit soyons soyez soient fusse fusses fût fussions fussiez fussent
été étant
avoir ai as a avons avez ont eus eut eûmes eûtes eurent avais avait avions aviez
avaient aurai auras aura aurons aurez auront aurais aurait aurions auriez
auraient aie aies ait ayons ayez aient eusse eusses eût eussions eussiez eussent
eu ayant
faire fais fait faisons faites font fis fit fîmes fîtes firent faisais faisait
faisions faisiez faisaient ferai feras fera ferons ferez feront ferais ferait
ferions feriez feraient fasse fasses fassions fassiez fassent fisse fisses fît
fissions fissiez fissent faisant
pouvoir peux peut pouvons pouvez peuvent pus put pûmes pûtes purent pouvais
pouvait pouvions pouviez pouvaient pourrai pourras pourra pourrons pourrez
pourront pourrais pourrait pourrions pourriez pourraient puisse puisses puissions
puissiez puissent pu
devoir dois doit devons devez doivent dus dut dûmes dûtes durent devais devait
devions deviez devaient devrai devras devra devrons devrez devront devrais
devrait devrions devriez devraient doive doives doivent dû
falloir faut fallut fallait faudra faudrait faille
`;

// Verb families for the optional 'families' policy: the irregular verbs.
// Regular verbs stay form-exact at every level. Forms that are also common
// nouns of another family are left out on purpose (bois, sorte, missions).
const VERB_FAMILIES = `
aller vais vas va allons allez vont allai allas alla allâmes allâtes allèrent
allais allait allions alliez allaient irai iras ira irons irez iront irais irait
irions iriez iraient aille ailles aillions ailliez aillent allasse allasses
allât allassions allassiez allassent allant allé |
venir viens vient venons venez viennent vins vint vînmes vîntes vinrent venais
venait venions veniez venaient viendrai viendras viendra viendrons viendrez
viendront viendrais viendrait viendrions viendriez viendraient vienne viennes
vinsse vinsses vînt vinssions vinssiez vinssent venu venant |
voir vois voit voyons voyez voient vis vit vîmes vîtes virent voyais voyait
voyions voyiez voyaient verrai verras verra verrons verrez verront verrais
verrait verrions verriez verraient voie voies voyions voyiez visse visses vît
vissions vissiez vissent vu voyant |
prendre prends prend prenons prenez prennent pris prit prîmes prîtes prirent
prenais prenait prenions preniez prenaient prendrai prendras prendra prendrons
prendrez prendront prendrais prendrait prendrions prendriez prendraient prenne
prennes prisse prisses prît prissions prissiez prissent prenant |
dire dis dit disons dites disent dîmes dîtes dirent disais disait disions disiez
disaient dirai diras dira dirons direz diront dirais dirait dirions diriez
diraient dise dises disse disses dît dissions dissiez dissent disant |
mettre mets met mettons mettez mettent mis mit mîmes mîtes mirent mettais
mettait mettions mettiez mettaient mettrai mettras mettra mettrons mettrez
mettront mettrais mettrait mettrions mettriez mettraient mette mettes misse
misses mît missiez missent mettant |
partir pars part partons partez partent partis partit partîmes partîtes
partirent partais partait partions partiez partaient partirai partiras partira
partirons partirez partiront partirais partirait partirions partiriez
partiraient parte partes partisse partisses partît partissions partissiez
partissent parti partant |
sortir sors sort sortons sortez sortent sortis sortit sortîmes sortîtes
sortirent sortais sortait sortions sortiez sortaient sortirai sortiras sortira
sortirons sortirez sortiront sortirais sortirait sortirions sortiriez
sortiraient sortisse sortisses sortît sortissions sortissiez sortissent sorti
sortant |
savoir sais sait savons savez savent sus sut sûmes sûtes surent savais savait
savions saviez savaient saurai sauras saura saurons saurez sauront saurais
saurait saurions sauriez sauraient sache saches sachions sachiez sachent susse
susses sût sussions sussiez sussent su sachant |
vouloir veux veut voulons voulez veulent voulus voulut voulûmes voulûtes
voulurent voulais voulait voulions vouliez voulaient voudrai voudras voudra
voudrons voudrez voudront voudrais voudrait voudrions voudriez voudraient
veuille veuilles voulusse voulusses voulût voulussions voulussiez voulussent
voulu voulant |
écrire écris écrit écrivons écrivez écrivent écrivis écrivit écrivîmes écrivîtes
écrivirent écrivais écrivait écrivions écriviez écrivaient écrirai écriras
écrira écrirons écrirez écriront écrirais écrirait écririons écririez écriraient
écrive écrives écrivisse écrivisses écrivît écrivissions écrivissiez écrivissent
écrit écrivant |
lire lis lit lisons lisez lisent lus lut lûmes lûtes lurent lisais lisait
lisions lisiez lisaient lirai liras lira lirons lirez liront lirais lirait
lirions liriez liraient lise lises lusse lusses lût lussions lussiez lussent lu
lisant |
boire boit buvons buvez boivent bus but bûmes bûtes burent buvais buvait buvions
buviez buvaient boirai boiras boira boirons boirez boiront boirais boirait
boirions boiriez boiraient boive boives busse busses bût bussions bussiez
bussent bu buvant |
ouvrir ouvre ouvrons ouvrez ouvrent ouvris ouvrit ouvrîmes ouvrîtes ouvrirent
ouvrais ouvrait ouvrions ouvriez ouvraient ouvrirai ouvriras ouvrira ouvrirons
ouvrirez ouvriront ouvrirais ouvrirait ouvririons ouvririez ouvriraient ouvres
ouvrissions ouvrissiez ouvrissent ouvrisse ouvrisses ouvrît ouvert ouvrant |
suivre suit suivons suivez suivent suivis suivit suivîmes suivîtes suivirent
suivais suivait suivions suiviez suivaient suivrai suivras suivra suivrons
suivrez suivront suivrais suivrait suivrions suivriez suivraient suive suives
suivisse suivisses suivît suivissions suivissiez suivissent suivi suivant |
vivre vit vivons vivez vivent vécus vécut vécûmes vécûtes vécurent vivais vivait
vivions viviez vivaient vivrai vivras vivra vivrons vivrez vivront vivrais
vivrait vivrions vivriez vivraient vive vives vécusse vécusses vécût vécussions
vécussiez vécussent vécu vivant |
naître nais naît naissons naissez naissent naquis naquit naquîmes naquîtes
naquirent naissais naissait naissions naissiez naissaient naîtrai naîtras naîtra
naîtrons naîtrez naîtront naîtrais naîtrait naîtrions naîtriez naîtraient naisse
naisses naquisse naquisses naquît naquissions naquissiez naquissent né naissant
|
rire rit rions riez rient rîmes rîtes rirent riais riait riions riiez riaient
rirai riras rira rirons rirez riront rirais rirait ririons ririez riraient ries
riions riiez risse risses rît rissions rissiez rissent riant |
croire crois croit croyons croyez croient crus crut crûmes crûtes crurent
croyais croyait croyions croyiez croyaient croirai croiras croira croirons
croirez croiront croirais croirait croirions croiriez croiraient croie croies
crusse crusses crût crussions crussiez crussent cru croyant |
connaître connais connaît connaissons connaissez connaissent connus connut
connûmes connûtes connurent connaissais connaissait connaissions connaissiez
connaissaient connaîtrai connaîtras connaîtra connaîtrons connaîtrez connaîtront
connaîtrais connaîtrait connaîtrions connaîtriez connaîtraient connaisse
connusse connusses connût connussions connussiez connussent connu connaissant |
recevoir reçois reçoit recevons recevez reçoivent reçus reçut reçûmes reçûtes
reçurent recevais recevait recevions receviez recevaient recevrai recevras
recevra recevrons recevrez recevront recevrais recevrait recevrions recevriez
recevraient reçoive reçoives reçusse reçusses reçût reçussions reçussiez
reçussent reçu recevant |
conduire conduis conduit conduisons conduisez conduisent conduisis conduisit
conduisîmes conduisîtes conduisirent conduisais conduisait conduisions
conduisiez conduisaient conduirai conduiras conduira conduirons conduirez
conduiront conduirais conduirait conduirions conduiriez conduiraient conduise
conduises conduisisse conduisisses conduisît conduisissions conduisissiez
conduisissent conduit conduisant |
craindre crains craint craignons craignez craignent craignis craignit craignîmes
craignîtes craignirent craignais craignait craignions craigniez craignaient
craindrai craindras craindra craindrons craindrez craindront craindrais
craindrait craindrions craindriez craindraient craigne craignes craignisse
craignisses craignît craignissions craignissiez craignissent craint craignant |
valoir vaux valait valus valut valûmes valûtes valurent vaudrai vaudras vaudra
vaudrons vaudrez vaudront vaudrais vaudrait vaudrions vaudriez vaudraient vaille
vailles vaillions vaillez vaillent valusse valusses valût valussions valussiez
valussent valu |
plaire plais plaît plaisons plaisez plaisent plus plut plûmes plûtes plurent
plaisais plaisait plaisions plaisiez plaisaient plairai plairas plaira plairons
plairez plairont plairais plairait plairions plairiez plairaient plaise plaises
plusse plusses plût plussions plussiez plussent plu plaisant |
taire tais tait taisons taisez taisent tus tut tûmes tûtes turent taisais
taisait taisions taisiez taisaient tairai tairas taira tairons tairez tairont
tairais tairait tairions tairiez tairaient taise taises tusse tusses tût
tussions tussiez tussent taisant |
fuir fuis fuit fuyons fuyez fuient fuîmes fuîtes fuirent fuyais fuyait fuyions
fuyiez fuyaient fuirai fuiras fuira fuirons fuirez fuiront fuirais fuirait
fuirions fuiriez fuiraient fuie fuies fuyions fuyiez fuyant fui |
croître croît croissons croissez croissent crûmes crûtes crûrent croissais
croissait croissions croissiez croissaient croîtrai croîtras croîtra croîtrons
croîtrez croîtront croîtrais croîtrait croîtrions croîtriez croîtraient croisse
croisses crûsse crûsses crût crûssions crûssiez crûssent crû |
conclure conclus conclut concluons concluez concluent concluâmes concluâtes
conclurent concluais concluait concluions concluiez concluaient conclurai
concluras conclura conclurons conclurez concluront conclurais conclurait
conclurions concluriez concluraient conclue conclues concluions concluiez
conclusse conclusses conclût conclussions conclussiez conclussent conclu
concluant |
suffire suffis suffit suffisons suffisez suffisent suffîmes suffîtes suffirent
suffisais suffisait suffisions suffisiez suffisaient suffirai suffiras suffira
suffirons suffirez suffiront suffirais suffirait suffirions suffiriez
suffiraient suffise suffises suffît suffissions suffissiez suffissent suffi
suffisant |
asseoir assois assoit asseyons asseyez assoient assieds asseyent assis assit
assîmes assîtes assirent asseyais asseyait asseyions asseyiez asseyaient
assoirai assoiras assoirait assoira assoirons assoirez assoiront assoirais
assoirions assoiriez assoraient assoie assoies assisse assisses assît assissions
assissiez assissent assis asseyant |
cueillir cueille cueilles cueillons cueillez cueillent cueillis cueillit
cueillîmes cueillîtes cueillirent cueillais cueillait cueillions cueilliez
cueillaient cueillerai cueilleras cueillera cueillerons cueillerez cueilleront
cueillerais cueillerait cueillerions cueilleriez cueilleraient cueillisse
cueillisses cueillît cueillissions cueillissiez cueillissent cueilli cueillant |
acquérir acquiers acquiert acquérons acquérez acquièrent acquis acquit acquîmes
acquîtes acquirent acquérais acquérait acquérions acquériez acquéraient
acquerrai acquerras acquerra acquerrons acquerrez acquerront acquerrais
acquerrait acquerrions acquerriez acquerraient acquière acquières acquisse
acquisses acquît acquissions acquissiez acquissent acquis acquérant
`;

// Plurals that no rule can derive.
const IRREGULAR_PLURAL = {
    // -aux plurals whose singular does not end in -al.
    mentaux: 'mental', sentimentaux: 'sentimental', fondamentaux: 'fondamental',
    yeux: 'oeil', cieux: 'ciel', travaux: 'travail', coraux: 'corail',
    émaux: 'émail', éventaux: 'éventail', vitraux: 'vitrail', baux: 'bail',
    noyaux: 'noyau', joyaux: 'joyau', tuyaux: 'tuyau', sarraux: 'sarrau',
    beaux: 'beau', nouveaux: 'nouveau'
};

// Singulars ending in -s whose remainder is another word (fils ≠ fil).
const NOT_A_PLURAL = wordSet('fils gens cours');

/** Plural → singular, or null when no rule applies. */
function plural(form) {
    const hit = IRREGULAR_PLURAL[form];
    if (hit) return hit;
    const n = form.length;
    if (n < 4) return null;
    if (form.endsWith('eaux')) return form.slice(0, -4) + 'eau'; // châteaux → château
    if (form.endsWith('entaux')) return form.slice(0, -5) + 'ental'; // sentimentaux → sentimental
    if (form.endsWith('aux')) return form.slice(0, -3) + 'al'; // chevaux → cheval
    if (form.endsWith('eux')) return form.slice(0, -1); // lieux → lieu
    if (form.endsWith('oux')) return form.slice(0, -1); // genoux → genou
    if (NOT_A_PLURAL.has(form)) return null;
    // The rest of the language: a silent -s (chats → chat). Words that are
    // invariant (bras, temps) fold to a key of their own, consistently.
    if (form.endsWith('s') || form.endsWith('x')) return form.slice(0, -1);
    return null;
}

// Feminine → masculine. Explicit pairs first, then suffix families whose
// feminine is never an unrelated word, each with its known exceptions.
const GENDER_PAIRS = pairMap(
    `petit petite | mauvais mauvaise | gentil gentille | fort forte | chaud chaude
     froid froide | frais fraîche | gros grosse | bas basse | sûr sûre | vrai vraie
     seul seule | clair claire | sec sèche | blanc blanche | franc franche
     faux fausse | roux rousse | neuf neuve | veuf veuve | bref brève
     jaloux jalouse | espagnol espagnole | français française | anglais anglaise
     japonais japonaise | chinois chinoise | inquiet inquiète | complet complète
     secret secrète | discret discrète | concret concrète | prêt prête | mort morte
     court courte | droit droite | étroit étroite | brut brute | ouvert ouverte
     couvert couverte | favori favorite | sot sotte | fou folle | mou molle
     paysan paysanne | bon bonne | mignon mignonne | baron baronne | patron patronne
     beau bel belle | nouveau nouvel nouvelle | vieux vieil vieille`,
    singularOf
);

// Feminine words whose remainder is an unrelated word: never folded, by
// any rule below (graine ≠ grain, chante ≠ chant, machine ≠ machin, and the
// verbs whose stem would land on a noun: appelle ≠ appel, vente ≠ vent).
const GENDER_GUARD = wordSet(`
graine machine médecine colonne chante manière glande suive mousse issue moue
sue tue due mère appelle rappelle vente étale avale motive
`);

// [feminine ending, masculine ending]
const GENDER_RULES = [
    ['euse', 'eu'], // curieuse → curieux, heureuse → heureux
    ['ienne', 'ien'], // ancienne → ancien
    ['enne', 'en'], // européenne → européen, citoyenne → citoyen
    ['aine', 'ain'], // humaine → humain, prochaine → prochain
    ['ine', 'in'], // voisine → voisin, marine → marin
    ['ante', 'ant'], // charmante → charmant
    ['ente', 'ent'], // présente → présent
    ['elle', 'el'], // naturelle → naturel, réelle → réel
    ['ale', 'al'], // morale → moral, locale → local
    ['ette', 'et'], // nette → net, muette → muet
    ['ère', 'er'], // légère → léger, première → premier
    ['oire', 'oir'], // noire → noir
    ['aute', 'aut'], // haute → haut
    ['ande', 'and'], // grande → grand
    ['onde', 'ond'], // profonde → profond
    ['ongue', 'ong'], // longue → long
    ['ive', 'if'], // vive → vif, active → actif
    ['trice', 'teur'], // actrice → acteur
    ['einte', 'eint'], // éteinte → éteint, atteinte → atteint
    ['ainte', 'aint'], // sainte → saint
    ['aite', 'ait'], // parfaite → parfait
    ['ouce', 'ou'], // douce → doux
    ['ée', 'é'], // fermée → fermé
    ['ie', 'i'], // jolie → joli, amie → ami
    ['ue', 'u'] // venue → venu, connue → connu
];

function singularOf(form) {
    return IRREGULAR_PLURAL[form] ?? plural(form) ?? form;
}

function genderRule(form) {
    if (GENDER_GUARD.has(form)) return null;
    for (const [suffix, to] of GENDER_RULES) {
        if (form.endsWith(suffix)) return form.slice(0, -suffix.length) + to;
    }
    return null;
}

function fold(form) {
    const singular = singularOf(form);
    const pair = GENDER_PAIRS.get(singular);
    if (pair) return pair === form ? null : pair;
    const ruled = genderRule(singular);
    if (ruled) return ruled === form ? null : ruled;
    return singular === form ? null : singular;
}

const config = {
    code: 'fr',
    minWordLength: 4,
    // An apostrophe is always a boundary: elisions and compounds alike.
    apostrophe: 'split',
    // Applied to the lowercased form (it may change length; offsets are
    // always taken on the surface text, never on the folded form).
    foldChars: { œ: 'oe', æ: 'ae' },
    functionSet: new Set([...words(FUNCTION_WORDS), ...words(AUXILIARY_FORMS)]),
    verbs: 'strict',
    verbFamilyMap: familyMap(VERB_FAMILIES),
    fold,
    tiers: [0.15, 0.35, 0.6, 0.85]
};

export default config;
