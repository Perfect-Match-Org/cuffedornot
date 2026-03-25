/* ============================================
   Cuffed or Not — Core App
   Receiptify Stats → Relationship Analysis
   ============================================ */



// ─── RECEIPTIFY INPUT ───────────────────────

function openReceiptify() {
    window.open('https://receiptify.herokuapp.com/', '_blank');
}

// OCR: parse a Receiptify stats screenshot using Tesseract.js
async function parseReceiptImage(imageFile) {
    const statusEl = document.getElementById('ocr-status');
    if (statusEl) statusEl.textContent = 'Reading your receipt...';

    try {
        const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text' && statusEl) {
                    statusEl.textContent = `Scanning... ${Math.round(m.progress * 100)}%`;
                }
            }
        });

        const stats = {};
        const patterns = [
            { key: 'happiness', regex: /happiness\s*[:\-]?\s*([\d.]+)/i },
            { key: 'energy', regex: /energy\s*[:\-]?\s*([\d.]+)/i },
            { key: 'danceability', regex: /danceability\s*[:\-]?\s*([\d.]+)/i },
            { key: 'acousticness', regex: /acousticness\s*[:\-]?\s*([\d.]+)/i },
            { key: 'trackAge', regex: /(?:average\s+)?track\s+age\s*[:\-]?\s*([\d.]+)/i },
            { key: 'popularity', regex: /popularity(?:\s+score)?\s*[:\-]?\s*([\d.]+)/i },
        ];

        for (const { key, regex } of patterns) {
            const match = text.match(regex);
            if (match) stats[key] = parseFloat(match[1]);
        }

        if (statusEl) statusEl.textContent = 'Stats extracted!';
        return stats;
    } catch (err) {
        console.error('OCR failed:', err);
        if (statusEl) statusEl.textContent = 'Could not read image — enter stats manually';
        return {};
    }
}

// Populate form inputs from parsed stats
function populateInputs(stats) {
    const fields = ['happiness', 'energy', 'danceability', 'acousticness', 'trackAge', 'popularity'];
    for (const field of fields) {
        if (stats[field] !== undefined) {
            const input = document.getElementById(`input-${field}`);
            const slider = document.getElementById(`slider-${field}`);
            if (input) input.value = stats[field];
            if (slider) slider.value = stats[field];
        }
    }
}

// Read current form values
function readInputs() {
    return {
        happiness: parseFloat(document.getElementById('input-happiness')?.value) || 50,
        energy: parseFloat(document.getElementById('input-energy')?.value) || 50,
        danceability: parseFloat(document.getElementById('input-danceability')?.value) || 50,
        acousticness: parseFloat(document.getElementById('input-acousticness')?.value) || 50,
        trackAge: parseFloat(document.getElementById('input-trackAge')?.value) || 3,
        popularity: parseFloat(document.getElementById('input-popularity')?.value) || 50,
    };
}

// Convert Receiptify stats → synthetic Spotify data for the analysis engine
function buildSyntheticData(stats) {
    const currentYear = new Date().getFullYear();
    const releaseYear = currentYear - (stats.trackAge || 3);

    // Create 20 synthetic tracks so af.size > 10 triggers primary scoring
    const tracks = [];
    const audioFeatures = new Map();

    for (let i = 0; i < 20; i++) {
        const id = `receiptify-${i}`;
        tracks.push({
            id,
            name: 'Your Music',
            artists: [{ name: 'Various' }],
            album: { release_date: `${releaseYear}-06-15` },
            popularity: stats.popularity || 50,
        });
        audioFeatures.set(id, {
            id,
            valence: (stats.happiness || 50) / 100,
            energy: (stats.energy || 50) / 100,
            danceability: (stats.danceability || 50) / 100,
            acousticness: (stats.acousticness || 50) / 100,
            mode: (stats.happiness || 50) > 45 ? 1 : 0,
        });
    }

    return {
        topTracksShort: tracks,
        topTracksMedium: tracks,
        topTracksLong: tracks,
        topArtistsShort: [],
        topArtistsMedium: [],
        topArtistsLong: [],
        recentlyPlayed: [],
        audioFeatures,
        source: 'receiptify',
        stats,
    };
}

// Main entry point: read form → build data → analyze → render
async function analyzeFromReceiptify() {
    const stats = readInputs();

    // Validate inputs aren't all defaults
    const hasCustomValues = stats.happiness !== 50 || stats.energy !== 50 ||
                            stats.danceability !== 50 || stats.acousticness !== 50;
    if (!hasCustomValues) {
        showToast('Enter your stats first!');
        return;
    }

    showView('loading');
    const loadingAnim = startLoadingAnimation();

    // Dramatic pause for the loading animation
    await new Promise(r => setTimeout(r, 3000));

    const data = buildSyntheticData(stats);
    window.__spotifyData = data;
    window.__receiptifyMode = true;

    const result = analyzeRelationship(data);

    stopLoadingAnimation(loadingAnim);
    await new Promise(r => setTimeout(r, 400));

    renderResults(result);
}

// Handle an image file: OCR → auto-analyze on success, or show error + expand manual section
async function handleImageFile(file, zone) {
    zone.classList.add('processing');
    const stats = await parseReceiptImage(file);
    populateInputs(stats);
    zone.classList.remove('processing');

    const extractedCount = Object.keys(stats).length;
    const statusEl = document.getElementById('ocr-status');

    if (extractedCount >= 2) {
        // Successful extraction → brief success flash, then auto-analyze
        zone.classList.add('success');
        if (statusEl) statusEl.textContent = `Got ${extractedCount} stats — analyzing...`;
        setTimeout(() => {
            zone.classList.remove('success');
            analyzeFromReceiptify();
        }, 800);
    } else {
        // Failed or insufficient extraction → show error + expand manual section
        if (statusEl) statusEl.textContent = 'Couldn\u2019t read enough stats \u2014 try again or enter manually';
        zone.classList.add('error');
        setTimeout(() => zone.classList.remove('error'), 3000);
        // Open the manual stats section so the user sees the Analyze button
        const inputSection = document.querySelector('.input-section');
        if (inputSection && !inputSection.classList.contains('open')) {
            inputSection.classList.add('open');
        }
    }
}

