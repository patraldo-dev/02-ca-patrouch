import { get } from 'svelte/store';
import { t, locale } from '$lib/i18n';

const descriptions = {
    'en': {
        '/': 'patrouch.ca — A Playful Space for Serious Writing. Get daily creative sparks, write in any language, and share your voice with a community of writers.',
        '/agora': 'Browse writings from the Patrouch community. Discover new voices, read published works, and find inspiration.',
        '/write': 'Your daily writing space. Accept today\'s creative spark, write freely, and track your streak.',
        '/login': 'Sign in to your Patrouch account.',
        '/signup': 'Join patrouch.ca — a playful space for serious writing. Get daily sparks and start writing today.',
    },
    'es': {
        '/': 'patrouch.ca — Un Espacio Lúdico para Escritura Seria. Recibe chispas creativas diarias, escribe en cualquier idioma y comparte tu voz con una comunidad de escritores.',
        '/agora': 'Explora escritos de la comunidad Patrouch. Descubre nuevas voces, lee obras publicadas y encuentra inspiración.',
        '/write': 'Tu espacio diario de escritura. Acepta la chispa creativa de hoy, escribe libremente y lleva tu racha.',
        '/login': 'Inicia sesión en tu cuenta de Patrouch.',
        '/signup': 'Únete a patrouch.ca — un espacio lúdico para escritura seria. Recibe chispas diarias y empieza a escribir hoy.',
    },
    'fr': {
        '/': 'patrouch.ca — Un Espace Ludique pour l\'Écriture Sérieuse. Recevez des étincelles créatives quotidiennes, écrivez dans n\'importe quelle langue et partagez votre voix.',
        '/agora': 'Parcourez les écrits de la communauté Patrouch. Découvrez de nouvelles voix et trouvez l\'inspiration.',
        '/write': 'Votre espace d\'écriture quotidien. Acceptez l\'étincelle du jour, écrivez librement et suivez votre progression.',
        '/login': 'Connectez-vous à votre compte Patrouch.',
        '/signup': 'Rejoignez patrouch.ca — un espace ludique pour l\'écriture sérieuse. Recevez des étincelles quotidiennes et commencez à écrire.',
    }
};

const titles = {
    'en': "patrouch.ca — A Playful Space for Serious Writing",
    'es': 'patrouch.ca — Un Espacio Lúdico para Escritura Seria',
    'fr': "patrouch.ca — Un Espace Ludique pour l'Écriture Sérieuse",
};

export function getSeoMeta(pathname, lang) {
    const localeDescriptions = descriptions[lang] || descriptions['en'];
    const desc = localeDescriptions[pathname] || localeDescriptions['/'];
    const title = titles[lang] || titles['en'];
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
