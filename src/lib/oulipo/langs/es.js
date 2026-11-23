// Spanish — one of three equal language configs (contract: ../engine.js).
//
// Accents and ñ are meaningful and never stripped (año ≠ ano, año ≠ anó).
import { familyMap, pairMap, wordSet, words } from './_shared.js';

const FUNCTION_WORDS = `
el la los las un una unos unas lo
este esta estos estas esto ese esa esos esas esto aquel aquella aquellos
aquellas aquello éste ésta éstos éstas ése ésa ésos ésas
mi mis tu tus su sus nuestro nuestra nuestros nuestras vuestro vuestra
vuestros vuestras mío mía míos mías tuyo tuya tuyos tuyas suyo suya suyos suyas
yo me mí conmigo tú te ti contigo él ella ello ellos le lo la se nos os
nosotros vosotros vosotras vos usted ustedes ud uds les sí consigo
a ante bajo con contra de desde durante en entre hacia hasta mediante para
por según sin sobre tras del al
y e o u pero sino ni que si como cuando mientras porque pues aunque así
quien quienes quién cuál cuál cuales cuyo cuya cuyos cuyas dónde adonde
cuándo cómo cuánto cuánta cuántos cuántas qué tal
algo alguien alguno alguna algunos algunas nada nadie ninguno ninguna
todo toda todos todas cada otro otra otros otras mismo misma mismos mismas
varios varias mucho mucha muchos muchas poco poca pocos pocas más menos
tanto tanta tantos tantas ambos ambas cualquier cualesquiera quienquiera mas
demasiado
no sí muy ya también tan así entonces aquí allí ahí ahora después antes
siempre nunca jamás apenas aún todavía casi luego bien mal
dentro fuera arriba abajo atrás delante detrás alrededor
cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece
catorce quince dieciséis diecisiete dieciocho diecinueve veinte treinta
cuarenta cincuenta sesenta setenta ochenta noventa cien ciento mil millón
millones
`;

// Every form of the core auxiliaries/copulas plus the two modals. Without
// them nothing can be said: they never count as words.
const AUXILIARY_FORMS = `
haber he has ha hay hemos habéis han hube hubiste hubo hubimos hubisteis
hubieron había habías habíamos habíais habían habré habrás habrá habremos
habréis habrán habría habrías habría habríamos habríais habrían haya hayas
hayamos hayáis hayan hubiera hubieras hubiéramos hubierais hubieran hubiese
hubieses hubiésemos hubieseis hubiesen habido habiendo
ser soy eres es somos sois son fui fuiste fue fuimos fuisteis fueron era
eras éramos erais eran seré serás será seremos seréis serán sería serías
seríamos seríais serían sea seas seamos seáis sean fuera fueras fuéramos
fuerais fueran fuese fueses fuésemos fueseis fuesen sido siendo
estar estoy estás está estamos estáis están estuve estuviste estuvo
estuvimos estuvisteis estuvieron estaba estabas estábamos estabais estaban
estaré estarás estará estaremos estaréis estarán estaría estarías estaríamos
estaríais estarían esté estés estemos estéis estén estuviera estuvieras
estuviéramos estuvierais estuvieran estuviese estuvieses estuviésemos
estuvieseis estuviesen estado estando
tener tengo tienes tiene tenemos tenéis tienen tuve tuviste tuvo tuvimos
tuvisteis tuvieron tenía tenías teníamos teníais tenían tendré tendrás
tendrá tendremos tendréis tendrán tendría tendrías tendríamos tendríais
tendrían tenga tengas tengamos tengáis tengan tuviera tuvieras tuviéramos
tuvierais tuvieran tuviese tuvieses tuviésemos tuvieseis tuviesen tenido
teniendo
hacer hago haces hace hacemos hacéis hacen hice hiciste hizo hicimos
hicisteis hicieron hacía hacías hacíamos hacíais hacían haré harás hará
haremos haréis harán haría harías haríamos haríais harían haga hagas hagamos
hagáis hagan hiciera hicieras hiciéramos hicierais hicieran hiciese hicieses
hiciésemos hicieseis hiciesen hecho hecha hechos hechas haciendo
poder puedo puedes puede podemos podéis pueden pude pudiste pudo pudimos
pudisteis pudieron podía podías podíamos podíais podían podré podrás podrá
podremos podréis podrán podría podrías podríamos podríais podrían pueda
puedas podamos podáis puedan pudiera pudieras pudiéramos pudierais pudieran
pudiese pudieses pudiésemos pudieseis pudiesen podido pudiendo
deber debo debes debe debemos debéis deben debí debiste debió debimos
debisteis debieron debía debías debíamos debíais debían deberé deberás
deberá deberemos deberéis deberán debería deberías deberíamos deberíais
deberían deba debas debamos debáis deban debiera debieras debiéramos
debierais debieran debiese debieses debiésemos debieseis debiesen debido
debiendo
`;

