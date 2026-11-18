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
export async function withTransaction(work) {
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

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await work(session, []);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
