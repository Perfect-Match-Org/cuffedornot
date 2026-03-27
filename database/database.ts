// @ts-nocheck
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { connection: null, promise: null };
}

export async function connect() {
    if (cached.connection) {
        return cached.connection;
    }

    if (!cached.promise) {
        mongoose.set('strictQuery', false);
        cached.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
        });
    }

    cached.connection = await cached.promise;
    return cached.connection;
}
