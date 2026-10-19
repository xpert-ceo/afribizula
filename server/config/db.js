import mongoose from "mongoose";

// Fail fast (5s) instead of queueing queries for the default 10s while the database is down.
mongoose.set("bufferTimeoutMS", 5000);
mongoose.set("strictQuery", true);

export async function connectDB(uri, { serverSelectionTimeoutMS = 10000 } = {}) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS });
    // Make sure unique indexes exist before handling traffic.
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    return mongoose.connection;
  } catch (error) {
    const err = new Error(
      `Could not connect to MongoDB (${error.message}). Check MONGO_URI, network access/IP allow-list and credentials.`
    );
    err.cause = error;
    throw err;
  }
}

export function dbState() {
  return ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown";
}

export default connectDB;
