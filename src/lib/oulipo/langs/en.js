// English — one of three equal language configs (contract: ../engine.js).
//
// Function words never count: articles, determiners, pronouns, prepositions,
// conjunctions, modals, every form of be / have / do, the closed set of
// high-frequency adverbs, question words, negatives and cardinal numbers.
import { familyMap, wordSet } from './_shared.js';

const FUNCTION_WORDS = `
a an the this that these those some any no every each either neither both all
several enough much many more most few fewer fewest less least other another
others such own same what whatever which whichever whose
i me my mine myself we us our ours ourselves you your yours yourself
yourselves he him his himself she her hers herself it its itself they them
their theirs themselves one oneself someone somebody something anyone anybody
anything everyone everybody everything nobody nothing whoever whomever whom
how when where why
of in to for with on at by from up down out off over under about across after
against along among around before behind below beneath beside besides between
beyond despite during except inside into onto outside since through
throughout till until toward towards underneath unlike upon via within without
aboard above per than as
and or but nor so yet for if because although though while whereas when
whenever where wherever unless since as than that whether lest albeit
not no nor never none nothing nobody
be am is are was were been being have has had having do does did done doing
will would shall should can could may might must ought
don doesn didn isn aren wasn weren hasn haven hadn couldn shouldn wouldn
mustn mightn needn oughtn daren shan ain
again almost already also always even ever here just never now only quite
rather so still then there thus too very well yet hardly scarcely barely ago
once twice yes
zero one two three four five six seven eight nine ten eleven twelve thirteen
fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty
fifty sixty seventy eighty ninety hundred thousand million billion
`;

// Verb families for the optional 'families' policy: the irregular verbs.
// Regular verbs (walk / walked / walking) stay form-exact at every level.
const VERB_FAMILIES = `
go goes going went gone | say says saying said | get gets getting got gotten |
make makes making made | know knows knowing knew known |
think thinks thinking thought | take takes taking took taken |
see sees seeing saw seen | come comes coming came | find finds finding found |
give gives giving gave given | tell tells telling told | feel feels feeling felt |
become becomes becoming became | leave leaves leaving left | put puts putting |
mean means meaning meant | keep keeps keeping kept | let lets letting |
begin begins beginning began begun | show shows showing showed shown |
hear hears hearing heard | run runs running ran | hold holds holding held |
bring brings bringing brought | write writes writing wrote written |
sit sits sitting sat | stand stands standing stood | lose loses losing lost |
pay pays paying paid | meet meets meeting met | set sets setting |
lead leads leading led | understand understands understanding understood |
speak speaks speaking spoke spoken | read reads reading |
spend spends spending spent | grow grows growing grew grown |
win wins winning won | buy buys buying bought | send sends sending sent |
build builds building built | fall falls falling fell fallen | cut cuts cutting |
eat eats eating ate eaten | teach teaches teaching taught |
drive drives driving drove driven | drink drinks drinking drank drunk |
sleep sleeps sleeping slept | wear wears wearing wore worn |
choose chooses choosing chose chosen | fly flies flying flew flown |
sing sings singing sang sung | rise rises rising rose risen |
catch catches catching caught | draw draws drawing drew drawn |
throw throws throwing threw thrown | hide hides hiding hid hidden |
ride rides riding rode ridden | wake wakes waking woke woken |
lie lies lying lay lain lays laying laid | blow blows blowing blew blown |
dig digs digging dug | hang hangs hanging hung | swing swings swinging swung |
shoot shoots shooting shot | light lights lighting lit | feed feeds feeding fed |
fight fights fighting fought | shake shakes shaking shook shaken |
bite bites biting bit bitten | bend bends bending bent | break breaks breaking broke broken | lend lends lending lent |
deal deals dealing dealt | dream dreams dreaming dreamed dreamt |
lean leans leaning leaned leant | sweep sweeps sweeping swept |
weep weeps weeping wept | creep creeps creeping crept |
slide slides sliding slid | freeze freezes freezing froze frozen |
steal steals stealing stole stolen | tear tears tearing tore torn |
swear swears swearing sworn | forget forgets forgetting forgot forgotten |
forgive forgives forgiving forgave forgiven | beat beats beating beaten |
wind winds winding wound | shine shines shining shone |
stick sticks sticking stuck | sting stings stinging stung |
spin spins spinning spun | strike strikes striking struck |
seek seeks seeking sought | sell sells selling sold |
spell spells spelling spelled spelt | smell smells smelling smelled smelt |
flee flees fleeing fled | kneel kneels kneeling knelt |
burn burns burning burned burnt | shut shuts shutting | spread spreads spreading |
hit hits hitting | cost costs costing | hurt hurts hurting |
burst bursts bursting | split splits splitting | quit quits quitting |
cast casts casting | bet bets betting | shed sheds shedding |
bleed bleeds bleeding bled | breed breeds breeding bred |
cling clings clinging clung | fling flings flinging flung |
string strings stringing strung | wring wrings wringing wrung |
spring springs springing sprang sprung | shrink shrinks shrinking shrank shrunk |
sink sinks sinking sank sunk | ring rings ringing rang rung |
swim swims swimming swam swum | dwell dwells dwelling dwelt |
spill spills spilling spilled spilt | spoil spoils spoiling spoiled spoilt |
learn learns learning learned learnt | leap leaps leaping leapt |
overcome overcomes overcoming overcame |
undertake undertakes undertaking undertook |
withdraw withdraws withdrawing withdrew withdrawn |
forbid forbids forbidding forbade forbidden |
mistake mistakes mistaking mistook mistaken
`;

