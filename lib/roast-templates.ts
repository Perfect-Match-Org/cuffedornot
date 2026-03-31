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
    { field: 'valence', condition: 'lt', threshold: 0.10, template: 'Valence at {value}. The algorithm is legally required to ask if you are okay.' },
    { field: 'valence', condition: 'lt', threshold: 0.25, template: 'Your happiness index is {value}. Spotify should check on you.' },
    { field: 'valence', condition: 'gt', threshold: 0.95, template: "Valence at {value}. You are terrifyingly unbothered by reality." },
    { field: 'valence', condition: 'gt', threshold: 0.80, template: "Valence at {value}? You're either genuinely happy or in deep denial." },
    // energy
    { field: 'energy', condition: 'lt', threshold: 0.15, template: "Energy level {value}. Your heart rate must be resting at like 30 BPM." },
    { field: 'energy', condition: 'lt', threshold: 0.30, template: "Your average energy level is {value}. That's less energetic than elevator music." },
    { field: 'energy', condition: 'gt', threshold: 0.95, template: "Energy level at {value}. How much iced coffee from Libe Cafe have you consumed today?" },
    { field: 'energy', condition: 'gt', threshold: 0.80, template: 'Energy at {value}. Do you ever just... sit?' },
    // danceability
    { field: 'danceability', condition: 'gt', threshold: 0.90, template: 'Danceability at {value}. You treat every crosswalk like a runway.' },
    { field: 'danceability', condition: 'gt', threshold: 0.80, template: 'Danceability at {value}. You 100% have a solo dance session routine.' },
    { field: 'danceability', condition: 'lt', threshold: 0.10, template: "Danceability at {value}. You stand completely still at concerts." },
    { field: 'danceability', condition: 'lt', threshold: 0.25, template: "Danceability this low means you either can't dance or won't. Both are valid." },
    // acousticness
    { field: 'acousticness', condition: 'gt', threshold: 0.85, template: "Acousticness at {value}. You're definitely writing poetry in the A.D. White Library." },
    { field: 'acousticness', condition: 'gt', threshold: 0.70, template: "Acousticness at {value}. You're the person who brings a guitar to the party. Nobody asked." },
    { field: 'acousticness', condition: 'lt', threshold: 0.05, template: "Acousticness {value}. If it cannot be played through a massive frat basement subwoofer, you refuse to listen." },
    { field: 'acousticness', condition: 'lt', threshold: 0.15, template: "Zero acoustic tolerance. If it doesn't have a synth, you don't want it." },
    // instrumentalness
    { field: 'instrumentalness', condition: 'gt', threshold: 0.80, template: 'Instrumentalness at {value}. You just pretend to study at Olin, but really you stare at the wall.' },
    { field: 'instrumentalness', condition: 'gt', threshold: 0.40, template: 'You listen to music without words. Are you avoiding your feelings or just pretentious?' },
    // speechiness
    { field: 'speechiness', condition: 'gt', threshold: 0.50, template: "More podcasts than playlists? That's not a music taste, that's an identity crisis." },
    // minor key ratio
    { field: 'minorRatio', condition: 'gt', threshold: 0.90, template: "{value}% minor key. Taking prelims is breaking your spirit." },
    { field: 'minorRatio', condition: 'gt', threshold: 0.70, template: "{value}% of your music is in minor key. That's not a vibe, that's a dramatic monologue." },
    { field: 'minorRatio', condition: 'lt', threshold: 0.20, template: "Only {value}% minor key. You aggressively refuse to be sad and it's suspicious." },
    // tempo
    { field: 'tempo', condition: 'gt', threshold: 170, template: 'Average BPM of {value}. Power walking up the slope energy.' },
    { field: 'tempo', condition: 'gt', threshold: 150, template: 'Average BPM of {value}. Are you running from your problems? Literally?' },
    { field: 'tempo', condition: 'lt', threshold: 85, template: "Average BPM of {value}. That's funeral march territory." },
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
    'sad indie': "Your top genre is sad indie. You definitely stare out the window of the TCAT acting like you're in a movie.",
    'emo': "Your emo phase never ended, it just relocated to upstate New York.",
    'midwest emo': "Midwest emo. You're romanticizing Ithaca winters, aren't you?",
    'lo-fi': 'Lo-fi beats. We know you are pulling an all-nighter in Uris Library right now.',
    'bedroom pop': "Bedroom pop listener. The 'bedroom' part is doing the heavy lifting.",
    'k-pop': 'K-pop in the top genres. Your parasocial relationships are showing.',
    'country': "Country music? In Ithaca? You're either from Texas or going through something.",
    'classical': "Classical music fan. You definitely study in the A.D. White Library and judge people who cough.",
    'edm': 'Top genre: EDM. The algorithm assumed you were at a frat party.',
    'metal': "Metal fan. You express your emotions through screaming and that's honestly valid for prelim season.",
    'death metal': "Death metal fan. Just a normal reaction to checking Canvas.",
    'jazz': "Jazz listener. You've described yourself as 'an old soul' at least twice this semester.",
    'hyperpop': 'Hyperpop? Your music taste sounds like a broken printer. You belong in an Annex basement.',
    'shoegaze': 'Shoegaze fan. You stare at your shoes walking across the arts quad.',
    'dream pop': "Dream pop listener. Your entire aesthetic is 'ethereal sadness' on the slope.",
    'trap': "Trap heavy rotation. You're playing this on a massive speaker while walking to class.",
    'r&b': "R&B top genre. You're a romantic but you won't admit it.",
    'punk': "Punk fan. You're anti-establishment but still submitted your Receiptify link.",
    'anime': "Anime OSTs on repeat. We get it, you're the main character in your head.",
    'j-pop': "J-Pop listener. Your Spotify Wrapped is definitely in a language you don't actually speak.",
    'c-pop': "C-Pop in rotation. You're definitely heartbroken over an unnecessarily long idol drama.",
    'mandopop': "Mandopop fan. You've definitely cried in a karaoke room at least once.",
    'soundtrack': "Movie soundtracks? You're treating your walk to Duffield like a cinematic masterpiece.",
    'indie': "Indie top genre. You're definitely wearing a tote bag right now.",
    'folk': "Folk music. You own a flannel for every day of the week and romanticize the winter blues.",
    'hip hop': "Hip Hop heavy rotation. You probably think you could survive on Hot Ones.",
    'rap': "Rap fan. You definitely critique the mixing on a first listen.",
    'house': "House music. You've convinced yourself that an overpriced mocktail in Brooklyn is a religious experience.",
    'techno': "Techno listener. You exclusively wear black clothing and pretend you don't get tired at 2 AM.",
    'reggaeton': "Reggaeton fan. Perreo on the weekends, crying over Canvas assignments on the weekdays.",
    'math rock': "Math rock. You definitely talk to people who aren't listening about time signatures.",
    'singer-songwriter': "Singer-songwriter. You love feeling emotionally devastated in acoustic.",
    'show tunes': "Show tunes. You treat every minor inconvenience like the end of Act I.",
    'musical theatre': "Musical theatre. You definitely over-enunciate when you order at Starbucks.",
    'bossa nova': "Bossa nova. You're trying to pretend your dorm room is a chic Parisian cafe.",
    'afrobeats': "Afrobeats. You actually have rhythm, which means you carry every party you attend.",
    'pop punk': "Pop punk never died, it just grew up, got back pain, and started paying off student loans.",
    'k-indie': "K-indie fan. You curate perfectly aesthetic Instagram dumps but refuse to text people back.",
    'city pop': "City pop. You're nostalgic for a Tokyo summer in 1984 that you never even experienced.",
    'french pop': "French pop. You've read Albert Camus exactly once and made it your personality.",
    'bluegrass': "Bluegrass. You definitely own overalls and have unnecessarily strong opinions about banjos.",
    'grunge': "Grunge fan. You definitely wear combat boots even when it's 80 degrees outside.",
    'classic rock': "Classic rock. You were totally 'born in the wrong generation.' We've all heard it.",
    'jazz rap': "Jazz rap. You think you're intellectually superior because your hip hop has saxophones.",
    'latin pop': "Latin pop. You listen to Bad Bunny while cramming for finals, pretending you're at the club."
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
    { condition: 'gt', threshold: 0.25, template: "Emotional nosedive detected. Your Spotify went through the five stages of grief and got stuck on pure angst." },
    { condition: 'gt', threshold: 0.15, template: "Your music got {pct}% sadder in the last 6 months. We don't know what happened but the algorithm sends its condolences." },
    { condition: 'lt', threshold: -0.25, template: "Massive happiness spike detected. Either you fell in love or you're overcompensating. The algorithm is watching." },
    { condition: 'lt', threshold: -0.15, template: 'Your music got {pct}% happier recently. New relationship or did you finally get eight hours of sleep?' },
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
    if (musicAgeYear > currentYear - 2) return 'You only listen to TikTok audios. Your attention span is cooked.';
    if (musicAgeYear >= 2020) return 'Pandemic-era vibes. You found your comfort zone and locked it in.';
    if (musicAgeYear >= 2016) return 'The Vine compilation and SoundCloud rap era. You miss when life was simple.';
    if (musicAgeYear >= 2010) return 'Peak Tumblr era. You never fully left.';
    if (musicAgeYear >= 2005) return 'Your iPod Nano is showing. Heavy Electropop / Scene kid energy.';
    if (musicAgeYear >= 2000) return 'Burning CDs from Limewire. Your family computer definitely had a virus.';
    if (musicAgeYear >= 1990) return 'Born in the wrong generation, or so you keep telling people.';
    return 'Your music taste predates WiFi. Serious Dad Rock energy.';
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
