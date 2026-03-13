import { Router } from "express";
import { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos } from "../controllers/like.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

router.post("/comments/:commentId/likes",verifyJWT, toggleCommentLike);
router.post("/tweets/:tweetId/likes", verifyJWT, toggleTweetLike);
router.post("/videos/:videoId/likes", verifyJWT, toggleVideoLike);
router.get("/videos/likes", verifyJWT, getLikedVideos);

export default router;