// Set up paste/drop zone + slider sync (called on DOMContentLoaded)
function initInputHandlers() {
    const zone = document.getElementById('paste-zone');
    if (!zone) return;

    // Clipboard paste (anywhere on page)
    document.addEventListener('paste', async (e) => {
        const file = e.clipboardData?.files?.[0];
        if (file?.type.startsWith('image/')) {
            e.preventDefault();
            await handleImageFile(file, zone);
        }
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file?.type.startsWith('image/')) {
            await handleImageFile(file, zone);
        }
    });

    // File upload button
    const fileInput = document.getElementById('receipt-upload');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file?.type.startsWith('image/')) {
                await handleImageFile(file, zone);
            }
        });
    }

    // Slider ↔ number input sync
    const fields = ['happiness', 'energy', 'danceability', 'acousticness', 'trackAge', 'popularity'];
    for (const field of fields) {
        const slider = document.getElementById(`slider-${field}`);
        const input = document.getElementById(`input-${field}`);
        if (slider && input) {
            slider.addEventListener('input', () => { input.value = slider.value; });
            input.addEventListener('input', () => { slider.value = input.value; });
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initInputHandlers);

// ─── ANALYSIS ENGINE ─────────────────────────
// Research-grounded scoring: 9 signals, 3 modules
// Ref: Kosinski et al. 2013, Anderson et al. 2021, Nave et al. 2018

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── REFERENCE DATA ─────────────────────────

// Genre → single-energy mapping (0.0 = couple energy, 1.0 = single energy)
// Comprehensive list covering Spotify's micro-genres
const GENRE_SCORES = {
    // ══ HIGH single energy (0.7–1.0) — breakup / sadness / introspection ══
    'sad': 0.9, 'sad rap': 0.95, 'sad lo-fi': 0.9, 'sad indie': 0.88,
    'emo': 0.85, 'emo rap': 0.88, 'midwest emo': 0.88, 'emo pop': 0.78,
    'bedroom pop': 0.8, 'indie folk': 0.75, 'slowcore': 0.85,
    'dream pop': 0.72, 'melancholia': 0.95, 'post-punk': 0.7,
    'shoegaze': 0.72, 'dark r&b': 0.78, 'alt z': 0.7,
    'pov: indie': 0.75, 'lo-fi beats': 0.68, 'lo-fi': 0.68,
    'ambient': 0.65, 'grunge': 0.7, 'cry rap': 0.92,
    'heartbreak': 0.95, 'lonely': 0.9, 'vapor soul': 0.72,
    'dark pop': 0.7, 'gothic': 0.75, 'witch house': 0.78,
    'cloud rap': 0.65, 'underground hip hop': 0.6,
    'depressed': 0.95, 'breakup': 0.95, 'heartache': 0.92,
    'angst': 0.8, 'doom': 0.78, 'doom metal': 0.75,
    'noise': 0.7, 'noise pop': 0.68, 'noise rock': 0.7,
    'post-rock': 0.65, 'math rock': 0.6, 'screamo': 0.82,
    'hardcore': 0.72, 'post-hardcore': 0.7, 'metalcore': 0.68,
    'black metal': 0.75, 'death metal': 0.72, 'metal': 0.65,
    'darkwave': 0.75, 'coldwave': 0.78, 'ethereal': 0.7,
    'atmospheric': 0.65, 'downtempo': 0.62, 'trip hop': 0.62,
    'dark ambient': 0.78, 'drone': 0.72, 'experimental': 0.6,
    'avant-garde': 0.62, 'art pop': 0.58, 'art rock': 0.58,
    'singer-songwriter': 0.7, 'acoustic': 0.6,
    'lofi hip hop': 0.68, 'chillhop': 0.55,

    // ══ MEDIUM-HIGH (0.55–0.7) ══
    'indie': 0.58, 'indie rock': 0.58, 'indie pop': 0.55,
    'alternative': 0.55, 'alt rock': 0.55, 'alternative rock': 0.55,
    'alternative r&b': 0.58, 'alt r&b': 0.58,
    'rock': 0.5, 'classic rock': 0.45, 'soft rock': 0.4,
    'folk': 0.58, 'folk rock': 0.55, 'neofolk': 0.6,
    'blues': 0.6, 'blues rock': 0.55, 'delta blues': 0.62,
    'country': 0.52, 'country rock': 0.5, 'outlaw country': 0.58,
    'americana': 0.55, 'bluegrass': 0.52, 'neo-country': 0.5,
    'punk': 0.6, 'punk rock': 0.58, 'pop punk': 0.55,
    'skate punk': 0.58, 'garage rock': 0.55, 'garage': 0.5,
    'psychedelic': 0.55, 'psychedelic rock': 0.55, 'psych': 0.55,
    'jazz': 0.5, 'jazz rap': 0.55, 'jazz fusion': 0.48,
    'neo soul': 0.52, 'conscious': 0.58, 'conscious hip hop': 0.58,
    'underground': 0.6, 'abstract': 0.58, 'abstract hip hop': 0.58,
    'progressive': 0.55, 'prog rock': 0.55, 'prog metal': 0.6,

    // ══ MEDIUM (0.4–0.55) — neutral / could go either way ══
    'hip hop': 0.5, 'rap': 0.5, 'trap': 0.5,
    'r&b': 0.48, 'rnb': 0.48, 'soul': 0.48,
    'pop': 0.42, 'pop rap': 0.45, 'pop rock': 0.42,
    'melodic rap': 0.48, 'melodic': 0.45,
    'drill': 0.52, 'uk drill': 0.52, 'ny drill': 0.52,
    'plugg': 0.5, 'phonk': 0.52, 'drift phonk': 0.55,
    'k-pop': 0.42, 'j-pop': 0.42, 'c-pop': 0.42,
    'k-rap': 0.5, 'j-rap': 0.5,
    'electronic': 0.42, 'electropop': 0.4, 'synth pop': 0.42,
    'synthwave': 0.45, 'retrowave': 0.45, 'vaporwave': 0.55,
    'house': 0.38, 'deep house': 0.35, 'tech house': 0.38,
    'techno': 0.42, 'minimal techno': 0.45,
    'bass': 0.4, 'bass music': 0.4, 'dubstep': 0.42,
    'dnb': 0.42, 'drum and bass': 0.42, 'jungle': 0.4,
    'grime': 0.52, 'uk grime': 0.52,
    'gospel': 0.35, 'worship': 0.3, 'christian': 0.35,
    'classical': 0.5, 'classical piano': 0.55, 'orchestra': 0.48,
    'new age': 0.45, 'meditation': 0.5,

    // ══ Regional hip hop / rap variants (very common on Spotify) ══
    'canadian hip hop': 0.5, 'canadian rap': 0.5,
    'chicago rap': 0.52, 'detroit rap': 0.55,
    'atlanta rap': 0.48, 'atl hip hop': 0.48,
    'houston rap': 0.48, 'memphis rap': 0.55,
    'east coast hip hop': 0.5, 'west coast hip hop': 0.48,
    'southern hip hop': 0.48, 'dirty south': 0.45,
    'florida rap': 0.48, 'miami hip hop': 0.45,
    'uk hip hop': 0.5, 'uk rap': 0.5, 'british hip hop': 0.5,
    'french hip hop': 0.5, 'german hip hop': 0.5,
    'australian hip hop': 0.5, 'korean hip hop': 0.5,
    'dfw rap': 0.48, 'bay area hip hop': 0.48,
    'nyc rap': 0.5, 'la rap': 0.48, 'philly rap': 0.52,
    'canadian pop': 0.42, 'uk pop': 0.42,
    'swedish pop': 0.4, 'german pop': 0.42,
    'australian pop': 0.42, 'french pop': 0.42,
    'nigerian pop': 0.35, 'south african pop': 0.38,

    // ══ Trap / modern rap variants ══
    'trap soul': 0.55, 'trapsoul': 0.55,
    'rage': 0.55, 'rage rap': 0.55,
    'mumble rap': 0.45, 'soundcloud rap': 0.55,
    'gangsta rap': 0.48, 'g-funk': 0.42,
    'crunk': 0.4, 'hyphy': 0.38, 'snap': 0.4,
    'boom bap': 0.52, 'old school hip hop': 0.48,
    '90s hip hop': 0.48, '80s hip hop': 0.48,
    'chopped and screwed': 0.55, 'slowed and reverb': 0.6,
    'frat rap': 0.4, 'party rap': 0.35,
    'viral rap': 0.45, 'tiktok': 0.4,

    // ══ R&B / Soul variants ══
    'urban contemporary': 0.45, 'quiet storm': 0.35,
    'new jack swing': 0.38, 'contemporary r&b': 0.48,
    'motown': 0.4, 'classic soul': 0.45,
    'pj': 0.48, 'bedroom r&b': 0.6,

    // ══ LOW single energy (0.0–0.35) — couple energy / party ══
    'wedding': 0.05, 'love': 0.1, 'romantic': 0.08,
    'adult contemporary': 0.15, 'easy listening': 0.2,
    'bossa nova': 0.2, 'smooth jazz': 0.18,
    'chill': 0.3, 'lounge': 0.2, 'chill r&b': 0.32,
    'date night': 0.05, 'baby making music': 0.02,
    'dance pop': 0.28, 'edm': 0.3, 'tropical house': 0.25,
    'disco': 0.28, 'nu disco': 0.3, 'funk': 0.32,
    'afrobeats': 0.32, 'afropop': 0.3, 'afrofusion': 0.32,
    'dancehall': 0.3, 'reggae': 0.35, 'ska': 0.35,
    'reggaeton': 0.28, 'latin': 0.32, 'latin pop': 0.3,
    'bachata': 0.15, 'salsa': 0.25, 'merengue': 0.25,
    'cumbia': 0.3, 'samba': 0.25, 'mpb': 0.35,
    'amapiano': 0.3, 'gqom': 0.32,
    'party': 0.2, 'club': 0.25, 'party music': 0.2,
    'feel good': 0.25, 'happy': 0.2, 'summer': 0.22,
    'motivational': 0.3, 'workout': 0.3, 'gym': 0.3,
    'tropical': 0.25, 'island': 0.28,
};

// ─── HELPER FUNCTIONS ────────────────────────

function getGenresFromArtists(artists) {
    const genres = [];
    artists.forEach(a => { if (a.genres) genres.push(...a.genres); });
    return genres;
}

function getGenreSet(artists) {
    return new Set(getGenresFromArtists(artists).map(g => g.toLowerCase()));
}

function scoreGenre(genre) {
    const lower = genre.toLowerCase();

    // Pass 1: exact match in the map
    if (GENRE_SCORES[lower] !== undefined) return GENRE_SCORES[lower];

    // Pass 2: substring matching (e.g. "canadian hip hop" contains "hip hop")
    for (const [key, score] of Object.entries(GENRE_SCORES)) {
        if (lower.includes(key) || key.includes(lower)) return score;
    }

    // Pass 3: keyword decomposition — split into words and match individually
    // "melodic detroit trap" → try "melodic", "detroit", "trap"
    const words = lower.split(/[\s\-_]+/);
    const wordScores = [];
    for (const word of words) {
        if (word.length < 3) continue; // skip tiny words
        if (GENRE_SCORES[word] !== undefined) {
            wordScores.push(GENRE_SCORES[word]);
        }
    }
    if (wordScores.length > 0) {
        return wordScores.reduce((a, b) => a + b, 0) / wordScores.length;
    }

    return null; // truly unrecognized
}

function jaccard(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 1;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

// ─── MODULE A: TRANSITION DETECTOR (60%) ─────

// Signal 1: Genre Migration (20%)
function computeGenreMigration(shortArtists, longArtists) {
    const shortGenres = getGenresFromArtists(shortArtists);
    const longGenres = getGenresFromArtists(longArtists);

    if (shortGenres.length === 0 && longGenres.length === 0) {
        return { score: 0.5, evidence: null };
    }

    // Score direction: are NEW genres sadder or happier?
    const longSet = getGenreSet(longArtists);
    const newGenres = shortGenres.filter(g => !longSet.has(g.toLowerCase()));
    const droppedGenres = longGenres.filter(g => !getGenreSet(shortArtists).has(g.toLowerCase()));

    let newAvg = 0.5;
    let droppedAvg = 0.5;

    const scoredNew = newGenres.map(g => scoreGenre(g)).filter(s => s !== null);
    const scoredDropped = droppedGenres.map(g => scoreGenre(g)).filter(s => s !== null);

    if (scoredNew.length > 0) newAvg = scoredNew.reduce((a, b) => a + b, 0) / scoredNew.length;
    if (scoredDropped.length > 0) droppedAvg = scoredDropped.reduce((a, b) => a + b, 0) / scoredDropped.length;

    // If new genres are sadder than dropped ones → single direction
    const migration = (newAvg - droppedAvg) * 0.5 + 0.5; // normalize to 0–1

    // Also factor in overlap — low overlap = more change
    const shortSet = getGenreSet(shortArtists);
    const jaccardSim = jaccard(shortSet, longSet);
    const changeIntensity = 1 - jaccardSim;

    // Combine: direction weighted by how much change occurred
    const score = 0.5 + (migration - 0.5) * Math.min(1, changeIntensity * 3);

    // Generate evidence
    let evidence = null;
    const sadNew = newGenres.filter(g => {
        const s = scoreGenre(g);
        return s !== null && s > 0.7;
    });
    const happyNew = newGenres.filter(g => {
        const s = scoreGenre(g);
        return s !== null && s < 0.3;
    });

    if (sadNew.length >= 2) {
        const g = [...new Set(sadNew.map(x => x.toLowerCase()))].slice(0, 3).join(', ');
        evidence = {
            emoji: '💀',
            text: pick([
                `You recently migrated to <strong>${g}</strong>. That's not a vibe shift, that's a mood collapse.`,
                `<strong>${g}</strong> just entered your rotation. Something definitely happened.`,
                `Your taste shifted toward <strong>${g}</strong> in the last month. We see you.`,
                `Going from your usual genres to <strong>${g}</strong>? That's called processing.`,
                `<strong>${g}</strong> wasn't in your long-term taste. Now it is. Noted.`,
            ]),
        };
    } else if (happyNew.length >= 2) {
        const g = [...new Set(happyNew.map(x => x.toLowerCase()))].slice(0, 3).join(', ');
        evidence = {
            emoji: '🥰',
            text: pick([
                `You recently picked up <strong>${g}</strong>. Either new love or a really good therapist.`,
                `<strong>${g}</strong> is new in your rotation. Things are looking up.`,
                `Your taste just shifted toward <strong>${g}</strong>. Someone's had a glow-up.`,
            ]),
        };
    }

    return { score: Math.max(0, Math.min(1, score)), evidence };
}

// Signal 3: Late-Night Listening Anomaly (15%)
function computeLateNightAnomaly(recentlyPlayed) {
    if (recentlyPlayed.length === 0) {
        return { score: 0.5, evidence: null };
    }

    const lateNightTracks = [];
    recentlyPlayed.forEach(item => {
        if (!item.played_at) return;
        const hour = new Date(item.played_at).getHours();
        if (hour >= 23 || hour <= 4) {
            lateNightTracks.push(item.track);
        }
    });

    // Population baseline: ~15% of listening is late-night
    const lateNightRatio = lateNightTracks.length / recentlyPlayed.length;
    // Deviation from baseline, amplified
    const deviation = (lateNightRatio - 0.15) / 0.15;
    const score = Math.max(0, Math.min(1, 0.5 + deviation * 0.35));

    let evidence = null;
    if (lateNightTracks.length >= 3) {
        const trackName = lateNightTracks[0]?.name || 'music';
        const n = lateNightTracks.length;
        evidence = {
            emoji: '🌙',
            text: pick([
                `${n} tracks played between 11pm–4am recently, including <strong>"${trackName}"</strong>. Situationship energy.`,
                `You played <strong>"${trackName}"</strong> and ${n - 1} other tracks after midnight. Who were you thinking about?`,
                `${n} late-night listens including <strong>"${trackName}"</strong>. That's called emotional damage hours.`,
                `<strong>"${trackName}"</strong> at 2am? ${n} tracks deep? You're not okay and we both know it.`,
                `Spotify clocked ${n} tracks between 11pm–4am. <strong>"${trackName}"</strong> was the opening act of your sadness concert.`,
            ]),
        };
    }

    return { score, evidence };
}

// Signal 4: Repeat Obsession Index (10%)
function computeRepeatObsession(shortTracks, medTracks, longTracks, recentlyPlayed) {
    // Cross-range repeats (emotional anchoring)
    const shortIds = new Set(shortTracks.map(t => t.id));
    const medIds = new Set(medTracks.map(t => t.id));
    const longIds = new Set(longTracks.map(t => t.id));

    let crossRangeOverlap = 0;
    shortIds.forEach(id => {
        if (medIds.has(id) && longIds.has(id)) crossRangeOverlap++;
    });

    // Single-track repeat in recently played (parasocial comfort)
    const recentIds = {};
    recentlyPlayed.forEach(item => {
        const id = item.track?.id;
        if (id) recentIds[id] = (recentIds[id] || 0) + 1;
    });
    const maxRepeat = Math.max(0, ...Object.values(recentIds));
    const repeatedTrack = Object.entries(recentIds).find(([, count]) => count === maxRepeat);
    const repeatedTrackName = repeatedTrack
        ? recentlyPlayed.find(i => i.track?.id === repeatedTrack[0])?.track?.name
        : null;

    // Combine: cross-range anchoring + single-track repeat
    const anchorScore = shortIds.size > 0
        ? Math.min(1, (crossRangeOverlap / shortIds.size) * 2.5)
        : 0.3;
    const repeatScore = Math.min(1, maxRepeat / 5); // 5+ plays = max

    const score = anchorScore * 0.5 + repeatScore * 0.5;

    let evidence = null;
    if (maxRepeat >= 3 && repeatedTrackName) {
        evidence = {
            emoji: '🔁',
            text: pick([
                `You played <strong>"${repeatedTrackName}"</strong> ${maxRepeat} times recently. That's an obsession, not a playlist.`,
                `<strong>"${repeatedTrackName}"</strong> ${maxRepeat} times in your recent history. You good?`,
                `${maxRepeat} plays of <strong>"${repeatedTrackName}"</strong>. Whatever this song means to you, it's got you in a chokehold.`,
                `<strong>"${repeatedTrackName}"</strong> on repeat ${maxRepeat} times. That's not casual listening, that's a fixation.`,
                `Spotify noticed you looping <strong>"${repeatedTrackName}"</strong> ${maxRepeat} times. We noticed too.`,
            ]),
        };
    } else if (crossRangeOverlap >= 5) {
        evidence = {
            emoji: '😭',
            text: pick([
                `<strong>${crossRangeOverlap} songs</strong> appear in your top tracks across all time periods. You've been locked in.`,
                `<strong>${crossRangeOverlap} songs</strong> in your top tracks for months straight. That's commitment to a vibe.`,
                `The same <strong>${crossRangeOverlap} songs</strong> across every time range. You found your soundtrack and you're not letting go.`,
                `<strong>${crossRangeOverlap} songs</strong> on permanent rotation. Your taste isn't evolving, it's anchored.`,
                `You've had <strong>${crossRangeOverlap} songs</strong> on repeat since forever. That says a lot.`,
            ]),
        };
    }

    return { score: Math.max(0, Math.min(1, score)), evidence };
}
// Signal 6: Temporal Regression Index (10%)
function computeTemporalRegression(shortTracks, longTracks) {
    function avgReleaseYear(tracks) {
        const years = tracks
            .map(t => t.album?.release_date)
            .filter(Boolean)
            .map(d => parseInt(d.substring(0, 4), 10))
            .filter(y => y > 1900 && y <= 2030);
        return years.length > 0 ? years.reduce((a, b) => a + b, 0) / years.length : null;
    }

    const shortAvg = avgReleaseYear(shortTracks);
    const longAvg = avgReleaseYear(longTracks);

    if (shortAvg === null || longAvg === null) {
        return { score: 0.5, evidence: null };
    }

    // Backward drift = nostalgia-seeking = coping
    // Forward drift = exploration = growth/new energy
    const drift = longAvg - shortAvg; // positive = listening to older music recently
    // Normalize: 3+ years backward = max signal
    const score = Math.max(0, Math.min(1, 0.5 + (drift / 6)));

    let evidence = null;
    if (drift >= 2) {
        evidence = {
            emoji: '🕰️',
            text: pick([
                `Your recent listens average <strong>${Math.round(shortAvg)}</strong> while your all-time favorites are from <strong>${Math.round(longAvg)}</strong>. You're time-traveling emotionally.`,
                `You're listening to music from <strong>${Math.round(shortAvg)}</strong> on average. That's a nostalgia spiral.`,
                `Your current rotation is <strong>${Math.round(drift)} years</strong> behind your long-term taste. That's called yearning.`,
                `Average release year of your recent tracks: <strong>${Math.round(shortAvg)}</strong>. You're sonically living in the past.`,
            ]),
        };
    } else if (drift <= -2) {
        evidence = {
            emoji: '🦋',
            text: pick([
                `You've been exploring newer music (avg <strong>${Math.round(shortAvg)}</strong> vs your usual <strong>${Math.round(longAvg)}</strong>). New chapter energy.`,
                `Your recent picks are <strong>${Math.round(Math.abs(drift))} years</strong> ahead of your typical taste. Identity refresh detected.`,
            ]),
        };
    }

    return { score, evidence };
}

// ─── MODULE D: AUDIO FEATURES (30%) ─────────
// Music-theory-grounded signals from Spotify's Audio Features API
// Valence, energy, mode, danceability, acousticness — the actual emotional content

// Helper: get audio features for a track array, returns array of feature objects
function getFeatures(tracks, audioFeatures) {
    return tracks
        .map(t => audioFeatures.get(t.id || t.track?.id))
        .filter(Boolean);
}

// Signal 10: Emotional Valence Profile (18%)
function computeValenceProfile(allTracks, audioFeatures) {
    const features = getFeatures(allTracks, audioFeatures);

    if (features.length === 0) {
        return { score: 0.5, evidence: null };
    }

    // Compute averages
    const avg = (arr, key) => arr.reduce((s, f) => s + (f[key] || 0), 0) / arr.length;
    const avgValence = avg(features, 'valence');
    const avgEnergy = avg(features, 'energy');
    const avgDanceability = avg(features, 'danceability');
    const avgAcousticness = avg(features, 'acousticness');
    const minorRatio = features.filter(f => f.mode === 0).length / features.length;

    // Composite single-energy score
    // Low valence, low danceability, low energy, high acousticness, minor key = single
    const singleEnergy =
        (1 - avgValence) * 0.40 +
        (1 - avgDanceability) * 0.20 +
        (1 - avgEnergy) * 0.15 +
        avgAcousticness * 0.10 +
        minorRatio * 0.15;

    const score = Math.max(0, Math.min(1, singleEnergy));

    // Count emotionally extreme tracks
    const sadTracks = features.filter(f => f.valence < 0.25);
    const happyTracks = features.filter(f => f.valence > 0.7);
    const minorTracks = features.filter(f => f.mode === 0);

    let evidence = null;
    if (avgValence < 0.3) {
        evidence = {
            emoji: '📉',
            text: pick([
                `Your music's happiness score is <strong>${Math.round(avgValence * 100)}%</strong>. That's clinically sad.`,
                `We measured the emotional tone of your top tracks. Average happiness: <strong>${Math.round(avgValence * 100)}%</strong>. Spotify is concerned.`,
                `<strong>${sadTracks.length}</strong> of your top tracks are emotionally dark. That's not a playlist, that's a therapy session.`,
                `Your music's emotional positivity sits at <strong>${Math.round(avgValence * 100)}%</strong>. Below 30% is what researchers call "concerning".`,
                `Happiness: <strong>${Math.round(avgValence * 100)}%</strong>. Intensity: <strong>${Math.round(avgEnergy * 100)}%</strong>. You're literally listening to sadness at low volume.`,
            ]),
        };
    } else if (avgValence > 0.6) {
        evidence = {
            emoji: '☀️',
            text: pick([
                `Your music's happiness score is <strong>${Math.round(avgValence * 100)}%</strong>. Disgustingly cheerful.`,
                `<strong>${happyTracks.length}</strong> of your top tracks are emotionally positive. Someone's in a good place.`,
                `Emotional tone: <strong>${Math.round(avgValence * 100)}% happy</strong>. That's couple energy or serious denial.`,
            ]),
        };
    } else if (minorRatio > 0.65) {
        evidence = {
            emoji: '🎹',
            text: pick([
                `<strong>${Math.round(minorRatio * 100)}%</strong> of your tracks use sad-sounding scales. You're literally tuned to melancholy.`,
                `Most of your music is written in emotionally heavy keys. The sound itself says you're going through it.`,
                `<strong>${minorTracks.length}</strong> out of ${features.length} tracks use darker musical tones. That ratio is telling.`,
            ]),
        };
    } else if (avgDanceability < 0.4) {
        evidence = {
            emoji: '🪑',
            text: pick([
                `Only <strong>${Math.round(avgDanceability * 100)}%</strong> of your music is danceable. This is "staring at the ceiling" music.`,
                `Your music's groove factor is <strong>${Math.round(avgDanceability * 100)}%</strong>. It doesn't want to move and neither do you.`,
            ]),
        };
    } else if (avgDanceability > 0.7) {
        evidence = {
            emoji: '💃',
            text: pick([
                `<strong>${Math.round(avgDanceability * 100)}%</strong> of your music is danceable. You're either going out or getting ready to.`,
                `Your music's groove factor: <strong>${Math.round(avgDanceability * 100)}%</strong>. That's pre-game energy.`,
            ]),
        };
    }

    return { score, evidence };
}

// Signal 11: Emotional Drift (12%)
// Compares valence/energy of short-term vs long-term tracks
function computeEmotionalDrift(shortTracks, longTracks, audioFeatures) {
    const shortFeatures = getFeatures(shortTracks, audioFeatures);
    const longFeatures = getFeatures(longTracks, audioFeatures);

    if (shortFeatures.length < 5 || longFeatures.length < 5) {
        return { score: 0.5, evidence: null };
    }

    const avg = (arr, key) => arr.reduce((s, f) => s + (f[key] || 0), 0) / arr.length;

    const shortValence = avg(shortFeatures, 'valence');
    const longValence = avg(longFeatures, 'valence');
    const shortEnergy = avg(shortFeatures, 'energy');
    const longEnergy = avg(longFeatures, 'energy');

    // Negative drift (getting sadder) = single direction
    const valenceDrift = longValence - shortValence; // positive = sadder recently
    const energyDrift = longEnergy - shortEnergy;     // positive = less energetic recently

    // Weighted combination
    const drift = valenceDrift * 0.7 + energyDrift * 0.3;
    // Normalize: a drift of 0.15+ = strong signal
    const score = Math.max(0, Math.min(1, 0.5 + (drift / 0.3) * 0.35));

    let evidence = null;
    const valenceChange = Math.round((shortValence - longValence) * 100);
    const energyChange = Math.round((shortEnergy - longEnergy) * 100);

    if (valenceDrift > 0.08) {
        evidence = {
            emoji: '📊',
            text: pick([
                `Your music got <strong>${Math.abs(valenceChange)}% sadder</strong> in the last month. The vibe shift is real.`,
                `Your recent tracks are <strong>${Math.abs(valenceChange)}%</strong> less happy than your usual taste. Something happened.`,
                `We analyzed the emotional tone of your music over time. It dropped <strong>${Math.abs(valenceChange)}%</strong> recently. We noticed.`,
                `Your music's mood has been declining — down <strong>${Math.abs(valenceChange)}%</strong> from your baseline. The data doesn't lie.`,
                `Emotional trajectory: <strong>📉 declining</strong>. Your music's happiness dropped <strong>${Math.abs(valenceChange)}%</strong> recently.`,
            ]),
        };
    } else if (valenceDrift < -0.08) {
        evidence = {
            emoji: '📈',
            text: pick([
                `Your music got <strong>${Math.abs(valenceChange)}% happier</strong> recently. Either new love or a really good week.`,
                `Your recent tracks sound <strong>${Math.abs(valenceChange)}%</strong> more upbeat than your usual taste. Emotional glow-up detected.`,
                `Your music's mood is <strong>${Math.abs(valenceChange)}%</strong> more positive than your baseline. Something good is happening.`,
            ]),
        };
    } else if (Math.abs(energyDrift) > 0.1) {
        const dir = energyDrift > 0 ? 'mellower' : 'more intense';
        evidence = {
            emoji: energyDrift > 0 ? '🔋' : '⚡',
            text: pick([
                `Your music got <strong>${Math.abs(energyChange)}% ${dir}</strong> recently. That kind of shift tracks with mood changes.`,
                `Your listening intensity shifted <strong>${Math.abs(energyChange)}%</strong> — your tracks are noticeably ${dir} than usual.`,
            ]),
        };
    }

    return { score, evidence };
}

// ─── EVIDENCE TRACKS ────────────────────────
// Instead of manufactured per-track scores, show behavioral evidence.
// Each tag is 100% verifiable from the Spotify data:
//   🔁 repeat obsession — track appears 2+ times in recently played
//   🌙 late-night listen — played between 11pm–4am
//   🆕 new discovery — in short-term but not medium or long
//   💎 comfort track — in all 3 time ranges
//   🕰️ rediscovered — in short + long but dropped from medium

function findEvidenceTracks(tracks, data) {
    // Count plays and late-night plays from recently played
    const recentCounts = {};
    const lateNightHours = {};
    (data.recentlyPlayed || []).forEach(item => {
        const id = item.track?.id;
        if (id) {
            recentCounts[id] = (recentCounts[id] || 0) + 1;
            if (item.played_at) {
                const hour = new Date(item.played_at).getHours();
                if (hour >= 23 || hour <= 4) {
                    lateNightHours[id] = hour;
                }
            }
        }
    });

    // Which time ranges each track appears in
    const shortIds = new Set(data.topTracksShort.map(t => t.id));
    const medIds = new Set(data.topTracksMedium.map(t => t.id));
    const longIds = new Set(data.topTracksLong.map(t => t.id));

    const results = [];
    const seen = new Set();

    for (const track of tracks) {
        if (!track?.id || seen.has(track.id)) continue;
        seen.add(track.id);

        let tag = null;

        // Priority 1: repeat obsession (strongest behavioral signal)
        const repeats = recentCounts[track.id] || 0;
        if (repeats >= 2) {
            tag = { emoji: '💿', text: `${repeats}x on repeat` };
        }

        // Priority 2: late-night listening
        if (!tag && lateNightHours[track.id] !== undefined) {
            const h = lateNightHours[track.id];
            const timeStr = h === 0 ? '12am' : h <= 4 ? `${h}am` : `${h === 23 ? '11pm' : h - 12 + 'pm'}`;
            tag = { emoji: '🫠', text: `played at ${timeStr}` };
        }

        // Priority 3: new discovery (short-term only)
        if (!tag && shortIds.has(track.id) && !medIds.has(track.id) && !longIds.has(track.id)) {
            tag = { emoji: '🔥', text: 'new this month' };
        }

        // Priority 4: rediscovered (in short + long but not medium)
        if (!tag && shortIds.has(track.id) && !medIds.has(track.id) && longIds.has(track.id)) {
            tag = { emoji: '🥀', text: 'nostalgia pull' };
        }

        results.push({
            name: track.name,
            artist: track.artists?.map(a => a.name).join(', ') || 'Unknown',
            tag,
            hasSignal: tag !== null,
        });
    }

    // Tracks with behavioral signal first, then the rest by original order
    results.sort((a, b) => (b.hasSignal ? 1 : 0) - (a.hasSignal ? 1 : 0));
    const top5 = results.slice(0, 5);

    // Cap tags at 3 to keep the card clean
    let tagCount = 0;
    top5.forEach(t => {
        if (t.tag) {
            tagCount++;
            if (tagCount > 3) { t.tag = null; t.hasSignal = false; }
        }
    });
    return top5;
}

// ─── MAIN ANALYSIS ──────────────────────────

function analyzeRelationship(data) {
    // Merge all artists for genre analysis
    const allArtists = [
        ...data.topArtistsShort,
        ...data.topArtistsMedium,
        ...data.topArtistsLong,
    ];

    // Merge all tracks for audio features analysis
    const allTracks = [
        ...data.topTracksShort,
        ...data.topTracksMedium,
        ...data.topTracksLong,
    ];

    const af = data.audioFeatures || new Map();
    const hasAudioFeatures = af.size > 10; // need meaningful coverage

    // ═══ Behavioral Signals ═══
    const genreMigration = computeGenreMigration(data.topArtistsShort, data.topArtistsLong);
    const lateNight = computeLateNightAnomaly(data.recentlyPlayed);
    const repeatObsession = computeRepeatObsession(
        data.topTracksShort, data.topTracksMedium, data.topTracksLong, data.recentlyPlayed
    );
    const temporalRegression = computeTemporalRegression(data.topTracksShort, data.topTracksLong);

    // ═══ Audio Features (song-level emotional analysis) ═══
    const valenceProfile = computeValenceProfile(allTracks, af);
    const emotionalDrift = computeEmotionalDrift(data.topTracksShort, data.topTracksLong, af);

    // ═══ WEIGHTED AGGREGATE ═══
    let weightedScore;

    if (data.source === 'receiptify') {
        // Receiptify mode: only real data drives the score
        // Deprecated signals (genre, late-night, repeat, emotional drift) = 0% weight
        const popValue = (data.stats?.popularity || 50) / 100;
        const popularitySignal = 0.5 + (0.5 - popValue) * 0.3;

        // Store for results rendering
        data._receiptifySignals = {
            valence: valenceProfile.score,
            temporal: temporalRegression.score,
            popularity: popularitySignal,
        };

        weightedScore =
            valenceProfile.score * 0.75 +       // core emotional DNA
            temporalRegression.score * 0.15 +    // track age → nostalgia
            popularitySignal * 0.10;             // mainstream vs niche
    } else if (hasAudioFeatures) {
        // Spotify primary mode: audio features are the backbone
        weightedScore =
            valenceProfile.score * 0.32 +
            emotionalDrift.score * 0.23 +
            lateNight.score * 0.15 +
            genreMigration.score * 0.12 +
            repeatObsession.score * 0.10 +
            temporalRegression.score * 0.08;
    } else {
        // Spotify fallback: no audio features, boost behavioral signals
        weightedScore =
            genreMigration.score * 0.30 +
            lateNight.score * 0.25 +
            repeatObsession.score * 0.20 +
            temporalRegression.score * 0.15 +
            valenceProfile.score * 0.05 +
            emotionalDrift.score * 0.05;
    }

    const finalScore = Math.round(weightedScore * 1000) / 10;
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    // ═══ Evidence tracks for tracklist (default: short-term) ═══
    const topTracks = findEvidenceTracks(data.topTracksShort, data);

    // Collect evidence (max 5, prioritize non-null, most impactful)
    const allEvidence = [
        valenceProfile.evidence,
        emotionalDrift.evidence,
        genreMigration.evidence,
        lateNight.evidence,
        repeatObsession.evidence,
        temporalRegression.evidence,
    ].filter(Boolean);

    // Find strongest signal (largest deviation from 0.5)
    const signals = [
        { name: 'Sadness Score', score: valenceProfile.score },
        { name: 'Mood Trajectory', score: emotionalDrift.score },
        { name: 'Vibe Shift', score: genreMigration.score },
        { name: 'Late-Night Listening', score: lateNight.score },
        { name: 'Repeat Obsession', score: repeatObsession.score },
        { name: 'Nostalgia Spiral', score: temporalRegression.score },
    ];
    const strongest = signals.reduce((best, s) =>
        Math.abs(s.score - 0.5) > Math.abs(best.score - 0.5) ? s : best
    );

    // Confidence = how far the raw score is from the 50/50 midpoint.
    // Score 0 or 100 → 100% confident. Score 50 → 0% confident.
    const confidence = Math.round(Math.abs(clampedScore - 50) * 20) / 10;

    return {
        score: clampedScore,
        confidence: Math.min(100, confidence),
        evidence: allEvidence.slice(0, 5),
        topTracks,
        strongestSignal: strongest.name,
        strongestDeviation: Math.round(Math.abs(strongest.score - 0.5) * 200),
        ...getVerdict(clampedScore),
    };
}


function getVerdict(score) {
    // Taken-leaning verdicts
    if (score <= 15) return {
        prediction: 'Taken',
        verdict: 'Obnoxiously Taken',
        tagline: pick(["We get it, you're in love", "Save some love for the rest of us", "The aux is shared custody"]),
    };
    if (score <= 30) return {
        prediction: 'Taken',
        verdict: 'Happily Taken',
        tagline: pick(["'Good morning' text energy", "Zero games, all vibes", "Disgustingly domestic"]),
    };
    // Ambiguous zone
    if (score <= 42) return {
        prediction: 'Taken...ish',
        verdict: "It's Complicated",
        tagline: pick(["Situationship much?", "Soft launch, no hard launch", "One foot in, one foot out"]),
    };
    if (score <= 58) return {
        prediction: '???',
        verdict: "It's Complicated",
        tagline: pick(["Red flags? You collect those", "Emotionally unavailable era", "You reply in exactly 47 minutes"]),
    };
    // Single-leaning verdicts
    if (score <= 72) return {
        prediction: 'Single',
        verdict: 'Freshly Single',
        tagline: pick(["Permanent talking stage", "Got that 'I'm fine' energy", "Hot girl summer in February"]),
    };
    if (score <= 85) return {
        prediction: 'Single',
        verdict: 'Painfully Single',
        tagline: pick(["Love language: overthinking", "Down bad, algorithm knows it", "Main character syndrome"]),
    };
    return {
        prediction: 'Single',
        verdict: 'Chronically Single',
        tagline: pick(["Even your Spotify is a red flag", "Touch grass, then someone's hand", "Longest relationship: a playlist"]),
    };
}


// ─── UI CONTROLS ─────────────────────────────

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

const LOADING_MESSAGES = [
    'scanning for red flags...',
    'calculating emotional damage...',
    'checking if you\'re okay (you\'re not)...',
    'reading your 3am listening history...',
    'analyzing your cry playlist...',
    'consulting your top artists...',
    'measuring situationship energy...',
    'counting sad songs...',
    'judging your taste (respectfully)...',
    'compiling the evidence...',
    'analyzing audio valence patterns...',
    'checking if your music is in a minor key...',
];

function startLoadingAnimation() {
    let msgIndex = 0;
    let imgIndex = 0;
    let progress = 0;
    const statusEl = document.getElementById('loading-status');
    const barEl = document.getElementById('loading-bar');
    const scanImgs = document.querySelectorAll('.scan-img');

    const msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
        statusEl.style.opacity = 0;
        setTimeout(() => {
            statusEl.textContent = LOADING_MESSAGES[msgIndex];
            statusEl.style.opacity = 1;
        }, 200);

        // Crossfade to next image
        if (scanImgs.length > 0) {
            scanImgs[imgIndex].classList.remove('active');
            imgIndex = (imgIndex + 1) % scanImgs.length;
            scanImgs[imgIndex].classList.add('active');
        }
    }, 1800);

    const barInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 12, 90);
        barEl.style.width = progress + '%';
    }, 400);

    return { msgInterval, barInterval, barEl };
}

