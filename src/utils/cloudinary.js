import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (filePath, folder) => {
    try{
        if(!filePath) return null;
        // Upload the file to Cloudinary
        const res = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
        })
        //file is uploaded in cloudinary
        console.log('File uploaded to Cloudinary:', res.url);
        return res.url;
    }catch(error){
        // Handle upload errors
        fs.unlinkSync(filePath); // Delete the local file in case of error
        console.error('Error uploading to Cloudinary:', error);
        return null;
    }
}