// Verb families for the optional 'families' policy: the irregular and
// stem-changing verbs. Regular verbs stay form-exact at every level.
const VERB_FAMILIES = `
ir voy vas va vamos vais van fui fuiste fue fuimos fuisteis fueron iba ibas iba
íbamos ibais iban iré irás irá iremos iréis irán iría irías iría iríamos iríais
irían vaya vayas vaya vayamos vayáis vayan fuera fueras fuera fuéramos fuerais
fueran fuese fueses fuese fuésemos fueseis fuesen ido yendo |
decir digo dices dice decimos decís dicen dije dijiste dijo dijimos dijisteis
dijeron decía decías decíamos decíais decían diré dirás dirá diremos diréis
dirán diría dirías diríamos diríais dirían diga digas digamos digáis digan
dijera dijeras dijéramos dijerais dijeran dijese dijeses dijésemos dijeseis
dijesen dicho diciendo |
venir vengo vienes viene venimos venís vienen vine viniste vino vinimos
vinisteis vinieron venía venías veníamos veníais venían vendré vendrás vendrá
vendremos vendréis vendrán vendría vendrías vendríamos vendríais vendrían venga
vengas vengamos vengáis vengan viniera vinieras viniéramos vinierais vinieran
viniese vinieses viniésemos vinieseis viniesen venido viniendo |
ver veo ves ve vemos veis ven vi viste vio vimos visteis vieron veía veías
veíamos veíais veían veré verás verá veremos veréis verán vería verías veríamos
veríais verían vea veas veamos veáis vean viera vieras viéramos vierais vieran
viese vieses viésemos vieseis viesen visto viendo |
dar doy das da damos dais dan di diste dio dimos disteis dieron daba dabas
dábamos dabais daban daré darás dará daremos daréis darán daría darías daríamos
daríais darían dé demos deis den diera dieras diéramos dierais dieran diese
dieses diésemos dieseis diesen dado dando |
poner pongo pones pone ponemos ponéis ponen puse pusiste puso pusimos pusisteis
pusieron ponía ponías poníamos poníais ponían pondré pondrás pondrá pondremos
pondréis pondrán pondría pondrías pondríamos pondríais pondrían ponga pongas
pongamos pongáis pongan pusiera pusieras pusiéramos pusierais pusieran pusiese
pusieses pusiésemos pusieseis pusiesen puesto poniendo |
salir salgo sales sale salimos salís salen salí saliste salió salimos salisteis
salieron salía salías salíamos salíais salían saldré saldrás saldrá saldremos
saldréis saldrán saldría saldrías saldríamos saldríais saldrían salga salgas
salgamos salgáis salgan saliera salieras saliéramos salierais salieran saliese
salieses saliésemos salieseis saliesen salido saliendo |
oír oigo oyes oye oímos oís oyen oí oíste oyó oímos oísteis oyeron oía oías
oíamos oíais oían oiré oirás oirá oiremos oiréis oirán oiría oirías oiría
oiríamos oiríais oirían oiga oigas oigamos oigáis oigan oyera oyeras oyéramos
oyerais oyeran oyese oyeses oyésemos oyeseis oyesen oído oyendo |
traer traigo traes trae traemos traéis traen traje trajiste trajo trajimos
trajisteis trajeron traía traías traíamos traíais traían traeré traerás traerá
traeremos traeréis traerán traería traerías traería traeríamos traeríais
traerían traiga traigas traigamos traigáis traigan trajera trajeras trajéramos
trajerais trajeran trajese trajeses trajésemos trajeseis trajesen traído
trayendo |
querer quiero quieres quiere queremos queréis quieren quise quisiste quiso
quisimos quisisteis quisieron quería querías queríamos queríais querían querré
querrás querrá querremos querréis querrán querría querrías querría querríamos
querríais querrían quiera quieras queramos queráis quieran quisiera quisieras
quisiéramos quisierais quisieran quisiese quisieses quisiésemos quisieseis
quisiesen querido queriendo |
saber sé sabes sabe sabemos sabéis saben supe supiste supo supimos supisteis
supieron sabía sabías sabíamos sabíais sabían sabré sabrás sabrá sabremos
sabréis sabrán sabría sabrías sabría sabríamos sabríais sabrían sepa sepas
sepamos sepáis sepan supiera supieras supiéramos supierais supieran supiese
supieses supiésemos supieseis supiesen sabido sabiendo |
volver vuelvo vuelves vuelve volvemos volvéis vuelven volví volviste volvió
volvimos volvisteis volvieron volvía volvías volvíamos volvíais volvían volveré
volverás volverá volveremos volveréis volverán volvería volverías volvería
volveríamos volveríais volverían vuelva vuelvas volvamos volváis vuelvan
volviera volvieras volviéramos volvierais volvieran volviese volvieses
volviésemos volvieseis volviesen vuelto volviendo |
pensar pienso piensas piensa pensamos pensáis piensan pensé pensaste pensó
pensamos pensasteis pensaron pensaba pensabas pensábamos pensabais pensaban
pensaré pensarás pensará pensaremos pensaréis pensarán pensaría pensarías
pensaría pensaríamos pensaríais pensarían piense pienses pensemos penséis
piensen pensara pensaras pensáramos pensarais pensaran pensase pensases
pensásemos pensaseis pensasen pensado pensando |
sentir siento sientes siente sentimos sentís sienten sentí sentiste sintió
sentimos sentisteis sintieron sentía sentías sentíamos sentíais sentían sentiré
sentirás sentirá sentiremos sentiréis sentirán sentiría sentirías sentiría
sentiríamos sentiríais sentirían sienta sientas sintamos sintáis sientan
sintiera sintieras sintiéramos sintierais sintieran sintiese sintieses
sintiésemos sintieseis sintiesen sentido sintiendo |
dormir duermo duermes duerme dormimos dormís duermen dormí dormiste durmió
dormimos dormisteis durmieron dormía dormías dormíamos dormíais dormían dormiré
dormirás dormirá dormiremos dormiréis dormirán dormiría dormirías dormiría
dormiríamos dormiríais dormirían duerma duermas durmamos durmáis duerman
durmiera durmieras durmiéramos durmierais durmieran durmiese durmieses
durmiésemos durmieseis durmiesen dormido durmiendo |
morir muero mueres muere morimos morís mueren morí moriste murió morimos
moristeis murieron moría morías moríamos moríais morían moriré morirás morirá
moriremos moriréis morirán moriría morirías moriría moriríamos moriríais
morirían muera mueras muramos muráis mueran muriera murieras muriéramos
murierais murieran muriese murieses muriésemos murieseis muriesen muerto
muriendo |
pedir pido pides pide pedimos pedís piden pedí pediste pidió pedimos pedisteis
pidieron pedía pedías pedíamos pedíais pedían pediré pedirás pedirá pediremos
pediréis pedirán pediría pedirías pediría pediríamos pediríais pedirían pida
pidas pidamos pidáis pidan pidiera pidieras pidiéramos pidierais pidieran
pidiese pidieses pidiésemos pidieseis pidiesen pedido pidiendo |
seguir sigo sigues sigue seguimos seguís siguen seguí seguiste siguió seguimos
seguisteis siguieron seguía seguías seguíamos seguíais seguían seguiré seguirás
seguirá seguiremos seguiréis seguirán seguiría seguirías seguiría seguiríamos
seguiríais seguirían siga sigas sigamos sigáis sigan siguiera siguieras
siguiéramos siguierais siguieran siguiese siguieses siguiésemos siguieseis
siguiesen seguido siguiendo |
conocer conozco conoces conoce conocemos conocéis conocen conocí conociste
conoció conocimos conocisteis conocieron conocía conocías conocíamos conocíais
conocían conoceré conocerás conocerá conoceremos conoceréis conocerán conocería
conocerías conocería conoceríamos conoceríais conocerían conozca conozcas
conozcamos conozcáis conozcan conociera conocieras conociéramos conocierais
conocieran conociese conocieses conociésemos conocieseis conociesen conocido
conociendo |
encontrar encuentro encuentras encuentra encontramos encontráis encuentran
encontré encontraste encontró encontramos encontrasteis encontraron encontraba
encontrabas encontrábamos encontrabais encontraban encontraré encontrarás
encontrará encontraremos encontraréis encontrarán encontraría encontrarías
encontraría encontraríamos encontraríais encontrarían encuentre encuentres
encontremos encontréis encuentren encontrara encontraras encontráramos
encontrarais encontraran encontrase encontrases encontrásemos encontraseis
encontrasen encontrado encontrando |
contar cuento cuentas cuenta contamos contáis cuentan conté contaste contó
contamos contasteis contaron contaba contabas contábamos contabais contaban
contaré contarás contará contaremos contaréis contarán contaría contarías
contaría contaríamos contaríais contarían cuente cuentes contemos contéis
cuenten contara contaras contáramos contarais contaran contase contases
contásemos contaseis contasen contado contando |
jugar juego juegas juega jugamos jugáis juegan jugué jugaste jugó jugamos
jugasteis jugaron jugaba jugabas jugábamos jugabais jugaban jugaré jugarás
jugará jugaremos jugaréis jugarán jugaría jugarías jugaría jugaríamos jugaríais
jugarían juegue juegues jueguemos juguéis jueguen jugara jugaras jugáramos
jugarais jugaran jugase jugases jugásemos jugaseis jugasen jugado jugando
`;

