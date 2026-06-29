import mongoose from 'mongoose'

const connectDb = async() =>{

    mongoose.connection.on('connected',()=>{
        console.log("DB Connected");
        
    });

    const base = process.env.MONGO_URL.replace(/\/$/, '')
    const hasDatabase = /mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(base)
    await mongoose.connect(hasDatabase ? base : `${base}/ecommerce`)

}

const disconnectDb = () => mongoose.disconnect()

export { connectDb, disconnectDb };
