import { Router } from "express";
import { getVideoComments, addComment, updateComment, deleteComment } from "../controllers/comment.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

router.get("/:videoId/comments", verifyJWT, getVideoComments);
router.post("/:videoId/comments", verifyJWT, addComment);
router.put("/comments/:commentId", verifyJWT, updateComment);
router.delete("/comments/:commentId", verifyJWT, deleteComment);

export default router;