function stopLoadingAnimation({ msgInterval, barInterval, barEl }) {
    clearInterval(msgInterval);
    clearInterval(barInterval);
    barEl.style.width = '100%';
}

function renderResults(result) {
    showView('results');

    // Set the prediction label
    const labelEl = document.getElementById('results-label');
    if (labelEl) {
        labelEl.textContent = 'OUR DIAGNOSIS:';
    }

    // Verdict badge is now the big star
    document.getElementById('verdict-badge').textContent = result.verdict;
    document.getElementById('verdict-tagline').textContent = `"${result.tagline}"`;

    // Animate score counter — shows raw score (0 = taken, 100 = single)
    const scoreEl = document.getElementById('score-number');
    const target = result.score;
    let current = 0;
    const duration = 1500;
    const startTime = performance.now();

    function animateScore(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        current = Math.round(eased * target * 10) / 10;
        scoreEl.textContent = current.toFixed(1);
        if (progress < 1) requestAnimationFrame(animateScore);
    }
    requestAnimationFrame(animateScore);

    // Meter fill — still shows raw score position on the taken↔single spectrum
    setTimeout(() => {
        document.getElementById('meter-fill').style.width = result.score + '%';
    }, 200);

    // Tracklist or stats breakdown
    if (window.__receiptifyMode) {
        renderReceiptifyStats();
    } else {
        renderTracklist(result.topTracks);
    }

    // Store for sharing and tab switching
    window.__result = result;
}

