import { app } from '../src/app.js';
import { ensureDB } from '../src/config/db.js';

export default async (req, res) => {
  await ensureDB();
  return app(req, res);
};
