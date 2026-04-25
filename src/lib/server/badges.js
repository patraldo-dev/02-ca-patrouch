// Badge catalog — all possible badges with their metadata
const BADGE_CATALOG = [
    // Streak
    { id: 'streak_3', name: 'Three in a Row', icon: '🔥', category: 'streak', rarity: 'common', description: { en: 'Write 3 days in a row', es: 'Escribe 3 días seguidos', fr: 'Écris 3 jours de suite' } },
    { id: 'streak_7', name: 'Week Warrior', icon: '⚡', category: 'streak', rarity: 'uncommon', description: { en: 'Write 7 days in a row', es: 'Escribe 7 días seguidos', fr: 'Écris 7 jours de suite' } },
    { id: 'streak_14', name: 'Fortnight Flow', icon: '🌊', category: 'streak', rarity: 'rare', description: { en: 'Write 14 days in a row', es: 'Escribe 14 días seguidos', fr: 'Écris 14 jours de suite' } },
    { id: 'streak_30', name: 'Monthly Master', icon: '🏆', category: 'streak', rarity: 'legendary', description: { en: 'Write 30 days in a row', es: 'Escribe 30 días seguidos', fr: 'Écris 30 jours de suite' } },
    // Words
    { id: 'words_100', name: 'Centurion', icon: '📝', category: 'words', rarity: 'common', description: { en: 'Write 100 words', es: 'Escribe 100 palabras', fr: 'Écris 100 mots' } },
    { id: 'words_1000', name: 'Wordsmith', icon: '✍️', category: 'words', rarity: 'uncommon', description: { en: 'Write 1,000 words', es: 'Escribe 1,000 palabras', fr: 'Écris 1 000 mots' } },
    { id: 'words_5000', name: 'Prolific Pen', icon: '🪶', category: 'words', rarity: 'rare', description: { en: 'Write 5,000 words', es: 'Escribe 5,000 palabras', fr: 'Écris 5 000 mots' } },
    { id: 'words_10000', name: 'Novelist', icon: '📚', category: 'words', rarity: 'legendary', description: { en: 'Write 10,000 words', es: 'Escribe 10,000 palabras', fr: 'Écris 10 000 mots' } },
    { id: 'words_50000', name: 'Literary Titan', icon: '🏛️', category: 'words', rarity: 'legendary', description: { en: 'Write 50,000 words', es: 'Escribe 50,000 palabras', fr: 'Écris 50 000 mots' } },
    // Agora
    { id: 'agora_first', name: 'First Voice', icon: '🗣️', category: 'agora', rarity: 'common', description: { en: 'Publish your first writing', es: 'Publica tu primer escrito', fr: 'Publie ton premier texte' } },
    { id: 'agora_comment', name: 'Conversationalist', icon: '💬', category: 'agora', rarity: 'common', description: { en: 'Receive a comment', es: 'Recibe un comentario', fr: 'Reçois un commentaire' } },
    { id: 'agora_10', name: 'Community Contributor', icon: '🤝', category: 'agora', rarity: 'uncommon', description: { en: 'Publish 10 writings', es: 'Publica 10 escritos', fr: 'Publie 10 textes' } },
    { id: 'agora_featured', name: 'Editor\'s Pick', icon: '⭐', category: 'agora', rarity: 'legendary', description: { en: 'Get a featured comment', es: 'Obtén un comentario destacado', fr: 'Obtiens un commentaire vedette' } },
    // Social
    { id: 'social_like_10', name: 'Crowd Favorite', icon: '❤️', category: 'social', rarity: 'uncommon', description: { en: 'Get 10 likes', es: 'Recibe 10 likes', fr: 'Reçois 10 likes' } },
    { id: 'social_like_50', name: 'Beloved Writer', icon: '💖', category: 'social', rarity: 'rare', description: { en: 'Get 50 likes', es: 'Recibe 50 likes', fr: 'Reçois 50 likes' } },
    // Challenge
    { id: 'challenge_daily', name: 'Daily Devotee', icon: '🗓️', category: 'challenge', rarity: 'uncommon', description: { en: 'Complete the daily prompt', es: 'Completa el prompt diario', fr: 'Complète le prompt du jour' } },
    // Milestone
    { id: 'milestone_join', name: 'Welcome', icon: '🎉', category: 'milestone', rarity: 'common', description: { en: 'Join patrouch.ca', es: 'Únete a patrouch.ca', fr: 'Rejoins patrouch.ca' } },
    { id: 'milestone_avatar', name: 'Face Forward', icon: '🎭', category: 'milestone', rarity: 'common', description: { en: 'Set an avatar', es: 'Configura un avatar', fr: 'Configure un avatar' } },
];

export function getBadgeCatalog(unlockedBadges = []) {
    const unlockedIds = new Set(unlockedBadges.map(b => b.badge_id));
    return BADGE_CATALOG.map(badge => ({
        ...badge,
        unlocked: unlockedIds.has(badge.id),
        unlocked_at: unlockedBadges.find(b => b.badge_id === badge.id)?.unlocked_at || null
    }));
}
