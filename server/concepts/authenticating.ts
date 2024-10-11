import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";
import axios from 'axios';

export interface UserDoc extends BaseDoc {
  username: string;
  password: string;
  spotifyId: string;
  accessToken: string;
  refreshToken: string;
  displayName: string;
  profileUrl: string | null;
}

/**j
 * concept: Authenticating
 */
export default class AuthenticatingConcept {
  public readonly users: DocCollection<UserDoc>;

  /**
   * Make an instance of Authenticating.
   */
  constructor(collectionName: string) {
    this.users = new DocCollection<UserDoc>(collectionName);

    // Create index on username to make search queries for it performant
    void this.users.collection.createIndex({ username: 1 });
  }

  /**
   * Spotify Login
   */
  async loginBySpotifyId(params: { spotifyId: string; accessToken: string; refreshToken: string; displayName: string; profileUrl: string | null }) {
    console.log("logging user by spotify id");
    const spotifyId = params.spotifyId;
    if (!spotifyId) {
      throw new BadValuesError("SpotifyId must be non-empty!");
    }
    const user = await this.users.readOne({ spotifyId });
    if (!user) {
      const _id = await this.users.createOne({
        spotifyId: params.spotifyId,
        username: params.displayName,
        password: "",
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        profileUrl: params.profileUrl,
      });
      return await this.users.readOne({ _id });
    }
    this.updateSpotifyAccessToken(user._id, params.refreshToken);
    return user;
  }

  async findUserBySpotifyId(spotifyId: string) {
    const user = await this.users.readOne({ spotifyId });
    if (user === null) {
      throw new NotFoundError(`User not found!`);
    }
    return this.redactPassword(user);
  }

  async findUserIdBySpotifyId(spotifyId: string) {
    const user = await this.users.readOne({ spotifyId });
    if (user === null) {
      throw new NotFoundError(`User not found!`);
    }
    return user._id;
  }

  async create(username: string, password: string) {
    await this.assertGoodCredentials(username, password);
    const _id = await this.users.createOne({ username, password });
    return { msg: "User created successfully!", user: await this.users.readOne({ _id }) };
  }

  private redactPassword(user: UserDoc): Omit<UserDoc, "password"> {
    // eslint-disable-next-line
    const { password, ...rest } = user;
    return rest;
  }

  async getUserById(_id: ObjectId) {
    const user = await this.users.readOne({ _id });
    if (user === null) {
      throw new NotFoundError(`User not found!`);
    }
    return this.redactPassword(user);
  }

  async getUserByUsername(username: string) {
    const user = await this.users.readOne({ username });
    if (user === null) {
      throw new NotFoundError(`User not found!`);
    }
    return this.redactPassword(user);
  }

  async idsToUsernames(ids: ObjectId[]) {
    const users = await this.users.readMany({ _id: { $in: ids } });

    // Store strings in Map because ObjectId comparison by reference is wrong
    const idToUser = new Map(users.map((user) => [user._id.toString(), user]));
    return ids.map((id) => idToUser.get(id.toString())?.username ?? "DELETED_USER");
  }

  async getUsers(username?: string) {
    // If username is undefined, return all users by applying empty filter
    const filter = username ? { username } : {};
    const users = (await this.users.readMany(filter)).map(this.redactPassword);
    return users;
  }

  async authenticate(username: string, password: string) {
    const user = await this.users.readOne({ username, password });
    if (!user) {
      throw new NotAllowedError("Username or password is incorrect.");
    }
    return { msg: "Successfully authenticated.", _id: user._id };
  }

  async updateUsername(_id: ObjectId, username: string) {
    await this.assertUsernameUnique(username);
    await this.users.partialUpdateOne({ _id }, { username });
    return { msg: "Username updated successfully!" };
  }

  async updateSpotifyAccessToken(_id: ObjectId, refreshToken: string) {
      const clientId = process.env.SPOTIFY_CLIENT_ID; 
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;  
      const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');  

      try {
          const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
          }), {
              headers: {
                  'Authorization': `Basic ${encodedCredentials}`, 
                  'Content-Type': 'application/x-www-form-urlencoded',
              }
          });
          const newAccessToken = response.data.access_token;

          await this.users.partialUpdateOne({ _id }, { accessToken: newAccessToken });

          return { msg: "AccessToken updated successfully!", accessToken: newAccessToken };

      } catch (error: any) {
          console.error('Error refreshing Spotify access token:', error.response?.data || error.message);
          throw new Error('Failed to refresh Spotify access token.');
      }
  }


  async updatePassword(_id: ObjectId, currentPassword: string, newPassword: string) {
    const user = await this.users.readOne({ _id });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    if (user.password !== currentPassword) {
      throw new NotAllowedError("The given current password is wrong!");
    }

    await this.users.partialUpdateOne({ _id }, { password: newPassword });
    return { msg: "Password updated successfully!" };
  }

  async delete(_id: ObjectId) {
    await this.users.deleteOne({ _id });
    return { msg: "User deleted!" };
  }

  async assertUserExists(_id: ObjectId) {
    const maybeUser = await this.users.readOne({ _id });
    if (maybeUser === null) {
      throw new NotFoundError(`User not found!`);
    }
  }

  private async assertGoodCredentials(username: string, password: string) {
    if (!username || !password) {
      throw new BadValuesError("Username and password must be non-empty!");
    }
    await this.assertUsernameUnique(username);
  }

  private async assertUsernameUnique(username: string) {
    if (await this.users.readOne({ username })) {
      throw new NotAllowedError(`User with username ${username} already exists!`);
    }
  }

  // private async assertSpotifyIdUnique(spotifyId: string) {
  //   if (await this.users.readOne({ spotifyId })) {
  //     throw new NotAllowedError(`User with spotifyId ${spotifyId} already exists!`);
  //   }
  // }
}
