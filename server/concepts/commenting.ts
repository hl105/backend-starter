import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface CommentDoc extends BaseDoc {
  post: ObjectId;
  author: ObjectId;
  text: string;
  lyrics: string;
  image: string;
}

/**
 * concept: Commenting [Post]
 */

export default class CommentingConcept {
  public readonly comments: DocCollection<CommentDoc>;

  /**
   * Make an instance of Commenting
   */
  constructor(collectionName: string) {
    this.comments = new DocCollection<CommentDoc>(collectionName);
  }

  async create(post: ObjectId, author: ObjectId, text: string, lyrics: string, image: string) {
    const _id = await this.comments.createOne({ post, author, text, lyrics, image });
    return { msg: "Comment successfully created!", comment: await this.comments.readOne({ _id }) };
  }

  async getComments() {
    //Returns all comments
    return await this.comments.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.comments.readMany({ author });
  }

  async getByPost(post: ObjectId) {
    return await this.comments.readMany({ post });
  }

  async update(_id: ObjectId, text?: string, lyrics?: string, image?: string) {
    await this.comments.partialUpdateOne({ _id }, { text, lyrics, image });
    return { msg: "Comment successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.comments.deleteOne({ _id });
    return { msg: "Comment deleted successfully!" };
  }

  async deleteByAuthor(author: ObjectId){
    await this.comments.deleteMany({ author });
    return { msg: "Comments have been deleted successfully!"}
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const comment = await this.comments.readOne({ _id });
    if (!comment) {
      throw new NotFoundError(`Comment ${_id} does not exist!`);
    }
    if (comment.author.toString() !== user.toString()) {
      throw new CommentAuthorNotMatchError(user, _id);
    }
  }

  // need assertion to check if friend is author
}

export class CommentAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of comment {1}!", author, _id);
  }
}
