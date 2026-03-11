import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;
  //TODO: get all videos based on query, sort, pagination
  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const skip = (page - 1) * limit;
  const matchstage = {};
  if (query) {
    matchstage.title = {
      $regex: query,
      $options: "i",
    };
  }

  if (userId) {
    matchstage.owner = new mongoose.Types.ObjectId(userId);
  }

  const videos = await Video.aggregate([
    {
      $match: matchstage,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
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
          $first: "$ownerInfo",
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: Number(limit),
    },
  ]);

  if (videos.length === 0) {
    throw new ApiError(404, "No videos found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // get video, upload to cloudinary, create video

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }
  const videofilepath = req.files?.videoFile?.[0]?.path;
  const thumbnailfilepath = req.files?.thumbnail?.[0]?.path;
  if (!videofilepath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailfilepath) {
    throw new ApiError(400, "Thumbnail is required");
  }
  const videoUploadResponse = await uploadOnCloudinary(videofilepath);
  const thumbnailUploadResponse = await uploadOnCloudinary(thumbnailfilepath);

  if (!videoUploadResponse) {
    throw new ApiError(500, "Failed to upload video");
  }
  if (!thumbnailUploadResponse) {
    throw new ApiError(500, "Failed to upload thumbnail");
  }

  const video = await Video.create({
    title,
    description,
    videoUrl: videoUploadResponse.secure_url,
    thumbnailUrl: thumbnailUploadResponse.secure_url,
    owner: req.User._id,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar coverImage"
  );
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const { title, description } = req.body;
  if (!title && !description && !req.files?.thumbnail) {
    throw new ApiError(400, "At least one field is required to update");
  }
  //update video details
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.User._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }
  video.title = title || video.title;
  video.description = description || video.description;
  if (req.files?.thumbnail) {
    const uploadResponse = await uploadOnCloudinary(
      req.files.thumbnail[0].path
    );

    if (!uploadResponse) {
      throw new ApiError(500, "Thumbnail upload failed");
    }

    video.thumbnail = uploadResponse.secure_url;
  }
  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //delete video
  if (!isValidObjectId(videoId)) {  
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
    if (video.owner.toString() !== req.User._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }
    await video.deleteOne();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
    const video = await Video.findById(videoId);
    if (!video) {  
    throw new ApiError(404, "Video not found");
  }
    if (video.owner.toString() !== req.User._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }
    video.isPublished = !video.isPublished;
    await video.save();
  return res.status(200).json(
    new ApiResponse(
      200,
      video,
      `Video ${video.isPublished ? "published" : "unpublished"} successfully`
    )
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
