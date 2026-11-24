import mongoose from 'mongoose';

let transactionsSupported = false;
let detectionDone = false;

export async function detectTransactionSupport() {
  if (detectionDone) return transactionsSupported;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(
      hello.setName || hello.msg === 'isWritablePrimary' || hello.logicalSessionTimeoutMinutes
    );
  } catch {
    transactionsSupported = false;
  }
  detectionDone = true;
  return transactionsSupported;
}

export function usingTransactions() {
  return transactionsSupported;
}

/**
 * Runs `work(session, rollbacks)` inside a MongoDB transaction when the server
 * supports it. On a standalone mongod the same work runs with `session = null`
 * and any registered rollback callbacks are executed in reverse order on error.
 */
const isTransientTransactionError = (error) =>
  Boolean(
    error?.errorLabels?.includes('TransientTransactionError') ||
      error?.codeName === 'WriteConflict' ||
      error?.code === 112 ||
      /write conflict/i.test(error?.message || '')
  );

export async function withTransaction(work, retries = 4) {
  if (!transactionsSupported) {
    const rollbacks = [];
    try {
      return await work(null, rollbacks);
    } catch (error) {
      for (const rollback of rollbacks.reverse()) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.warn('Rollback failed:', rollbackError.message);
        }
      }
      throw error;
    }
  }

  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session, []);
      await session.commitTransaction();
      return result;
    } catch (error) {
      lastError = error;
      if (session.inTransaction()) await session.abortTransaction();
      if (!isTransientTransactionError(error) || attempt === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    } finally {
      await session.endSession();
    }
  }
  throw lastError;
}
