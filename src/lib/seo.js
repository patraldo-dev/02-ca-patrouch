import { get } from 'svelte/store';
import { t, locale } from '$lib/i18n';

const descriptions = {
    'en': {
        '/': 'Patrouch — A space for writing. Get daily creative sparks, write in any language, and share your voice with a community of writers.',
        '/agora': 'Browse writings from the Patrouch community. Discover new voices, read published works, and find inspiration.',
        '/write': 'Your daily writing space. Accept today\'s creative spark, write freely, and track your writing streaks.',
        '/login': 'Sign in to your Patrouch account.',
        '/signup': 'Join Patrouch — a writing community for creative minds. Get daily prompts and start writing today.',
    },
    'es': {
        '/': 'Patrouch — Un espacio de escritura. Recibe chispas creativas diarias, escribe en cualquier idioma y comparte tu voz con una comunidad de escritores.',
        '/agora': 'Explora escritos de la comunidad Patrouch. Descubre nuevas voces, lee obras publicadas y encuentra inspiración.',
        '/write': 'Tu espacio diario de escritura. Acepta la chispa creativa de hoy, escribe libremente y lleva tu racha.',
        '/login': 'Inicia sesión en tu cuenta de Patrouch.',
        '/signup': 'Únete a Patrouch — una comunidad de escritura para mentes creativas. Recibe estímulos diarios y empieza a escribir hoy.',
    },
    'fr': {
        '/': 'Patrouch — Un espace d\'écriture. Recevez des étincelles créatives quotidiennes, écrivez dans n\'importe quelle langue et partagez votre voix.',
        '/agora': 'Parcourez les écrits de la communauté Patrouch. Découvrez de nouvelles voix et trouvez l\'inspiration.',
        '/write': 'Votre espace d\'écriture quotidien. Acceptez l\'étincelle du jour, écrivez librement et suivez votre progression.',
        '/login': 'Connectez-vous à votre compte Patrouch.',
        '/signup': 'Rejoignez Patrouch — une communauté d\'écriture pour esprits créatifs. Recevez des prompts quotidiens et commencez à écrire.',
    }
};

export function getSeoMeta(pathname, lang) {
    const localeDescriptions = descriptions[lang] || descriptions['en'];
    const desc = localeDescriptions[pathname] || localeDescriptions['/'];
    const title = 'Patrouch.ca — A Playful Space for Serious Writing';
    const ogImage = 'https://patrouch.ca/og-image.png';

    return {
        title,
        description: desc,
        ogTitle: title,
        ogDescription: desc,
        ogImage,
        ogUrl: `https://patrouch.ca${pathname}`,
        ogType: 'website',
        ogLocale: lang === 'es' ? 'es_MX' : lang === 'fr' ? 'fr_FR' : 'en_US',
        canonical: `https://patrouch.ca${pathname}`,
    };
}
