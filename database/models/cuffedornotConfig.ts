import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICuffedOrNotConfig extends Document {
    optInOpen: boolean;
    matchesReleased: boolean;
    matchingRun: boolean;
}

const cuffedOrNotConfigSchema = new Schema<ICuffedOrNotConfig>({
    optInOpen: { type: Boolean, default: false },
    matchesReleased: { type: Boolean, default: false },
    matchingRun: { type: Boolean, default: false },
});

export const CuffedOrNotConfig: Model<ICuffedOrNotConfig> =
    (mongoose.models.cuffedornot_config as Model<ICuffedOrNotConfig>) ||
    mongoose.model<ICuffedOrNotConfig>('cuffedornot_config', cuffedOrNotConfigSchema, 'cuffedornot_config');

export async function getConfig(): Promise<ICuffedOrNotConfig> {
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