/** Plural → singular, or null when no rule applies. */
function plural(form) {
    const n = form.length;
    if (n < 4) return null;
    // Families whose plural adds -es to a consonant: luces → luz,
    // canciones → canción, flores → flor, árboles → árbol, verdades → verdad.
    if (form.endsWith('ces')) return form.slice(0, -3) + 'z';
    if (form.endsWith('iones')) return form.slice(0, -5) + 'ión';
    if (form.endsWith('ones')) return form.slice(0, -4) + 'ón';
    // papeles → papel, hoteles → hotel; calles and probables keep their -e.
    if (form.endsWith('eles') && !form.endsWith('lles') && !form.endsWith('bles')) {
        return form.slice(0, -4) + 'el';
    }
    for (const [pluralEnd, singularEnd] of ES_FAMILIES) {
        if (form.endsWith(pluralEnd)) return form.slice(0, -4) + singularEnd;
    }
    // The rest of the language: plural -s on a final vowel (casas → casa).
    if (/[aeiouáéíóúü]s$/.test(form)) return form.slice(0, -1);
    return null;
}

const ES_FAMILIES = [
    ['ares', 'ar'], // mares → mar, lugares → lugar
    ['ores', 'or'], // flores → flor, dolores → dolor, mejores → mejor
    ['anes', 'an'], // panes → pan, planes → plan
    ['ales', 'al'], // canales → canal, totales → total
    ['iles', 'il'], // fáciles → fácil, perfiles → perfil
    ['oles', 'ol'], // árboles → árbol, caracoles → caracol
    ['ules', 'ul'], // azules → azul
    ['edes', 'ed'], // paredes → pared
    ['ades', 'ad'], // verdades → verdad, soledades → soledad
    ['udes', 'ud'], // virtudes → virtud
    ['eres', 'er'] // mujeres → mujer
];

