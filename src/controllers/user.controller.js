import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import upload from '../middlewares/multer.middleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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
    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

    // Simulate user existence check
   const existeduseer = User.findOne({
        $or : [{email}, {username}]
    });
    if(existeduseer){
        throw new ApiError(409, "User already exists");
    }

    const avtarLocalpath = req.files?.avtar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

    if(!avtarLocalpath){
        throw new ApiError(400, "Avatar is required");
    }

    const avtarUrl = await uploadToCloudinary(avtarLocalpath);
    const coverImageUrl = await uploadToCloudinary(coverImageLocalpath);

    if(!avtarUrl){
        throw new ApiError(500, "Failed to upload avatar");
    }

    const newUser = await new User({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avtar: avtarUrl,
        coverImage: coverImageUrl? coverImageUrl : null
    });

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));

})


export { registerUser };