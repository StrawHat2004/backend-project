import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.User._id;
  //toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });
  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Video unliked successfully"));
  }
  // If like doesn't exist → create it
  const like = await Like.create({
    video: videoId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, like, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //toggle like on comment
  const userId = req.User._id;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });
  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Comment unliked successfully"));
  }
  // If like doesn't exist → create it
  const like = await Like.create({
    comment: commentId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, like, "Comment liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //toggle like on tweet
  const userId = req.User._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }
  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });
  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Tweet unliked successfully"));
  }
  // If like doesn't exist → create it
  const like = await Like.create({
    tweet: tweetId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, like, "Tweet liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  // get all liked videos
  const userId = req.User._id;
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    coverImage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
        $addFields: {
            video: {
                $first: "$video",
            },
        }
    },
    {
        $project: {
            video: 1,
        }
    }
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos || [], "Liked videos fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
