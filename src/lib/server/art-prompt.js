// src/lib/server/art-prompt.js
const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const ANTOINE_ARTWORKS = [
    { id: 'f8a136eb-363e-4a24-0f54-70bb4f4bf800', title: 'Mujer' },
    { id: '26fe40df-7745-41dc-7491-97cb36a32f00', title: 'Blue Alien King' },
    { id: '75b29e1a-2d22-4ef7-af19-2f7e3828bd00', title: 'Green Alien King' },
    { id: '65dfe0b8-5b3f-4501-a3ee-c99d301a1800', title: 'Yellow Alien King' },
    { id: 'd4969f09-777d-46a4-f167-db56837e5300', title: 'Brown Alien King' },
];

export function getImageUrl(imageId, variant = 'gallery') {
    return `https://imagedelivery.net/${CF_IMAGES_HASH}/${imageId}/${variant}`;
}

export function getDailyArtwork() {
    const today = new Date();
    const cst = new Date(today.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const dayOfYear = Math.floor((cst - new Date(cst.getFullYear(), 0, 0)) / 86400000);
    const index = dayOfYear % ANTOINE_ARTWORKS.length;
    const artwork = ANTOINE_ARTWORKS[index];
    return {
        imageUrl: getImageUrl(artwork.id, 'gallery'),
        title: artwork.title,
        credit: 'Antoine Patraldo',
    };
}

export function getRandomArtwork() {
    const artwork = ANTOINE_ARTWORKS[Math.floor(Math.random() * ANTOINE_ARTWORKS.length)];
    return {
        imageUrl: getImageUrl(artwork.id, 'gallery'),
        title: artwork.title,
        credit: 'Antoine Patraldo',
    };
}

export { ANTOINE_ARTWORKS };
