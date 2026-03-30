// ---------------------------------------------------------------------------
// Audio Feature Roasts — triggered when a feature value crosses a threshold
// ---------------------------------------------------------------------------

export interface AudioFeatureRoast {
    field: string;
    condition: 'gt' | 'lt';
    threshold: number;
    template: string; // {value} is replaced with actual rounded value
}

export const AUDIO_FEATURE_ROASTS: AudioFeatureRoast[] = [
    // valence
    { field: 'valence', condition: 'lt', threshold: 0.25, template: 'Your happiness index is {value}. Spotify should check on you.' },
    { field: 'valence', condition: 'gt', threshold: 0.80, template: "Valence at {value}? You're either genuinely happy or in deep denial." },
    // energy
    { field: 'energy', condition: 'lt', threshold: 0.30, template: "Your average energy level is {value}. That's less energetic than elevator music." },
    { field: 'energy', condition: 'gt', threshold: 0.80, template: 'Energy at {value}. Do you ever just... sit?' },
    // danceability
    { field: 'danceability', condition: 'gt', threshold: 0.80, template: 'Danceability at {value}. You 100% have a solo dance session routine.' },
    { field: 'danceability', condition: 'lt', threshold: 0.25, template: "Danceability this low means you either can't dance or won't. Both are valid." },
    // acousticness
    { field: 'acousticness', condition: 'gt', threshold: 0.70, template: "Acousticness at {value}. You're the person who brings a guitar to the party. Nobody asked." },
    { field: 'acousticness', condition: 'lt', threshold: 0.15, template: "Zero acoustic tolerance. If it doesn't have a synth, you don't want it." },
    // instrumentalness
    { field: 'instrumentalness', condition: 'gt', threshold: 0.40, template: 'You listen to music without words. Are you avoiding your feelings or just pretentious?' },
    // speechiness
    { field: 'speechiness', condition: 'gt', threshold: 0.50, template: "More podcasts than playlists? That's not a music taste, that's an identity crisis." },
    // minor key ratio
    { field: 'minorRatio', condition: 'gt', threshold: 0.70, template: "{value}% of your music is in minor key. That's not a vibe, that's a diagnosis." },
    { field: 'minorRatio', condition: 'lt', threshold: 0.20, template: "Only {value}% minor key. You aggressively refuse to be sad and it's suspicious." },
    // tempo
    { field: 'tempo', condition: 'lt', threshold: 85, template: "Average BPM of {value}. That's funeral march territory." },
    { field: 'tempo', condition: 'gt', threshold: 150, template: 'Average BPM of {value}. Are you running from your problems? Literally?' },
    // loudness
    { field: 'loudness', condition: 'gt', threshold: -5, template: "Average loudness: {value}dB. Your neighbors filed a noise complaint through the algorithm." },
    { field: 'loudness', condition: 'lt', threshold: -15, template: "You listen at {value}dB. That's 'library whisper' volume. Who hurt you quietly?" },
    // popularity
    { field: 'avgPopularity', condition: 'gt', threshold: 85, template: "Your taste is literally the Billboard Hot 100. Bold of you to call that a personality." },
    { field: 'avgPopularity', condition: 'lt', threshold: 25, template: "Average artist popularity: {value}/100. Nobody has heard of your top artists. That's either impressive or concerning." },
];

// ---------------------------------------------------------------------------
// Genre Roasts — triggered when a keyword appears in user's top genres
// ---------------------------------------------------------------------------

export const GENRE_ROASTS: Record<string, string> = {
    'sad indie': "Your top genre is sad indie. That's not a music taste, that's a diagnosis.",
    'emo': "Your emo phase never ended, it just got a Spotify subscription.",
    'midwest emo': "Your emo phase never ended, it just got a Spotify subscription.",
    'lo-fi': 'Lo-fi beats to study/cry to. We see you.',
    'bedroom pop': "Bedroom pop listener. The 'bedroom' part is doing the heavy lifting.",
    'k-pop': 'K-pop in the top genres. Your parasocial relationships are showing.',
    'country': "Country music? In Ithaca? You're either from Texas or going through something.",
    'classical': "Classical music fan. Tell us again about your 'refined palette.'",
    'edm': 'Top genre: EDM. The algorithm assumed you were at a frat party.',
    'metal': "Metal fan. You express your emotions through screaming and that's honestly valid.",
    'death metal': "Metal fan. You express your emotions through screaming and that's honestly valid.",
    'jazz': "Jazz listener. You've described yourself as 'an old soul' at least twice this semester.",
    'hyperpop': 'Hyperpop? Your music taste is what a migraine sounds like, affectionately.',
    'shoegaze': 'Shoegaze fan. You stare at your shoes AND at the ceiling. Very versatile.',
    'dream pop': "Dream pop listener. Your entire aesthetic is 'ethereal sadness.'",
    'trap': "Trap heavy rotation. You've described something non-musical as 'hard' this week.",
    'r&b': "R&B top genre. You're a romantic but you won't admit it.",
    'punk': "Punk fan. You're anti-establishment but still submitted your Receiptify link.",
};

// ---------------------------------------------------------------------------
// Emotional Drift Roasts — triggered by significant valence drift
// ---------------------------------------------------------------------------

export interface DriftRoast {
    condition: 'gt' | 'lt';
    threshold: number;
    template: string; // {pct} is replaced with drift percentage
}

