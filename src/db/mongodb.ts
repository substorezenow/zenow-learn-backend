import mongoose from "mongoose";

mongoose.set("maxTimeMS", 10000); // Set default query timeout to 10 seconds

const handleConnectToMongodb = async () => {
  try {
    const mongoURI : string | null = process.env.MONGODB_URL || null;
    if (!mongoURI) {
      console.error("❌ MONGODB_URL is not defined in environment variables");
      return;
    }

    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoURI);
    console.error("✅ Connected to MongoDB");
  } catch (error) {
    console.error(
      "❌ Error connecting to MongoDB: ",
      error instanceof Error ? error.message : String(error)
    );
  }
};

export default handleConnectToMongodb;
