import dotenv from "dotenv";
import passport from "passport";
import { Profile, Strategy as SpotifyStrategy } from "passport-spotify";
import { Authing } from "./app";

dotenv.config();

const clientID = process.env.SPOTIFY_CLIENT_ID as string;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string;

if (!clientID || !clientSecret) {
  throw new Error("Spotify client ID and secret must be provided in environment variables.");
}

passport.serializeUser(function (user: Express.User, done: (err: any, id?: any) => void) {
  done(null, user);
});

passport.deserializeUser(function (user: Express.User, done: (err: any, user?: any) => void) {
  done(null, user);
});

passport.use(
  new SpotifyStrategy(
    {
      showDialog: true,
      clientID: clientID,
      clientSecret: clientSecret,
      callbackURL: "https://backend-starter-steel.vercel.app/api/spotify/callback",
      scope: ["user-read-private", "user-read-currently-playing", "user-read-playback-state", "user-modify-playback-state"],
    },
    async (accessToken: string, refreshToken: string, expires_in: number, profile: Profile, done: Function) => {
      console.log("Spotify Strategy is in use");
      console.log("Access Token:", accessToken);
      console.log("Profile:", profile);
      try {
        const user = await Authing.loginBySpotifyId({ spotifyId: profile.id, accessToken: accessToken, refreshToken: refreshToken, displayName: profile.displayName, profileUrl: profile.profileUrl });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

export default passport;
