import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true

}))

app.use(express.json({
    limit: '16kb'
}))

app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}))

app.use(express.static('public'));

app.use(cookieParser());

//routes
import userRoutes from './routes/user.routes.js';

//routes declaration
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tweets", tweetRoutes);
app.use("/api/v1/likes", likeRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/playlists", playlistRoutes);
app.use("/api/v1/videos", videoRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);

export { app };