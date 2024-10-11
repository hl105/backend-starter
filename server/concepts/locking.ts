import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface LockDoc extends BaseDoc {
  content: ObjectId;
  locker: ObjectId; //person who locked it
  from: Date;
  to: Date;
}

/**
 * concept: Locking [Content]
 */
export default class LockingConcept {
  public readonly locks: DocCollection<LockDoc>;

  /**
   * Make an instance of Locking
   */
  constructor(collectionName: string) {
    this.locks = new DocCollection<LockDoc>(collectionName);
  }

  async create(content: ObjectId, locker: ObjectId, from: Date, to: Date) {
    const _id = await this.locks.createOne({ content, locker, from, to });
    return { msg: "Successfully locked!", lock: await this.locks.readOne({ _id }) };
  }

  async getLocks() {
    // Returns all locks
    return await this.locks.readMany({}, { sort: { _id: -1 } });
  }

  async getByLocker(locker: ObjectId){
    return await this.locks.readMany({ locker });
  }

  async getByTo(to: Date) {
    //returns locks that unlock on the date `to`
    return await this.locks.readMany({ to });
  }

  async getByContent(content: ObjectId) {
    return await this.locks.readOne({ content });
  }

  async delete(_id: ObjectId) {
    const lock = await this.locks.readOne({ _id });
    if (!lock) {
      throw new NotFoundError("Lock not found");
    }
    await this.locks.deleteOne({ _id });
    return { msg: "Lock is deleted!" };
  }

  async removeExpiredLocks(){
    try {
      const currentDate = new Date();

      const expiredLocksQuery = {
        to: { $lte: currentDate },
      };

      const deleteResult = await this.locks.deleteMany(expiredLocksQuery);

      return deleteResult.deletedCount || 0;
    } catch (error) {
      console.error("Error removing expired locks:", error);
      throw new NotAllowedError("Failed to remove expired locks.");
    }
  }

  async getContentIDsAfterCleanup(){
    await this.removeExpiredLocks();
    const activeLocks = await this.getLocks(); 
    const lockedContentIds = activeLocks.map((lock) => lock.content.toString());
    return lockedContentIds;
  }

  async deleteByLocker(locker: ObjectId){
    await this.locks.deleteMany({ locker });
    return {msg: "Locks have been deleted"};
  }

  async assertLockExists(_id: ObjectId) {
    const maybeLock = await this.locks.readOne({ _id });
    if (maybeLock === null) {
      throw new NotFoundError(`User not found!`);
    }
  }
}


export class TimeError extends NotAllowedError {
  constructor(
    public readonly content: ObjectId,
    public readonly to: string,
  ) {
    super("{0} is locked until {1}!", content, to);
  }
}
