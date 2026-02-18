import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import upload from '../middlewares/multer.middleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const options = {
    httpOnly: true,
    secure: true,
}
const generateAccessAndRefreshTokens = async(userId) =>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessTokens()
        const refreshToken = user.generateRefreshTokens()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    
    }catch(error){
        throw new ApiError(500, "something went wrong while generating refresh and access token");
    }
}

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
   const existeduseer = await User.findOne({
        $or : [{email}, {username}]
    });
    if(existeduseer){
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalpath = req.files?.avatar[0]?.path;
    // const coverImageLocalpath = req.files?.coverImage[0]?.path;

     let coverImageLocalpath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalpath = req.files.coverImage[0]?.path;
    }

    if(!avatarLocalpath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatarUrl = await uploadToCloudinary(avatarLocalpath);
    const coverImageUrl = await uploadToCloudinary(coverImageLocalpath);

    if(!avatarUrl){
        throw new ApiError(500, "Failed to upload avatar");
    }

    const newUser = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatarUrl,
        coverImage: coverImageUrl? coverImageUrl : null
    });

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));

})

const loginUser = asyncHandler(async (req, res) => {
    //get user data from frontend
    //validate user data - not empty, valid email format, password strength
    //Username or Email
    //find the user in database
    //if found check password
    //access and refresh token 
    // send secure cookies

    const {username, email, password} = req.body

    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

     if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

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
        ))


})

const logoutUser = asyncHandler(async (req, res) => {
        //get user id from req.user
        //find the user in database
        //remove refresh token from database
        //clear cookies
        //send response

        await User.findByIdAndUpdate(
            req.User._id, 
            {
                $set: {refreshToken: undefined}
            }, 
            {
                new: true
            })

        const options = {
        httpOnly: true,
        secure: true,
    }
        
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //get refresh token from cookies
    //validate refresh token
    //if valid, generate new access token and refresh token
    //update refresh token in database
    //send new access token and refresh token in cookies and response
    const incomingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized, refresh token is missing")
    }

    const decodedRefreshToken = jwt.verify
    (
        incomingRefreshToken, 
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(
        decodedRefreshToken?._id
    )

        if(!user || user?.refreshToken !== incomingRefreshToken){ // if user not found or refresh token is used or invalid
        throw new ApiError(401, "Unauthorized, invalid refresh token")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

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
        ))
})
export { registerUser, loginUser, logoutUser, refreshAccessToken };