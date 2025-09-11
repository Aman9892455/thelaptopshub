const mongoose = require("mongoose");
const LaptopListing = require("../laptopListing.js"); // ← Yeh sahi path hai
const initData = require('./data.js');
const LaptopListing = require("../user.js");

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/theLaptopHub');
    console.log("Connection established successfully");
}

const initDB = async () => {
    try {
        await main();
        await LaptopListing.deleteMany({});
        await LaptopListing.insertMany(initData.data);
        console.log("Data was initialized successfully");
        mongoose.connection.close();
    } catch (err) {
        console.log("Error initializing data:", err);
    }
}

if (require.main === module) {
    initDB();
}

module.exports = initDB;