import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import User from '../models/User';
dotenv.config();

function attachUserId(user: any) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  userObj.userId = user.userId || user._id?.toString();
  return userObj;
}

passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
}, async (jwtPayload, done) => {
  try {
    const user = await User.findById(jwtPayload.id);
    if (user) {
      return done(null, attachUserId(user));
    }
    return done(null, false);
  } catch (err) {
    return done(err, false);
  }
}));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    const avatar = profile.photos?.[0]?.value || `https://robohash.org/${profile.id}.png`;
    if (!user) {
      user = await User.create({
        email: profile.emails?.[0].value,
        googleId: profile.id,
        fullName: profile.displayName,
        avatar,
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
      });
    } else {
      user.googleAccessToken = accessToken;
      user.googleRefreshToken = refreshToken;
      user.avatar = avatar;
      await user.save();
    }
    return done(null, attachUserId(user));
  } catch (err) {
    return done(err, false);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user ? attachUserId(user) : null);
  } catch (err) {
    done(err, null);
  }
}); 