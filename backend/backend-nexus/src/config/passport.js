const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    /**
     * OAuth2 callback orchestrator for Google Single Sign-On (SSO).
     * 
     * This function is triggered by the Passport Google OAuth20 strategy immediately after Google successfully
     * authenticates the user and redirects back to our application. Its primary responsibility is to resolve
     * the Google profile data into a local `User` document, handling both login and registration seamlessly.
     * 
     * Business Logic & Workflow:
     * 1. **Email Extraction**: Attempts to extract the primary email address from the Google `profile` object. If Google does not return an email, it instantly aborts authentication, as email is a core requirement for our system.
     * 2. **SSO Login Path**: Queries the `User` collection by `googleId`. If a match is found, it means the user has logged in with this Google account before. The existing user object is passed to `done()`.
     * 3. **Account Linking Path**: If no `googleId` matches, it queries by `email`. If an email match is found, it means the user previously registered manually (via email/password). The system automatically links the new `googleId` to this existing account, marks the email as verified, saves the document, and proceeds.
     * 4. **New SSO Registration Path**: If neither the `googleId` nor the `email` exists in the database, it creates an entirely new `User` document. It populates the email, googleId, marks the account as verified (since Google already verified it), and extracts the user's full name and avatar URL from the Google profile payload.
     * 5. **Error Handling**: Any database query failures or validation errors are caught in the `catch` block and passed to `done(err, null)`.
     * 
     * @param {string} accessToken - The OAuth2 access token granted by Google. Allows fetching additional data from Google APIs if needed.
     * @param {string} refreshToken - The OAuth2 refresh token. Used to get new access tokens. Often undefined unless specific access types are requested.
     * @param {Object} profile - The normalized user profile object provided by Passport, abstracting the raw Google API response. Contains fields like `id`, `displayName`, `emails`, and `photos`.
     * @param {Function} done - The Passport verify callback. Must be called to complete authentication. Signature: `done(error, user, info)`.
     * @returns {Promise<void>} Returns a promise implicitly due to `async`, but actual resolution is handled by invoking `done()`.
     * @throws {Error} Invokes `done(new Error(...))` if the email is missing, or passes database exceptions to `done(err)`.
     */
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        if (!email) return done(new Error("No email provided by Google"), null);

        // 1. Cari by googleId (sudah pernah login Google)
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // 2. Cari by email (sudah register via email+password)
        user = await User.findOne({ email });
        if (user) {
          // Link Google ke akun yang sudah ada
          user.googleId = profile.id;
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }

        // 3. Buat akun baru
        user = await User.create({
          email,
          googleId: profile.id,
          isVerified: true,
          profile: {
            fullName: profile.displayName || "New User",
            avatarUrl: (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : ""
          }
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

/**
 * Serializes a user object into a format suitable for storage within an Express session.
 * 
 * In stateful authentication architectures (or temporary session stores during OAuth flows), Passport needs to
 * determine what specific piece of user data should be stored in the session cookie to identify the user
 * across subsequent requests.
 * 
 * Workflow:
 * 1. Takes the full authenticated `user` document (typically a Mongoose model instance returned from the strategy callback).
 * 2. Extracts the unique identifier, `user.id` (which maps to MongoDB's `_id` string).
 * 3. Calls the `done` callback, instructing Passport to store only this string ID in the session, keeping the session payload small and secure.
 * 
 * @param {Object} user - The fully authenticated Mongoose User document.
 * @param {Function} done - The Passport callback function. Signature: `done(error, serializedIdentifier)`.
 * @returns {void} Executes the callback to complete serialization.
 */
passport.serializeUser((user, done) => done(null, user.id));

/**
 * Deserializes a user object from a session-stored identifier on every subsequent authenticated request.
 * 
 * When a request contains a valid session cookie, Passport extracts the serialized identifier (the user ID)
 * and invokes this function. Its job is to turn that ID back into a full user object so it can be attached
 * to `req.user` for use in downstream route handlers.
 * 
 * Workflow:
 * 1. Receives the user `id` string previously stored in the session by `serializeUser`.
 * 2. Executes an asynchronous query against the MongoDB database (`User.findById(id)`) to fetch the most up-to-date user record.
 * 3. Once the database returns the document, it calls the `done` callback, passing `null` for the error and the loaded `user` object.
 * 4. If the user is deleted from the DB while the session is active, `user` will be null, effectively logging them out on the next request.
 * 
 * @param {string} id - The unique user identifier extracted from the Express session.
 * @param {Function} done - The Passport callback function. Signature: `done(error, fullUserObject)`.
 * @returns {Promise<void>} Resolves after the database query and callback execution complete.
 */
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