// Feminine → masculine. Explicit pairs first, then suffix families.
const GENDER_PAIRS = pairMap(
    `bueno buena | malo mala | pequeño pequeña | alto alta | bajo baja | largo larga
     corto corta | nuevo nueva | viejo vieja | solo sola | primero primera
     último última | tercero tercera | lindo linda | bonito bonita | negro negra
     blanco blanca | antiguo antigua | continuo continua | rubio rubia | tonto tonta
     listo lista | ficticio ficticia | limpio limpia | sucio sucia | vacío vacía | hondo honda
     frío fría | tibio tibia | fresco fresca | tierno tierna | maduro madura | crudo cruda
     blando blanda | duro dura | flaco flaca | gordo gorda | delgado delgada | esbelto esbelta
     guapo guapa | mono mona | diestro diestra | sabio sabia | necio necia | muerto muerta
     abierto abierta | escrito escrita | despierto despierta | suelto suelta | frito frita
     roto rota | puesto puesta | desnudo desnuda | calvo calva | manco manca | tuerto tuerta
     mudo muda | sordo sorda | zurdo zurda | viudo viuda | santo santa | vecino vecina
     chino china | español española | alemán alemana | ruso rusa | polaco polaca
     japonés japonesa | francés francesa | inglés inglesa | portugués portuguesa
     andaluz andaluza`,
    (form) => plural(form) ?? form
);

