import dotenv from "dotenv";
import mongoose from "mongoose";
import { loadConfig, ConfigError } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

dotenv.config({ quiet: true });

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }

  try {
    await connectDB(config.mongoUri);
    console.log("MongoDB connected");
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));

  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Server running on ${config.port} (${config.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
