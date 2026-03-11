import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const skip = (page - 1) * limit;
  const comments = await Comment.aggregate([
  {
    $match: {
      video: new mongoose.Types.ObjectId(videoId)
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "commenter"
    }
  },
  {
    $addFields: {
      commenter: { $first: "$commenter" }
    }
  },
  {
    $project: {
      content: 1,
      createdAt: 1,
      commenter: {
        username: 1,
        fullName: 1,
        avatar: 1
      }
    }
  },
  {
    $sort: {
      createdAt: -1
    }
  },
  {
    $skip: Number(skip)
  },
  {
    $limit: Number(limit)
  }
])
        return res
            .status(200)
            .json(new ApiResponse(200, comments? comments : [], "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  //add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.User._id;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is empty");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if(!video.isPublished) {
        throw new ApiError(400, "Cannot comment on an unpublished video");
    }
    const comment = await Comment.create({
        content,
        owner: userId,
        video: videoId
    })
    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  //update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.User._id;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is empty");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    if (comment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not the owner of this comment");
    }
    comment.content = content;
    await comment.save();
    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  //delete a comment
  const { commentId } = req.params;
  const userId = req.User._id;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not the owner of this comment");
  }
  await Comment.findByIdAndDelete(commentId);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
