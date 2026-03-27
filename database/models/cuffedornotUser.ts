import mongoose, { Schema, Document, Model } from 'mongoose';
import { AudioFeatureAverages, GenreCount } from '@/types/spotify';

export interface ISpotifyTimeRange {
    trackIds: string[];
    artistIds: string[];
    audioFeatureAverages: AudioFeatureAverages;
    topGenres: GenreCount[];
}

export interface ISpotifyData {
    lastAttemptAt?: Date;
    collectedAt?: Date;
    shortTerm?: ISpotifyTimeRange;
    mediumTerm?: ISpotifyTimeRange;
    longTerm?: ISpotifyTimeRange;
}

export interface IScores {
    cuffedOrNotScore?: number;
    verdict?: string;
    tagline?: string;
    confidence?: number;
    esValue?: number;
    rentfrowVector?: number[];
    moodQuadrant?: string;
}

export interface IProfile {
    genderIdentity?: string;
    attractionPreference?: string[];
    openToPlatonic?: boolean;
}

export interface ICuffedOrNotUser extends Document {
    email: string;
    firstName?: string;
    profileComplete: boolean;
    profile?: IProfile;
    spotifyData?: ISpotifyData;
    scores?: IScores;
    optIn: boolean;
    matchedWith?: string | null;
    matchPlatonic?: boolean;
    unmatchable?: boolean;
}

const audioFeatureAveragesSchema = new Schema<AudioFeatureAverages>(
    {
        danceability: Number,
        energy: Number,
        valence: Number,
        tempo: Number,
        acousticness: Number,
        instrumentalness: Number,
        liveness: Number,
        speechiness: Number,
        loudness: Number,
        mode: Number,
        minorRatio: Number,
        avgTrackAgeYears: Number,
        avgPopularity: Number,
    },
    { _id: false }
);

const genreCountSchema = new Schema<GenreCount>(
    { genre: String, count: Number },
    { _id: false }
);

const spotifyTimeRangeSchema = new Schema<ISpotifyTimeRange>(
    {
        trackIds: [String],
        artistIds: [String],
        audioFeatureAverages: audioFeatureAveragesSchema,
        topGenres: [genreCountSchema],
    },
    { _id: false }
);

const spotifyDataSchema = new Schema<ISpotifyData>(
    {
        lastAttemptAt: Date,
        collectedAt: Date,
        shortTerm: spotifyTimeRangeSchema,
        mediumTerm: spotifyTimeRangeSchema,
        longTerm: spotifyTimeRangeSchema,
    },
    { _id: false }
);

const scoresSchema = new Schema<IScores>(
    {
        cuffedOrNotScore: Number,
        verdict: String,
        tagline: String,
        confidence: Number,
        esValue: Number,
        rentfrowVector: [Number],
        moodQuadrant: String,
    },
    { _id: false }
);

const profileSchema = new Schema<IProfile>(
    {
        genderIdentity: String,
        attractionPreference: [String],
        openToPlatonic: Boolean,
    },
    { _id: false }
);

const cuffedOrNotUserSchema = new Schema<ICuffedOrNotUser>({
    email: { type: String, required: true, unique: true },
    firstName: String,
    profileComplete: { type: Boolean, default: false },
    profile: profileSchema,
    spotifyData: spotifyDataSchema,
    scores: scoresSchema,
    optIn: { type: Boolean, default: false },
    matchedWith: { type: String, default: null },
    matchPlatonic: Boolean,
    unmatchable: Boolean,
});

cuffedOrNotUserSchema.index({ optIn: 1, profileComplete: 1, 'spotifyData.collectedAt': 1 });

export const CuffedOrNotUser: Model<ICuffedOrNotUser> =
    (mongoose.models.cuffedornot_user as Model<ICuffedOrNotUser>) ||
    mongoose.model<ICuffedOrNotUser>('cuffedornot_user', cuffedOrNotUserSchema, 'cuffedornot_users');
