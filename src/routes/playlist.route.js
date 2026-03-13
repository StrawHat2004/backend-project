import { Router } from "express";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller";

const router = Router();

router.post("/playlists", verifyJWT, createPlaylist);
router.get("/users/:userId/playlists", getUserPlaylists);
router.get("/playlists/:playlistId", getPlaylistById);
router.post("/playlists/:playlistId/videos/:videoId", verifyJWT, addVideoToPlaylist);
router.delete("/playlists/:playlistId/:videoId", verifyJWT, removeVideoFromPlaylist);
router.delete("/playlists/:playlistId", verifyJWT, deletePlaylist);
router.patch("/playlists/:playlistId", verifyJWT, updatePlaylist);

export default router;