// Generate roast-style behavioral insights from stat combinations
function generateInsights(stats) {
    const s = stats;
    const h = s.happiness || 50, e = s.energy || 50, d = s.danceability || 50;
    const a = s.acousticness || 50, age = s.trackAge || 3, pop = s.popularity || 50;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const candidates = [];

    // ═══════════════════════════════════════════════
    //  EMOTIONAL — mood combos from happiness × energy × acousticness
    // ═══════════════════════════════════════════════

    if (h < 30 && a > 60)
        candidates.push({ cat: 'emotional', emoji: '🌙', title: 'LATE NIGHT SPIRAL ENERGY',
            text: pick([
                'Low happiness meets heavy acoustic vibes — the sad-girl pipeline is real. You\'re not just single, you\'re processing.',
                'This is "staring at the ceiling with one earbud in" music. The vibes are devastated.',
                'Barely any joy but drowning in acoustic tracks? That\'s journaling-by-candlelight-at-2am behavior.',
            ]), weight: (30 - h) + (a - 60) });

    if (h < 35 && e > 60)
        candidates.push({ cat: 'emotional', emoji: '🔥', title: 'RAGE MODE ACTIVATED',
            text: pick([
                'Miserable but amped up? That\'s angry breakup anthems on repeat. Someone did you wrong and the aux cord knows it.',
                'You\'re not sad, you\'re furious. This is "blocked their number but kept the playlist" energy.',
                'Your mood is in the gutter but your energy is through the roof. This is a villain origin story soundtrack.',
            ]), weight: (35 - h) + (e - 60) });

    if (h < 25 && e < 30)
        candidates.push({ cat: 'emotional', emoji: '🛏️', title: 'FULL SHUTDOWN',
            text: pick([
                'Rock-bottom happiness AND zero energy. You\'re in bed-rot era and we\'re not judging (we are).',
                'Everything is turned down to zero. This is "haven\'t opened the blinds in three days" music.',
                'Your mood and your energy are both on the floor. Babe, are you okay? Genuinely asking.',
            ]), weight: (25 - h) + (30 - e) });

    if (h < 35 && d > 55)
        candidates.push({ cat: 'emotional', emoji: '🎭', title: 'DANCING THROUGH THE PAIN',
            text: pick([
                'Sad but still dancing? Classic deflection. The body moves but the soul is somewhere else entirely.',
                'Your mood says "stay in bed" but your playlist says "get on the dance floor." Crying in the club is a real thing and you\'re living it.',
                'The music moves but the heart doesn\'t. You\'re masking with rhythm and we see right through it.',
            ]), weight: (35 - h) + (d - 55) * 0.7 });

    if (h < 40 && a < 20 && e > 60)
        candidates.push({ cat: 'emotional', emoji: '⚡', title: 'ELECTRONIC DOOM SCROLL',
            text: pick([
                'Unhappy with nothing acoustic and tons of energy. You\'re numbing yourself with bass drops and that\'s honestly valid.',
                'Pure synthetic energy fueling a bad mood. This is headphones-in-don\'t-talk-to-me music.',
            ]), weight: (40 - h) + (20 - a) * 0.5 + (e - 60) * 0.5 });

    if (h > 70 && e > 70)
        candidates.push({ cat: 'emotional', emoji: '✨', title: 'DANGEROUSLY HAPPY',
            text: pick([
                'Your mood and energy are both sky-high. Either life is genuinely great or this is an elaborate front. We\'re choosing to believe you.',
                'You\'re radiating serotonin. This is "just got a text back immediately" energy.',
                'Thriving mood, thriving energy. The algorithm thinks you might actually be... happy? Suspicious but we\'ll allow it.',
            ]), weight: (h - 70) + (e - 70) });

    if (h > 65 && a > 60)
        candidates.push({ cat: 'emotional', emoji: '☕', title: 'COZY RELATIONSHIP VIBES',
            text: pick([
                'Happy AND acoustic? That\'s "cooking dinner together with the speaker on" energy. Disgustingly domestic.',
                'Content vibes with lots of acoustic warmth. This is farmer\'s market on Saturday morning music. You probably hold hands in public.',
                'Acoustic and content? You either just fell in love or you own multiple houseplants. Possibly both.',
            ]), weight: (h - 65) + (a - 60) });

    if (h > 60 && e < 35 && a > 50)
        candidates.push({ cat: 'emotional', emoji: '🧘', title: 'PEACEFUL BUT SUSPICIOUS',
            text: pick([
                'Happy but mellow and acoustic? This is either genuine inner peace or beautiful disassociation. Hard to tell.',
                'Calm, content, and stripped-back. Either you\'ve figured life out or you\'re really good at pretending.',
            ]), weight: (h - 60) * 0.5 + (35 - e) * 0.5 + (a - 50) * 0.3 });

    if (h >= 40 && h <= 55 && e >= 40 && e <= 55)
        candidates.push({ cat: 'emotional', emoji: '😶', title: 'THE GREAT NUMBNESS',
            text: pick([
                'Not sad, not happy. Not energetic, not tired. You\'re emotionally beige and the music proves it.',
                'Your mood is flatlined in the middle. No highs, no lows. Just vibes in the most neutral sense of the word.',
            ]), weight: 12 - Math.abs(h - 47) * 0.3 - Math.abs(e - 47) * 0.3 });

    // ═══════════════════════════════════════════════
    //  BEHAVIORAL — danceability × energy patterns
    // ═══════════════════════════════════════════════

    if (d < 25)
        candidates.push({ cat: 'behavioral', emoji: '🛋️', title: 'NOT LEAVING THE HOUSE',
            text: pick([
                'Your music has basically zero groove. You\'re not going out. You\'re not even pretending to try.',
                'This is "cancelled plans to stay home" personified. Your playlist doesn\'t move and neither do you.',
            ]), weight: 25 - d });

    if (d > 75 && e > 70)
        candidates.push({ cat: 'behavioral', emoji: '🎉', title: 'GOING OUT ERA',
            text: pick([
                'Max groove, max energy. You\'re either healing through partying or just genuinely fun. Impossible to tell.',
                'Your playlist is begging to be played at a pregame. You\'re the friend who says "just one drink" and closes the bar.',
                'This is pre-game playlist energy. You\'re going out and you\'re making it everyone\'s problem.',
            ]), weight: (d - 75) + (e - 70) });

    if (d > 70 && e > 65 && h > 60)
        candidates.push({ cat: 'behavioral', emoji: '💃', title: 'MAIN CHARACTER DELUSION',
            text: pick([
                'Happy, energetic, and danceable. You think the world is your music video and honestly? Maybe it is.',
                'Everything about your music says "protagonist energy." You walk in slow motion to your own soundtrack and we respect it.',
            ]), weight: (d - 70) * 0.5 + (e - 65) * 0.3 + (h - 60) * 0.3 });

    if (e > 75 && d < 40)
        candidates.push({ cat: 'behavioral', emoji: '🏋️', title: 'GYM PLAYLIST DETECTED',
            text: pick([
                'Tons of energy but not danceable. This isn\'t for the club — this is for aggressive reps and main-character gym montages.',
                'Your music goes hard but it doesn\'t groove. You\'re lifting, not dancing. We respect the grind.',
            ]), weight: (e - 75) + (40 - d) });

    if (a > 70 && d < 35)
        candidates.push({ cat: 'behavioral', emoji: '📖', title: 'LIBRARY CORE',
            text: pick([
                'Deeply acoustic and barely danceable. You\'re either reading, journaling, or staring out a rain-streaked window. All valid.',
                'Your music lives in quiet rooms. This is "cup of tea and a used bookstore" energy.',
            ]), weight: (a - 70) + (35 - d) });

    if (a < 15 && e > 70 && d > 65)
        candidates.push({ cat: 'behavioral', emoji: '🔊', title: 'BASS FACE LIFESTYLE',
            text: pick([
                'Nothing acoustic, everything cranked. You live for the drop. Your neighbors have filed complaints.',
                'Pure electronic party fuel. If a song has a guitar in it, you skip it. Festival season is your Super Bowl.',
            ]), weight: (15 - a) + (e - 70) * 0.5 + (d - 65) * 0.5 });

    if (e < 25 && d < 25 && a > 50)
        candidates.push({ cat: 'behavioral', emoji: '🫠', title: 'HORIZONTAL LISTENING',
            text: pick([
                'Slow, still, and acoustic. You listen to music exclusively lying down. The couch has your body print.',
                'Your playlist barely has a pulse. This is "melting into the mattress" music and honestly, same.',
            ]), weight: (25 - e) + (25 - d) + (a - 50) * 0.3 });

    if (e > 55 && d > 45 && a < 35)
        candidates.push({ cat: 'behavioral', emoji: '🎧', title: 'COMMUTE MODE',
            text: pick([
                'Good energy, some groove, nothing acoustic. This is headphones-on-train-window music. You\'re zoning out professionally.',
                'Produced, punchy, and forward-moving. This playlist has places to be even if you don\'t.',
            ]), weight: 8 });

    // ═══════════════════════════════════════════════
    //  IDENTITY — acousticness × popularity combos
    // ═══════════════════════════════════════════════

    if (a > 75)
        candidates.push({ cat: 'identity', emoji: '🎸', title: 'INDIE KID ALERT',
            text: pick([
                'Your acousticness is off the charts. You own a tote bag. You have opinions about coffee. We know your type.',
                'You hear a guitar and your brain releases serotonin. This is folk-adjacent at minimum.',
                'Overwhelmingly acoustic. You\'ve said "I liked them before they were popular" unironically.',
            ]), weight: a - 75 });

    if (a < 15)
        candidates.push({ cat: 'identity', emoji: '🤖', title: 'ZERO ACOUSTIC TOLERANCE',
            text: pick([
                'Basically no acoustic anything. If it doesn\'t have production, synths, or autotune, you\'re not interested. Guitar who?',
                'Your ears reject anything organic. It needs to be processed, layered, and louder than your thoughts.',
            ]), weight: 15 - a });

    if (pop < 25)
        candidates.push({ cat: 'identity', emoji: '🕶️', title: 'TOO COOL FOR THE CHARTS',
            text: pick([
                'Your music is deeply underground. It\'s basically a personality trait at this point. And possibly a red flag.',
                'Nobody has heard of what you listen to and that\'s exactly how you like it.',
                'Incredibly niche taste. You don\'t share your playlists because "people wouldn\'t get it."',
            ]), weight: 25 - pop });

    if (pop > 80)
        candidates.push({ cat: 'identity', emoji: '📱', title: 'PLAYLIST NORMIE',
            text: pick([
                'Everything you listen to is charting right now. You listen to whatever Spotify tells you to. Efficient, but we\'re judging slightly.',
                'All your top tracks are mainstream hits. You\'re the target demographic and the algorithm loves you for it.',
                'Ultra-mainstream taste. You and 50 million others have the exact same vibe. The algorithm won.',
            ]), weight: pop - 80 });

    if (pop < 30 && a > 60)
        candidates.push({ cat: 'identity', emoji: '🍂', title: 'UNDERGROUND ACOUSTIC SNOB',
            text: pick([
                'Niche AND acoustic. You\'ve been to a house show in someone\'s living room and it was "a really intimate experience."',
                'Nobody knows your artists and they all play guitar. You\'re one thrifted flannel away from a cliche.',
            ]), weight: (30 - pop) * 0.7 + (a - 60) * 0.5 });

    if (pop > 70 && h > 65 && d > 60)
        candidates.push({ cat: 'identity', emoji: '🌸', title: 'POP GIRLIE ENERGY',
            text: pick([
                'Mainstream, happy, and danceable. You have strong opinions about pop stars and your group chat has a Spotify blend.',
                'Your playlist screams "good vibes only" and you\'re not sorry about it. Pop music was made for people like you.',
            ]), weight: (pop - 70) * 0.3 + (h - 65) * 0.3 + (d - 60) * 0.3 });

    if (pop < 35 && h < 35)
        candidates.push({ cat: 'identity', emoji: '🖤', title: 'SUFFERING IN OBSCURITY',
            text: pick([
                'Underground taste AND miserable mood. You\'re sad and nobody even knows the songs you\'re sad to. That\'s somehow worse.',
                'Niche and unhappy. Your sadness is so specific that no one can even relate to your playlist.',
            ]), weight: (35 - pop) * 0.5 + (35 - h) * 0.5 });

    if (pop >= 35 && pop <= 70 && a >= 15 && a <= 65)
        candidates.push({ cat: 'identity', emoji: '🪞', title: 'MIRROR PLAYLIST',
            text: pick([
                'Not too mainstream, not too niche. Not acoustic, not electronic. Your music perfectly reflects the most non-committal version of you.',
                'Your taste sits right in the middle of everything. It\'s a mirror — it shows exactly who you are, and that person refuses to pick a lane.',
            ]), weight: 5 });

    // ═══════════════════════════════════════════════
    //  NOSTALGIA — track age patterns
    // ═══════════════════════════════════════════════

    if (age > 8)
        candidates.push({ cat: 'nostalgia', emoji: '📼', title: 'TIME CAPSULE',
            text: pick([
                'Your music is ancient by streaming standards. You\'re not listening — you\'re visiting a museum of feelings.',
                'You\'re deep in the archives. This is replaying a version of your life that no longer exists.',
                'That\'s not a playlist, that\'s an archaeological dig into your emotional history. The songs are vintage at this point.',
            ]), weight: (age - 8) * 6 });

    if (age > 5 && age <= 8)
        candidates.push({ cat: 'nostalgia', emoji: '⏪', title: 'NOSTALGIA TRAP',
            text: pick([
                'Your music is seriously dated. You\'re stuck in a timeline that doesn\'t exist anymore.',
                'Half a decade old at minimum. That\'s "remember when things were simpler?" behavior coded into your listening habits.',
            ]), weight: (age - 5) * 5 });

    if (age > 5 && h < 40)
        candidates.push({ cat: 'nostalgia', emoji: '💭', title: 'BREAKUP ARCHAEOLOGY',
            text: pick([
                'Old music and a low mood. You\'re not just nostalgic, you\'re replaying a specific era. We both know which one.',
                'Digging through old tracks while feeling terrible? You\'re excavating a memory you should probably let go of.',
            ]), weight: (age - 5) * 3 + (40 - h) * 0.5 });

    if (age > 5 && h > 65)
        candidates.push({ cat: 'nostalgia', emoji: '🌅', title: 'GOLDEN AGE ROMANTIC',
            text: pick([
                'Old music but genuinely happy? You found something beautiful back there and you\'re not letting go. Honestly sweet.',
                'Nostalgic and content. You\'re reliving the good times on purpose and it\'s actually working.',
            ]), weight: (age - 5) * 2 + (h - 65) * 0.5 });

    if (age <= 1)
        candidates.push({ cat: 'nostalgia', emoji: '📡', title: 'CHRONICALLY ONLINE',
            text: pick([
                'Your music just dropped. You find songs before they trend. Either you\'re a tastemaker or terminally on TikTok.',
                'Everything in your rotation is brand new. You consume content at the speed of an algorithm. Touch grass? Never heard of her.',
                'Your playlist has a shelf life of about two weeks. You\'re chasing the new and the algorithm is feeding you well.',
            ]), weight: 15 });

    if (age >= 2 && age <= 4)
        candidates.push({ cat: 'nostalgia', emoji: '⏸️', title: 'MILD REWIND TENDENCY',
            text: pick([
                'Your music isn\'t ancient but it\'s not fresh either. You\'re definitely re-listening more than discovering.',
                'A few years old on average. You found your comfort songs and you\'re not letting them go anytime soon.',
            ]), weight: 6 });

    // ═══════════════════════════════════════════════
    //  CROSS-CUTTING — unusual multi-stat combos
    // ═══════════════════════════════════════════════

    if (h > 70 && e > 70 && d > 70 && pop > 70)
        candidates.push({ cat: 'cross', emoji: '🚨', title: 'DANGEROUSLY WELL-ADJUSTED',
            text: 'Every single metric is high. Happy, energetic, danceable, popular. Either you\'re peak human or this is a cry for help disguised as a good time.',
            weight: ((h - 70) + (e - 70) + (d - 70) + (pop - 70)) * 0.3 });

    if (h < 30 && e < 30 && d < 30)
        candidates.push({ cat: 'cross', emoji: '🕳️', title: 'THE VOID',
            text: pick([
                'Everything is in the basement — mood, energy, groove. All bottomed out. This playlist is a wellness check.',
                'Your music has given up. Sad, slow, and still. Sending virtual hugs because the algorithm can\'t.',
            ]), weight: ((30 - h) + (30 - e) + (30 - d)) * 0.4 });

    if (h > 60 && e > 60 && d > 60 && a > 60)
        candidates.push({ cat: 'cross', emoji: '🦋', title: 'MANIC PIXIE PLAYLIST',
            text: 'High everything including acousticness? You\'re living in an indie movie montage and your life has a whimsical soundtrack.',
            weight: ((h - 60) + (e - 60) + (d - 60) + (a - 60)) * 0.2 });

    if (pop < 30 && age <= 1 && e > 50)
        candidates.push({ cat: 'cross', emoji: '🔮', title: 'EARLY ADOPTER ENERGY',
            text: 'Fresh music that nobody listens to? You\'re either three months ahead of every trend or just lost in the algorithm. Time will tell.',
            weight: (30 - pop) * 0.5 + 10 });

    if (a > 65 && e < 30 && h < 40)
        candidates.push({ cat: 'cross', emoji: '🌧️', title: 'RAINY WINDOW AESTHETIC',
            text: pick([
                'Acoustic, slow, and sad. This is "watching raindrops race down the glass" personified. You even sigh musically.',
                'Stripped-back, low-energy, low-mood. Your music sounds like the weather outside when plans get cancelled.',
            ]), weight: (a - 65) * 0.5 + (30 - e) * 0.5 + (40 - h) * 0.3 });

    if (h > 75 && pop > 75 && a < 25)
        candidates.push({ cat: 'cross', emoji: '🎤', title: 'KARAOKE NIGHT ENERGY',
            text: 'Happy, mainstream, nothing acoustic. Your playlist is exclusively bangers that everyone knows the words to. You ARE the aux.',
            weight: (h - 75) * 0.5 + (pop - 75) * 0.5 + (25 - a) * 0.3 });

    if (e > 80 && h < 35)
        candidates.push({ cat: 'cross', emoji: '⚔️', title: 'WEAPONIZED SADNESS',
            text: pick([
                'Sad but intensely energetic. You\'ve turned heartbreak into a workout. Every step on the treadmill is a step away from your ex.',
                'Miserable but wired. You\'re channeling the pain into something aggressive and we kind of admire it.',
            ]), weight: (e - 80) + (35 - h) });

    if (d > 70 && a > 60 && h > 55)
        candidates.push({ cat: 'cross', emoji: '🌻', title: 'BACKYARD PARTY VIBES',
            text: 'Danceable, acoustic, and happy? This is "fairy lights in the backyard with friends" music. You probably own a ukulele.',
            weight: (d - 70) * 0.4 + (a - 60) * 0.4 + (h - 55) * 0.3 });

    if (pop > 40 && pop < 75 && h > 20 && h < 65)
        candidates.push({ cat: 'cross', emoji: '🫥', title: 'ALGORITHMICALLY AVERAGE',
            text: pick([
                'Not too happy, not too sad. Not too niche, not too mainstream. You are the median Spotify user and the algorithm has optimized you.',
                'Your music taste is perfectly calibrated to the center of every spectrum. You are what the algorithm dreams about.',
            ]), weight: 7 });

    if (e > 55 && d > 50 && a < 40)
        candidates.push({ cat: 'cross', emoji: '🚗', title: 'WINDOWS DOWN PLAYLIST',
            text: pick([
                'Energetic, groovy, and produced. This is "driving with the windows down" music. Destination unknown.',
                'Your playlist has momentum. This is the soundtrack to going somewhere — even if it\'s just away from your feelings.',
            ]), weight: 6 });

    if (h < 45 && pop > 40)
        candidates.push({ cat: 'cross', emoji: '🫧', title: 'SAD BUT MAKE IT AESTHETIC',
            text: pick([
                'A little down but your music taste is too polished to call it a crisis. Your sadness has great branding.',
                'Unhappy but not underground about it. You\'re sad to songs people actually know. At least your pain is relatable.',
            ]), weight: 7 });

    // ═══════════════════════════════════════════════
    //  FALLBACKS — ensure everyone gets a read
    // ═══════════════════════════════════════════════

    if (h >= 25 && h <= 70 && e >= 30 && e <= 75)
        candidates.push({ cat: 'cross', emoji: '🧐', title: 'SUSPICIOUSLY NORMAL',
            text: pick([
                'Everything about your listening is middle-of-the-road. Either you\'re perfectly balanced or you\'re hiding something.',
                'Nothing stands out. Everything is centered. You\'re either incredibly well-adjusted or very good at lying.',
                'Your music is an enigma wrapped in a playlist. The algorithm genuinely doesn\'t know what to do with you.',
            ]), weight: 5 });

    if (d > 35 && d < 70 && e > 30 && e < 75)
        candidates.push({ cat: 'behavioral', emoji: '🎲', title: 'CHAMELEON LISTENER',
            text: pick([
                'Your groove and energy live in the middle. You\'re not committing to a vibe — you\'re adapting to whoever\'s around. Social camouflage via playlist.',
                'Not high energy, not low. Not dancey, not still. Your music shifts with the room. You\'re a vibe chameleon.',
            ]), weight: 3 });

    if (h > 20 && h < 55 && pop > 30 && pop < 75)
        candidates.push({ cat: 'identity', emoji: '👻', title: 'THE GHOST PROFILE',
            text: pick([
                'Nothing extreme in your taste. You exist in the algorithm\'s blind spot. It can\'t sell you anything and that\'s kind of powerful.',
                'Your listening profile is hard to pin down. You\'re not a type — you\'re a mystery the algorithm can\'t crack.',
            ]), weight: 3 });

    // ═══════════════════════════════════════════════
    //  PICKER — top 4, max 2 per category, deduplicate themes
    // ═══════════════════════════════════════════════
    candidates.sort((a, b) => b.weight - a.weight);
    const picked = [];
    const catCount = {};
    const usedTitles = new Set();
    for (const c of candidates) {
        if (picked.length >= 4) break;
        const cc = catCount[c.cat] || 0;
        if (cc >= 2) continue;
        // Skip if a thematically similar card was already picked
        if (usedTitles.has(c.title)) continue;
        picked.push(c);
        catCount[c.cat] = cc + 1;
        usedTitles.add(c.title);
    }
    return picked;
}