// Feminine words whose remainder is an unrelated word: never folded, by
// any rule below. The first block would merge two real words (cosa ≠ coso,
// hermana ≠ hermano, reina ≠ reino, flora ≠ flor); the second only keeps
// frequent nouns on a key of their own instead of a made-up one.
const GENDER_GUARD = wordSet(`
oliva cosa música política crítica física pica mosca abaja pecha cacha polla
caballa cuchilla rodilla mejilla barra hora señora mejora hermana manzana crea
marea talla porra chorra flora reina grana deseja
vida hoja fecha tierra guerra sierra garra aurora maría ventana campana lana
rana semana diana pena cadena arena vena escena antena melena idea línea azotea
`);

// [feminine ending, masculine ending]
const GENDER_RULES = [
    ['ada', 'ado'], // cansada → cansado
    ['ida', 'ido'], // perdida → perdido
    ['iva', 'ivo'], // viva → vivo
    ['osa', 'oso'], // hermosa → hermoso
    ['ica', 'ico'], // única → único
    ['iga', 'igo'], // amiga → amigo
    ['ega', 'ego'], // ciega → ciego
    ['gue', 'go'], // sigue → sigo
    ['aja', 'ajo'], // trabaja → trabajo
    ['eja', 'ejo'], // deja → dejo
    ['ija', 'ijo'], // hija → hijo
    ['iña', 'iño'], // niña → niño
    ['oja', 'ojo'], // roja → rojo
    ['eña', 'eño'], // pequeña → pequeño, sueña → sueño
    ['cha', 'cho'], // derecha → derecho
    ['lla', 'llo'], // bella → bello
    ['rra', 'rro'], // perra → perro
    ['ora', 'or'], // soñadora → soñador
    ['aria', 'ario'], // necesaria → necesario
    ['ana', 'ano'], // humana → humano
    ['ena', 'eno'], // buena → bueno
    ['ea', 'eo'] // fea → feo
];

function genderRule(form) {
    if (GENDER_GUARD.has(form)) return null;
    for (const [suffix, to] of GENDER_RULES) {
        if (form.endsWith(suffix)) return form.slice(0, -suffix.length) + to;
    }
    return null;
}

const singularOf = (form) => plural(form) ?? form;

function fold(form) {
    const singular = singularOf(form);
    const pair = GENDER_PAIRS.get(singular);
    if (pair) return pair === form ? null : pair;
    const ruled = genderRule(singular);
    if (ruled) return ruled === form ? null : ruled;
    return singular === form ? null : singular;
}

const config = {
    code: 'es',
    minWordLength: 4,
    // An apostrophe is a boundary on both sides (l', d', qu'): rare in
    // modern Spanish, and never a silent ending the way it is in English.
    apostrophe: 'split',
    foldChars: null,
    functionSet: new Set([...words(FUNCTION_WORDS), ...words(AUXILIARY_FORMS)]),
    verbs: 'strict',
    verbFamilyMap: familyMap(VERB_FAMILIES),
    fold,
    tiers: [0.15, 0.35, 0.6, 0.85]
};

export default config;
