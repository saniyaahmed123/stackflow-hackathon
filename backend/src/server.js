const start = async () => {
  try {
    const [{ app }, { config }, { connectDB }, { detectTransactionSupport }] = await Promise.all([
      import('./app.js'),
      import('./config/env.js'),
      import('./config/db.js'),
      import('./utils/transaction.js'),
    ]);
    await connectDB(config.mongoUri);
    const transactional = await detectTransactionSupport();
    console.log(`MongoDB connected (transactions: ${transactional ? 'enabled' : 'standalone mode'})`);
    app.listen(config.port, () => console.log(`Parcel Point API listening on http://localhost:${config.port}`));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
