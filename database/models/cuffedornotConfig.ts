import mongoose, { Schema, Document, Model } from 'mongoose';

const cuffedOrNotConfigSchema = new Schema({
    optInOpen: { type: Boolean, default: false },
    matchesReleased: { type: Boolean, default: false },
    matchingRun: { type: Boolean, default: false },
});

const CuffedOrNotConfig: Model<Document> =
    mongoose.models.cuffedornot_config ||
    mongoose.model('cuffedornot_config', cuffedOrNotConfigSchema, 'cuffedornot_config');

export async function getConfig(): Promise<Document> {
    let config = await CuffedOrNotConfig.findOne();
    if (!config) {
        config = await CuffedOrNotConfig.create({
            optInOpen: false,
            matchesReleased: false,
            matchingRun: false,
        });
    }
    return config;
}

export { CuffedOrNotConfig };