// Render insights + signal breakdown for Receiptify mode (replaces tracklist)
function renderReceiptifyStats() {
    const data = window.__spotifyData;
    if (!data?.stats) return;

    // Hide period tabs (no multi-period data)
    const tabsEl = document.querySelector('.period-tabs');
    if (tabsEl) tabsEl.style.display = 'none';

    // Change section title
    const titleEl = document.querySelector('.tracklist-title');
    if (titleEl) titleEl.textContent = '\uD83D\uDD2E THE READ';

    const tracklistEl = document.getElementById('tracklist');
    if (!tracklistEl) return;
    tracklistEl.replaceChildren();
    tracklistEl.style.minHeight = 'auto';
    tracklistEl.style.maxHeight = 'none';

    // ─── ROAST INSIGHTS ───
    const insights = generateInsights(data.stats);
    insights.forEach((insight, i) => {
        const card = document.createElement('div');
        card.className = 'tracklist-row insight-card';
        card.style.animationDelay = `${0.6 + i * 0.2}s`;

        const emoji = document.createElement('span');
        emoji.className = 'stat-emoji';
        emoji.textContent = insight.emoji;

        const body = document.createElement('div');
        body.className = 'insight-body';
        const title = document.createElement('span');
        title.className = 'insight-title';
        title.textContent = insight.title;
        const text = document.createElement('span');
        text.className = 'insight-text';
        text.textContent = insight.text;
        body.append(title, text);

        card.append(emoji, body);
        tracklistEl.appendChild(card);
    });
}

