import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ExpiredDoc extends BaseDoc {
  content: ObjectId;
  created: string;
}

export interface NotExpiredDoc extends BaseDoc {
    content: ObjectId;
    created: string;
}

const expireAfter = 86400; // 24 hours

/**
 * concept: Expiring [Comment]
 */
export default class ExpiringConcept {
    public readonly expiredContents: DocCollection<ExpiredDoc>;
    public readonly notExpiredContents: DocCollection<NotExpiredDoc>;
  
    /**
     * Make an instance of Expiring
     */
    constructor(collectionName: string) {
      this.expiredContents = new DocCollection<ExpiredDoc>(collectionName);
      this.notExpiredContents = new DocCollection<NotExpiredDoc>(collectionName);
    }
  
    async create(content: ObjectId, created: string) {
      const _id = await this.notExpiredContents.createOne({ content, created});
      return { msg: "Added to NotExpired!", notExpiredContent: await this.notExpiredContents.readOne({ _id }) };
    }
}
  