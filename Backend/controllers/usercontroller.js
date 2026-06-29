import userModel from '../models/usermodel.js';
import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET);
}

//user login


const userlogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "user doesnt exist !" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = createToken(user._id);
            res.json({ success: true, message: "Token created successfully", token });

        }
        else {
            res.json({ success: false, message: "Enter valid creditnials !" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });



    }




}

//user register
const userregister = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const exist = await userModel.findOne({ email });
        if (exist) {
            return res.json({ success: false, message: "user already exist" });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Enter valid email" });
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }

        //hashing user password
        const salt = await bcrypt.genSalt(10);
        const hasedpassword = await bcrypt.hash(password, salt);

        const newuser = new userModel({
            name,
            email,
            password: hasedpassword
        });

        const user = await newuser.save();

        const token = createToken(user._id);

        res.json({ success: true, token })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });


    }

}

//Admin login

const adminlogin = async (req, res) => {

    const {email,password} = req.body;

    try {
        if(email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD){
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success : true,message : "admin logged in succeefully",token})
        }
        else{
            res.json({success : false,message : "enter valid credentials"});
        }
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });

        
    }

}

export { userlogin, userregister, adminlogin };