// Render the tracklist rows into the DOM
function renderTracklist(tracks) {
    const tracklistEl = document.getElementById('tracklist');
    if (!tracklistEl) return;
    tracklistEl.innerHTML = '';
    if (!tracks || tracks.length === 0) return;

    tracks.forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'tracklist-row';
        const tagHtml = t.tag
            ? `<span class="tracklist-evidence">${t.tag.emoji} ${t.tag.text}</span>`
            : '';
        row.innerHTML = `
            <span class="tracklist-rank">${String(i + 1).padStart(2, '0')}</span>
            <div class="tracklist-info">
                <span class="tracklist-name">${t.name}</span>
                <span class="tracklist-artist">${t.artist}</span>
            </div>
            ${tagHtml}
        `;
        tracklistEl.appendChild(row);
    });
}

// Switch time period tab — recalculates score and re-renders
function switchPeriod(period) {
    const data = window.__spotifyData;
    if (!data) return;

    // Receiptify mode: no multi-period data, tabs are hidden
    if (data.source === 'receiptify') return;

    const trackMap = {
        short: data.topTracksShort,
        medium: data.topTracksMedium,
        long: data.topTracksLong,
    };
    const artistMap = {
        short: data.topArtistsShort,
        medium: data.topArtistsMedium,
        long: data.topArtistsLong,
    };
    const tracks = trackMap[period] || data.topTracksShort;
    const artists = artistMap[period] || data.topArtistsShort;

    // Re-find evidence tracks for this period
    const evidence = findEvidenceTracks(tracks, data);
    renderTracklist(evidence);

    // ─── Per-period score: entirely derived from THIS period's data ───
    // Unlike the initial analysis which blends behavioral + audio signals,
    // the per-period score uses ONLY period-specific data so it actually
    // differs between tabs.
    const af = data.audioFeatures || new Map();

    // 1. Valence Profile — purely from this period's tracks
    const valenceProfile = computeValenceProfile(tracks, af);

    // 2. Emotional Drift — this period vs a different baseline
    //    short→long, medium→long, long→medium
    const driftBaseline = period === 'long' ? data.topTracksMedium : data.topTracksLong;
    const emotionalDrift = computeEmotionalDrift(tracks, driftBaseline, af);

    // 3. Genre profile — this period's artists vs opposite baseline
    const genreFrom = artists;
    const genreTo = period === 'long' ? data.topArtistsShort : data.topArtistsLong;
    const genreMigration = computeGenreMigration(genreFrom, genreTo);

    // 4. Temporal regression — this period's tracks vs long-term
    //    For 'long', compare against short to avoid self-comparison
    const temporalBaseline = period === 'long' ? data.topTracksShort : data.topTracksLong;
    const temporalRegression = computeTemporalRegression(tracks, temporalBaseline);

    // Weighted combination — ALL inputs are period-specific
    const weightedScore =
        valenceProfile.score * 0.40 +
        emotionalDrift.score * 0.25 +
        genreMigration.score * 0.20 +
        temporalRegression.score * 0.15;

    console.log(`[switchPeriod] period=${period}`, {
        valence: valenceProfile.score.toFixed(3),
        drift: emotionalDrift.score.toFixed(3),
        genre: genreMigration.score.toFixed(3),
        temporal: temporalRegression.score.toFixed(3),
        weighted: weightedScore.toFixed(3),
        tracks: tracks.length,
        afSize: af.size,
    });

    const finalScore = Math.round(weightedScore * 1000) / 10;
    const newScore = Math.max(0, Math.min(100, finalScore));

    // Animate score from current to new
    const scoreEl = document.getElementById('score-number');
    const startVal = parseFloat(scoreEl.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();

    function animateScore(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (newScore - startVal) * eased;
        scoreEl.textContent = (Math.round(current * 10) / 10).toFixed(1);
        if (progress < 1) requestAnimationFrame(animateScore);
    }
    requestAnimationFrame(animateScore);

    // Update meter
    document.getElementById('meter-fill').style.width = newScore + '%';

    // Update tabs
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.period === period);
    });

    // Update stored result (score for sharing, verdict stays locked)
    if (window.__result) {
        window.__result.topTracks = evidence;
        window.__result.score = newScore;
    }
}

