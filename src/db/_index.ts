import { dbManager } from "@/utils/databaseManager";
import { connectCockroach } from "./cockroach";
import handleConnectToMongodb from "./mongodb";

interface DBConnectionStatus {
  connected: boolean;
  attempts: number;
  retryCount: number;
}

const handleConnectCockroachdb = async (
  dbConnectionStatus: DBConnectionStatus
) => {
  try {
    await connectCockroach();
    dbConnectionStatus = dbManager.getConnectionStatus();
    console.log("✅ Database connection established successfully");
  } catch (error) {
    console.error("⚠️ Database connection failed:", (error as Error).message);
    console.log("🔄 Database will retry automatically in the background...");
    console.log(
      "📝 Some features may be unavailable until database connection is restored"
    );

    // Start background retry process
    setInterval(async () => {
      try {
        if (!dbManager.getConnectionStatus().connected) {
          console.log("🔄 Background database reconnection attempt...");
          await connectCockroach();
          dbConnectionStatus = dbManager.getConnectionStatus();
          console.log("✅ Database reconnected successfully");
        }
      } catch (retryError) {
        // Silent retry - don't spam logs
        dbConnectionStatus = dbManager.getConnectionStatus();
      }
    }, 30000); // Retry every 30 seconds
  }
};

const initializeDatabase = async () => {
  try {
    // Connect to CockroachDB with enhanced retry logic
    let dbConnectionStatus = { connected: false, attempts: 0, retryCount: 0 };
    await handleConnectCockroachdb(dbConnectionStatus);

    // Connect to MongoDB with enhanced retry logic
    await handleConnectToMongodb();
  } catch (error) {
    console.error("⚠️ Database connection failed:", (error as Error).message);
    console.log("🔄 Database will retry automatically in the background...");
    console.log(
      "📝 Some features may be unavailable until database connection is restored"
    );
  }
};

export default initializeDatabase;
