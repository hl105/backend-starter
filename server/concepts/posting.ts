import { ObjectId } from "mongodb";

import axios from "axios";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

interface SpotifyArtist {
  name: string;
}

export interface PostDoc extends BaseDoc {
  track_id: string;
  author: ObjectId; // e.g. user who listened to Spotify Song
  artist: string;
  name: string;
  album: string;
  url: string;
  lyrics: string;
}

/**
 * concept: Posting [Author]
 */
export default class PostingConcept {
  public readonly songs: DocCollection<PostDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.songs = new DocCollection<PostDoc>(collectionName);
  }

  async create(author: ObjectId, accessToken: string) {
    let currentlyPlayingSong;
    try {
      const spotifyResponse = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (spotifyResponse.status === 200 && spotifyResponse.data) {
        const track = spotifyResponse.data.item;
        currentlyPlayingSong = {
          track_id: track.id,
          artist: track.artists.map((artist: SpotifyArtist) => artist.name).join(", "),
          name: track.name,
          album: track.album.name,
          url: track.external_urls.spotify,
          lyrics: "", // will have to use external api, empty for now
        };
      } else {
        throw new Error("No song currently playing or response failed");
      }
    } catch (error) {
      console.error("Error fetching currently playing song:", error);
      throw new Error("Error fetching currently playing song.");
    }
    const existingSong = await this.songs.readOne({ track_id: currentlyPlayingSong.track_id });

    if (existingSong) {
      return { msg: "Song already exists in the database", post: existingSong };
    }

    const _id = await this.songs.createOne({ author, ...currentlyPlayingSong });
    return { msg: "Post successfully created!", post: await this.songs.readOne({ _id }) };
  }

  async getPosts() {
    // Returns all posts! You might want to page for better client performance
    return await this.songs.readMany({}, { sort: { _id: -1 } });
  }

  async getPostById(_id: ObjectId) {
    return await this.songs.readOne({ _id });
  }

  async getByAuthor(author: ObjectId) {
    return await this.songs.readMany({ author });
  }

  async getByTrackId(trackId: string) {
    return await this.songs.readOne({ trackId });
  }

  //commented out because songs stay the same.
  // async update(_id: ObjectId, content?: string) {
  //   // Note that if content or options is undefined, those fields will *not* be updated
  //   // since undefined values for partialUpdateOne are ignored.
  //   await this.posts.partialUpdateOne({ _id }, { content});
  //   return { msg: "Post successfully updated!" };
  // }

  async delete(_id: ObjectId) {
    await this.songs.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const post = await this.songs.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  async assertPostExists(_id: ObjectId) {
    const maybePost = await this.songs.readOne({ _id });
    if (maybePost === null) {
      throw new NotFoundError(`Post not found!`);
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
