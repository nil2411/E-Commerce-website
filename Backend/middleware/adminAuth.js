import jwt from 'jsonwebtoken'

const adminauth = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization
        const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : req.headers.token;

        if (!token) {
            return res.json({ success: false, message: "admin login failed ,try again with correct details " });
        }
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        if (token_decode?.role !== 'admin' || token_decode?.type !== 'access') {
            return res.json({ success: false, message: "No authorized admin login" })


        }
        req.user = { id: token_decode.id, role: 'admin' }
        next();
    }
    catch (error) {
        console.log(error);
        res.status(401).json({ success: false, message: 'Admin session expired. Please log in again.' });



    }
}

export default adminauth;
