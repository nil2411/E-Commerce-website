import {v2 as cloudinary} from 'cloudinary'



const connectclodudinary = () => {

    cloudinary.config({
        cloud_name : process.env.CLOUDINARY_NAME || process.env.cloudinary_name,
        api_key : process.env.CLOUDINARY_API_KEY || process.env.cloudinary_api_key,
        api_secret : process.env.CLOUDINARY_SECRET_KEY || process.env.cloudinary_secret_key
        


    })


}

export default connectclodudinary;
