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
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