// Words ending in -s that are not plurals; folding them would land on
// another word (news → new, means → mean).
const NOT_A_PLURAL = wordSet('news means series species lens chaos atlas canvas');

// -oes and -ches plurals that only add an -s (canoe → canoes, niche → niches).
const OES_KEEP_E = wordSet('canoes shoes hoes toes foes woes oboes aloes roes floes throes');
const CHES_KEEP_E = wordSet('niches caches avalanches mustaches headaches cliches quiches brioches');
// -ies words that are a word ending in -ie plus s (die → dies).
const IES_KEEP_E = wordSet('dies lies ties pies vies');
// -zzes plurals of stems in a single z (fez → fezzes, whiz → whizzes).
const Z_KEEP_Z = wordSet('quizzes fezzes whizzes');

/** Plural → singular, or null when no rule applies. */
function plural(form) {
    if (NOT_A_PLURAL.has(form)) return null;
    if (/(ss|us|is)$/.test(form)) return null;
    if (/ies$/.test(form)) return IES_KEEP_E.has(form) ? form.slice(0, -1) : form.slice(0, -3) + 'y';
    // buzz → buzzes drops -es; the few stems in a single z drop -zes.
    if (/zzes$/.test(form)) return Z_KEEP_Z.has(form) ? form.slice(0, -3) : form.slice(0, -2);
    if (/(ches|shes|sses|xes)$/.test(form)) {
        if (CHES_KEEP_E.has(form)) return form.slice(0, -1);
        return form.slice(0, -2);
    }
    if (/oes$/.test(form)) return OES_KEEP_E.has(form) ? form.slice(0, -1) : form.slice(0, -2);
    // waves → wave, leaves → leave. The irregular -f plurals keep their own key.
    if (/ves$/.test(form)) return form.slice(0, -1);
    if (/s$/.test(form)) return form.slice(0, -1);
    return null;
}

const config = {
    code: 'en',
    minWordLength: 4,
    // n't marks the word before it as a function word; every other
    // apostrophe suffix ('s 're 've 'll 'm 'd) is dropped on its own.
    apostrophe: 'english',
    foldChars: null,
    functionSet: wordSet(FUNCTION_WORDS),
    verbs: 'strict',
    verbFamilyMap: familyMap(VERB_FAMILIES),
    // English has no grammatical gender: only the plural rule folds.
    fold: (form) => plural(form),
    tiers: [0.15, 0.35, 0.6, 0.85]
};

export default config;
