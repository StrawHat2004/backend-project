import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import upload from "../middlewares/multer.middleware.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options = {
  httpOnly: true,
  secure: true,
};
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessTokens();
    const refreshToken = user.generateRefreshTokens();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user data from frontend
  //validate user data - not empty, valid email format, password strength
  // check if user already exists in the database
  //check for images, check for avatar and cover image
  //upload images to cloudinary
  //create user object and save to database - create entry in db
  //remove password and rfresh token from response
  //check for user creation
  //return response

  const { fullName, email, username, password } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Simulate user existence check
  const existeduseer = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existeduseer) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalpath = req.files?.avatar[0]?.path;
  // const coverImageLocalpath = req.files?.coverImage[0]?.path;

  let coverImageLocalpath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalpath = req.files.coverImage[0]?.path;
  }

  if (!avatarLocalpath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatarUrl = await uploadToCloudinary(avatarLocalpath);
  const coverImageUrl = await uploadToCloudinary(coverImageLocalpath);

  if (!avatarUrl) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const newUser = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatarUrl,
    coverImage: coverImageUrl ? coverImageUrl : null,
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get user data from frontend
  //validate user data - not empty, valid email format, password strength
  //Username or Email
  //find the user in database
  //if found check password
  //access and refresh token
  // send secure cookies

  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // const options = {
  //     httpOnly: true,
  //     secure: true,
  // }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //get user id from req.user
  //find the user in database
  //remove refresh token from database
  //clear cookies
  //send response

  await User.findByIdAndUpdate(
    req.User._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //get refresh token from cookies
  //validate refresh token
  //if valid, generate new access token and refresh token
  //update refresh token in database
  //send new access token and refresh token in cookies and response
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized, refresh token is missing");
  }

  const decodedRefreshToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedRefreshToken?._id);

  if (!user || user?.refreshToken !== incomingRefreshToken) {
    // if user not found or refresh token is used or invalid
    throw new ApiError(401, "Unauthorized, invalid refresh token");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: refreshToken,
        },
        "Access token refreshed successfully"
      )
    );
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  //get user id from req.user
  //get current password and new password from req.body
  //validate passwords
  //find user in database
  //check if current password is correct
  //if correct, update password with new password
  //send response

  const user = await User.findById(req.User._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Current password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  //get user id from req.user
  //find user in database
  //send user profile in response
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, req.User, "User profile fetched successfully"));
});

const changeAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, username, email } = req.body;

  if (!fullName && !username && !email) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const user = await User.findByIdAndUpdate(
    req.User._id,
    {
      $set: {
        fullName: fullName ? fullName : req.User.fullName,
        username: username ? username : req.User.username,
        email: email ? email : req.User.email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarPath = req.file?.path;
  if (!avatarPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatarUrl = await uploadToCloudinary(avatarPath);

  if (!avatarUrl) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.User?._id,
    {
      $set: {
        avatar: avatarUrl,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImagePath = req.file?.path;
  if (!coverImagePath) {
    throw new ApiError(400, "Cover image is required");
  }

  const coverImageUrl = await uploadToCloudinary(coverImagePath);

  if (!coverImageUrl) {
    throw new ApiError(500, "Failed to upload cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.User?._id,
    {
      $set: {
        coverImage: coverImageUrl,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //get user id from req.params
  //find user in database
  //send user profile in response
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.User?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "User Channel profile fetched successfully"
      )
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  //get user id from req.user
  //find watch history in database
  //send watch history in response
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.User._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistoryVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$ownerDetails",
              },
            },
          },
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistoryVideos,
        "Watch history fetched successfully"
      )
    );
});

export {
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUserProfile,
  changeCurrentUserPassword,
  changeAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
  registerUser,
};