function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function showShareOverlay(blob, filename) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.85);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 20px; padding: 24px;
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
    `;

    // Image preview
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.style.cssText = `
        max-width: 85%; max-height: 55vh;
        border-radius: 16px;
        box-shadow: 0 0 40px rgba(255, 58, 242, 0.4);
    `;
    overlay.appendChild(img);

    // Share button — THIS tap is the fresh gesture
    const shareBtn = document.createElement('button');
    shareBtn.textContent = '📤 TAP TO SHARE';
    shareBtn.style.cssText = `
        padding: 16px 48px;
        background: linear-gradient(135deg, #FF3AF2, #6B2FA0, #00F5D4);
        color: white; border: 3px solid #FFE74C;
        border-radius: 9999px; font-family: 'Outfit', sans-serif;
        font-size: 1.1rem; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.1em;
        cursor: pointer;
    `;
    shareBtn.addEventListener('click', async () => {
        try {
            const file = new File([blob], filename, { type: 'image/png' });
            await navigator.share({ files: [file] });
            showToast('Shared! 🎉');
        } catch (e) {
            if (e.name === 'AbortError') { /* user cancelled */ }
            else {
                // Last resort: download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Saved! Open Instagram to share 📸');
            }
        }
        overlay.remove();
    });
    overlay.appendChild(shareBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ CLOSE';
    closeBtn.style.cssText = `
        padding: 10px 24px; background: transparent;
        color: rgba(255,255,255,0.6); border: 2px solid rgba(255,255,255,0.2);
        border-radius: 9999px; font-family: 'Outfit', sans-serif;
        font-size: 0.8rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.1em;
        cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
}
async function saveCardAsImage() {
    const btn = document.querySelector('.share-link');
    const originalText = btn.textContent;
    btn.textContent = 'generating...';
    btn.style.pointerEvents = 'none';

    try {
        const result = window.__result;
        if (!result) throw new Error('No result data');

        // Target the wrapper div, not the card itself.
        // This lets us inject depth-layer divs BEHIND the card in the cloned DOM.
        const target = document.getElementById('share-target');

        const canvas = await html2canvas(target, {
            backgroundColor: null, // transparent PNG
            scale: 3, // 3× for crisp rendering on stories (280×3 = 840px wide)
            useCORS: true,
            logging: false,
            onclone: (clonedDoc) => {
                const wrapper = clonedDoc.getElementById('share-target');
                const card = clonedDoc.getElementById('results-card');

                // Force body/html transparent
                clonedDoc.documentElement.style.background = 'transparent';
                clonedDoc.body.style.background = 'transparent';

                // Wrapper — sized for header-only card
                wrapper.style.cssText = `
                    display: inline-block;
                    width: fit-content;
                    position: relative;
                    padding: 0;
                    background: transparent;
                    max-width: 380px;
                `;

                // Card — on-screen PM pink, no dark theme
                card.style.backdropFilter = 'none';
                card.style.webkitBackdropFilter = 'none';
                card.style.background = 'rgba(253, 232, 239, 0.95)';
                card.style.boxShadow = 'none';
                card.style.border = '4px solid #E8233B';
                card.style.borderRadius = '16px';
                card.style.padding = '28px 24px 20px';
                card.style.overflow = 'hidden';
                card.style.position = 'relative';
                card.style.zIndex = '3';
                card.style.width = '380px';

                // Hide tracklist/read section — card is header-only
                const tracklistSection = card.querySelector('.tracklist-section');
                if (tracklistSection) tracklistSection.style.display = 'none';

                // Fix meter — html2canvas can't resolve CSS vars/animations
                const realFill = document.getElementById('meter-fill');
                const clonedFill = clonedDoc.getElementById('meter-fill');
                const clonedTrack = card.querySelector('.meter-track');
                if (clonedTrack) {
                    clonedTrack.style.cssText = `
                        height: 14px;
                        border-radius: 9999px;
                        border: 4px solid #7A1029;
                        background: rgba(245, 181, 200, 0.5);
                        overflow: hidden;
                        margin-bottom: 8px;
                    `;
                }
                if (clonedFill) {
                    const fillWidth = realFill ? realFill.style.width : '50%';
                    clonedFill.style.cssText = `
                        width: ${fillWidth};
                        height: 100%;
                        border-radius: 9999px;
                        background: linear-gradient(90deg, #7A1029, #E8233B, #F5B5C8, #E8233B);
                        background-size: 100% 100%;
                        animation: none;
                        transition: none;
                    `;
                }

                // Minimal export styles — PM on-screen colors, no dark theme
                const style = clonedDoc.createElement('style');
                style.textContent = `
                    * { animation: none !important; transition: none !important; box-sizing: border-box !important; }
                    .results-card::before, .results-card::after { display: none !important; }

                    .results-header { margin-bottom: 12px !important; }
                    .results-label {
                        font-size: 0.85rem !important;
                        margin-bottom: 6px !important;
                        letter-spacing: 0.2em !important;
                        color: #7A1029 !important;
                    }
                    .verdict-badge {
                        font-size: 1.3rem !important;
                        padding: 10px 28px !important;
                        margin-bottom: 8px !important;
                        background: linear-gradient(135deg, #E8233B, #7A1029) !important;
                        border: 4px solid #E8233B !important;
                        border-radius: 9999px !important;
                        color: #fff !important;
                        line-height: 1.2 !important;
                    }
                    .verdict-tagline {
                        font-size: 0.95rem !important;
                        margin-bottom: 4px !important;
                        color: rgba(122, 16, 41, 0.85) !important;
                    }
                    .score-display { margin-bottom: 4px !important; }
                    .score-number {
                        font-size: 3rem !important;
                        line-height: 1 !important;
                        color: #7A1029 !important;
                        text-shadow: 2px 2px 0px rgba(122, 16, 41, 0.4) !important;
                        -webkit-text-stroke: 0 !important;
                    }
                    .score-percent {
                        font-size: 1.5rem !important;
                        color: #E8233B !important;
                        text-shadow: 1px 1px 0px rgba(122, 16, 41, 0.3) !important;
                    }
                    .confidence-label {
                        font-size: 0.65rem !important;
                        margin-bottom: 6px !important;
                        color: rgba(122, 16, 41, 0.5) !important;
                        letter-spacing: 0.25em !important;
                    }
                    .results-meter { margin-bottom: 4px !important; }
                    .meter-labels {
                        font-size: 0.6rem !important;
                        color: rgba(122, 16, 41, 0.5) !important;
                    }

                    /* Hide tracklist, keep footer */
                    .tracklist-section { display: none !important; }
                    .results-footer {
                        margin-top: 12px !important;
                        padding-top: 12px !important;
                        border-top: 3px dotted #F5B5C8 !important;
                    }
                    .footer-tag {
                        font-size: 0.6rem !important;
                        color: rgba(122, 16, 41, 0.4) !important;
                    }
                `;
                clonedDoc.head.appendChild(style);

            },
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
        const filename = `cuffedornot-${(result.verdict || 'result').toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;

        // --- Share / Save logic ---
        // iOS Safari requires a fresh user gesture for navigator.share().
        // By the time html2canvas finishes (~2s), the original tap gesture has expired.
        // Solution: generate the image now, then show a "tap to share" overlay
        // so the user provides a FRESH gesture for the share() call.

        // Desktop: clipboard works without fresh gesture
        if (!('ontouchstart' in window) && navigator.clipboard && window.ClipboardItem) {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast('Copied to clipboard! Paste it anywhere 📋');
                return;
            } catch (e) {
                console.warn('Clipboard failed:', e.name, e.message);
            }
        }

        // Mobile / touch: show share overlay for fresh gesture
        if (navigator.share) {
            showShareOverlay(blob, filename);
            return;
        }

        // Final fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Card saved! Share it on Instagram 📸');

    } catch (err) {
        console.error('Image generation failed:', err);
        showToast('Could not generate image — try a screenshot instead');
    } finally {
        btn.textContent = originalText;
        btn.style.pointerEvents = '';
        btn.disabled = false;
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard! 📋');
    } catch {
        showToast('Couldn\'t copy — try manually');
    }
}

// ─── MAIN FLOW ───────────────────────────────
// No OAuth — user enters Receiptify stats directly on the landing page.
// The flow is: landing → input → loading → results (all on one page).
