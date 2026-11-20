import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret:
    process.env.JWT_SECRET ||
    "e099df468facf5dd71d1b5a3d6f0b5ad573e2de5837e152b0f9596258f163667",
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
