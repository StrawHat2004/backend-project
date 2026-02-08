import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username : {
            type:String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email :{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        fullName : {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar : {
            type: String, // URL to the avatar image from a third-party service called cloudinary
            default: null,
            trim: true,
            required: true,
        },
        coverImage : {
            type: String, // URL to the cover image from a third-party service called cloudinary
            default: null,
        },
        watchHistory : [{
            type: Schema.Types.ObjectId,
            ref: 'Video',
        }],
        password : {
            type: String,
            required:[true, 'Password is required'],
        },
        refreshToken : {
            type: String,
        }
    }, {timestamps: true});

    userSchema.pre("save", async function(){
        if(this.isModified("password"))
         this.password = await bcrypt.hash(this.password, 10);
        
    })

    userSchema.methods.isPasswordCorrect = async function(password){
        return await bcrypt.compare(password, this.password);
    }

    userSchema.methods.generateAccessTokens = function(){
        return jwt.sign(
            {
                _id: this._id,
                username: this.username,
                email: this.email,
                fullName: this.fullName,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
            }
        )
       
    }

     userSchema.methods.generateRefreshTokens = function(){
        return jwt.sign(
            {
                _id: this._id,
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
            }
        )
    }


    

export const User = mongoose.model('User', userSchema);