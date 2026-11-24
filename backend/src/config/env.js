import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === "production" && !jwtSecret) {
  throw new Error("JWT_SECRET must be set in production");
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: jwtSecret || "dev-only-jwt-secret-change-me",
  jwtExpires: process.env.JWT_EXPIRES || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
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
