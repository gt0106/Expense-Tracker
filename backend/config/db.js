const mongoose = require("mongoose");
const dns = require("dns");

// Set DNS servers to resolve MongoDB Atlas SRV records on networks/ISPs that fail SRV queries
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  // Ignore error if custom DNS cannot be configured
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (error.message.includes("whitelist") || error.name === "MongooseServerSelectionError") {
      console.error("\n👉 ACTION REQUIRED: Add your current IP to MongoDB Atlas Network Access:");
      console.error("   1. Go to cloud.mongodb.com -> Network Access");
      console.error("   2. Click 'Add IP Address' -> Select 'Allow Access from Anywhere' (0.0.0.0/0)");
      console.error("   3. Save and wait ~1 minute for changes to deploy.\n");
    }
    process.exit(1);
  }
};

module.exports = connectDB;