export const DRIFT_ROASTS: DriftRoast[] = [
    { condition: 'gt', threshold: 0.25, template: "Emotional nosedive detected. Your Spotify went through the five stages of grief and got stuck on depression." },
    { condition: 'gt', threshold: 0.15, template: "Your music got {pct}% sadder in the last 6 months. We don't know what happened but the algorithm sends its condolences." },
    { condition: 'lt', threshold: -0.25, template: "Massive happiness spike detected. Either you fell in love or you're overcompensating. The algorithm is watching." },
    { condition: 'lt', threshold: -0.15, template: 'Your music got {pct}% happier recently. New relationship or new antidepressants?' },
];

// ---------------------------------------------------------------------------
// Music Age Roasts — triggered by avgTrackAgeYears
// ---------------------------------------------------------------------------

export interface MusicAgeRoast {
    condition: 'gt' | 'lt';
    threshold: number;
    template: string; // {age} = years, {year} = computed year
}

export const MUSIC_AGE_ROASTS: MusicAgeRoast[] = [
    { condition: 'gt', threshold: 25, template: "Average track age: {age} years. Your taste peaked before the internet existed." },
    { condition: 'gt', threshold: 15, template: "Your average track is from {year}. You were not alive for most of your music." },
    { condition: 'lt', threshold: 1, template: "Average track age: {age} years. You have the attention span of a TikTok algorithm." },
];

// ---------------------------------------------------------------------------
// Listening Personality Map — maps top-2 extreme features to a label
// ---------------------------------------------------------------------------

// Keys are "direction_feature+direction_feature" where direction is "high" or "low"
// Features checked: valence, energy, danceability, acousticness, instrumentalness
export const LISTENING_PERSONALITY_MAP: Record<string, string> = {
    'high_valence+high_energy': 'The Life of the Party',
    'high_energy+high_valence': 'The Life of the Party',
    'high_valence+high_danceability': 'The Emotional Dancer',
    'high_danceability+high_valence': 'The Emotional Dancer',
    'low_valence+high_acousticness': 'The Brooding Acoustic',
    'high_acousticness+low_valence': 'The Brooding Acoustic',
    'low_valence+high_energy': 'The Angry Poet',
    'high_energy+low_valence': 'The Angry Poet',
    'high_energy+low_acousticness': 'The Chaotic DJ',
    'low_acousticness+high_energy': 'The Chaotic DJ',
    'high_acousticness+low_energy': 'The Coffeehouse Regular',
    'low_energy+high_acousticness': 'The Coffeehouse Regular',
    'high_danceability+high_energy': 'The Club Survivor',
    'high_energy+high_danceability': 'The Club Survivor',
    'low_valence+low_energy': 'The Midnight Overthinker',
    'low_energy+low_valence': 'The Midnight Overthinker',
    'high_valence+low_energy': 'The Peaceful Optimist',
    'low_energy+high_valence': 'The Peaceful Optimist',
    'high_danceability+low_valence': 'The Sad Dancer',
    'low_valence+high_danceability': 'The Sad Dancer',
    'high_acousticness+high_valence': 'The Campfire Romantic',
    'high_valence+high_acousticness': 'The Campfire Romantic',
    'high_instrumentalness+low_energy': 'The Ambient Drifter',
    'low_energy+high_instrumentalness': 'The Ambient Drifter',
    'high_instrumentalness+high_energy': 'The Soundscape Architect',
    'high_energy+high_instrumentalness': 'The Soundscape Architect',
    'low_danceability+low_energy': 'The Deep Listener',
    'low_energy+low_danceability': 'The Deep Listener',
    'low_danceability+high_acousticness': 'The Contemplative Soul',
    'high_acousticness+low_danceability': 'The Contemplative Soul',
};

// ---------------------------------------------------------------------------
// Genre Diversity Tiers
// ---------------------------------------------------------------------------

export interface DiversityTier {
    maxEntropy: number;
    label: string;
    description: string;
}

export const DIVERSITY_TIERS: DiversityTier[] = [
    { maxEntropy: 1.0, label: 'Tunnel Vision', description: "You found your one genre and you're not letting go." },
    { maxEntropy: 2.0, label: 'Comfort Zone', description: 'You have a type. In music and probably in people.' },
    { maxEntropy: 3.0, label: 'Explorer', description: "Respectable range. You'd survive an aux cord battle." },
    { maxEntropy: 3.5, label: 'Genre Fluid', description: "Your taste is all over the place and that's a flex." },
    { maxEntropy: Infinity, label: 'Musical Chaos Agent', description: 'Your shuffle is an unhinged fever dream and we respect it.' },
];

// ---------------------------------------------------------------------------
// Music Age Display
// ---------------------------------------------------------------------------

export function getMusicAgeSubtitle(musicAgeYear: number): string {
    const currentYear = new Date().getFullYear();
    if (musicAgeYear > currentYear - 3) return 'You only listen to what\'s new. The algorithm respects the hustle.';
    if (musicAgeYear >= 2010) return 'Peak Tumblr era. You never fully left.';
    if (musicAgeYear >= 2000) return 'Your iPod Nano is showing.';
    if (musicAgeYear >= 1990) return "Born in the wrong generation, or so you keep telling people.";
    return "Your music taste predates your parents' relationship.";
}

// ---------------------------------------------------------------------------
// Vibe Shift Display Labels
// ---------------------------------------------------------------------------

export const MOOD_QUADRANT_LABELS: Record<string, string> = {
    'Social': 'Party Mode',
    'Chill': 'Chill Mode',
    'Intense': 'Rage Mode',
    'Brooding': 'Therapy Mode',
};
