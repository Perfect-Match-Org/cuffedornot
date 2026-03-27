import mongoose, { Schema, Document, Model } from 'mongoose';

const audioFeatureAveragesSchema = new Schema(
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
    },
    { _id: false }
);

const genreCountSchema = new Schema(
    { genre: String, count: Number },
    { _id: false }
);

const spotifyTimeRangeSchema = new Schema(
    {
        trackIds: [String],
        artistIds: [String],
        audioFeatureAverages: audioFeatureAveragesSchema,
        topGenres: [genreCountSchema],
    },
    { _id: false }
);

const spotifyDataSchema = new Schema(
    {
        lastAttemptAt: Date,
        collectedAt: Date,
        shortTerm: spotifyTimeRangeSchema,
        mediumTerm: spotifyTimeRangeSchema,
        longTerm: spotifyTimeRangeSchema,
    },
    { _id: false }
);

const scoresSchema = new Schema(
    {
        cuffedOrNotScore: Number,
        verdict: String,
        confidence: Number,
        esValue: Number,
        rentfrowVector: [Number],
        moodQuadrant: String,
    },
    { _id: false }
);

const profileSchema = new Schema(
    {
        genderIdentity: String,
        attractionPreference: [String],
        openToPlatonic: Boolean,
    },
    { _id: false }
);

const cuffedOrNotUserSchema = new Schema({
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

export const CuffedOrNotUser: Model<Document> =
    mongoose.models.cuffedornot_user ||
    mongoose.model('cuffedornot_user', cuffedOrNotUserSchema, 'cuffedornot_users');
