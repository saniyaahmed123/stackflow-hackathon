import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || !String(jwtSecret).trim()) {
  throw new Error("JWT_SECRET is required. Set JWT_SECRET in backend/.env before starting the server.");
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: String(jwtSecret),
  jwtExpires: process.env.JWT_EXPIRES || "7d",
  clientUrl: process.env.CLIENT_URL || "http://127.0.0.1:5173",
  imagekit: {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
  },
};

export const imageKitConfigured = Boolean(
  config.imagekit.publicKey &&
  config.imagekit.privateKey &&
  config.imagekit.urlEndpoint,
);
