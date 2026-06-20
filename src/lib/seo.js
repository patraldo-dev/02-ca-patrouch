import { get } from 'svelte/store';
import { t, locale } from '$lib/i18n';

const descriptions = {
    'en': {
        '/': 'Patrouch — A Playful Space for Serious Writing. Get weekly creative sparks, write in any language, and share your voice with a community of writers.',
        '/agora': 'Browse writings from the Patrouch community. Discover new voices, read published works, and find inspiration.',
        '/write': 'Your writing space. Accept this week\'s creative spark, write freely, and track your progress.',
        '/login': 'Sign in to your Patrouch account.',
        '/signup': 'Join Patrouch — a playful space for serious writing. Get weekly sparks and start writing today.',
    },
    'es': {
        '/': 'Patrouch — Un Espacio Lúdico para Escritura Seria. Recibe chispas creativas semanales, escribe en cualquier idioma y comparte tu voz con una comunidad de escritores.',
        '/agora': 'Explora escritos de la comunidad Patrouch. Descubre nuevas voces, lee obras publicadas y encuentra inspiración.',
        '/write': 'Tu espacio de escritura. Acepta la chispa creativa de esta semana, escribe libremente y lleva tu progreso.',
        '/login': 'Inicia sesión en tu cuenta de Patrouch.',
        '/signup': 'Únete a Patrouch — un espacio lúdico para escritura seria. Recibe chispas semanales y empieza a escribir hoy.',
    },
    'fr': {
        '/': 'Patrouch — Un Espace Ludique pour l\'Écriture Sérieuse. Recevez des étincelles créatives hebdomadaires, écrivez dans n\'importe quelle langue et partagez votre voix.',
        '/agora': 'Parcourez les écrits de la communauté Patrouch. Découvrez de nouvelles voix et trouvez l\'inspiration.',
        '/write': 'Votre espace d\'écriture. Acceptez l\'étincelle de la semaine, écrivez librement et suivez votre progression.',
        '/login': 'Connectez-vous à votre compte Patrouch.',
        '/signup': 'Rejoignez Patrouch — un espace ludique pour l\'écriture sérieuse. Recevez des étincelles hebdomadaires et commencez à écrire.',
    }
};

export function getSeoMeta(pathname, lang) {
    const localeDescriptions = descriptions[lang] || descriptions['en'];
    const desc = localeDescriptions[pathname] || localeDescriptions['/'];
    const title = 'Patrouch — A Playful Space for Serious Writing';
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
