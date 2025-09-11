const mongoose = require("mongoose");

const laptopSchema = new mongoose.Schema({
  laptopName: { type: String, required: true },
  laptopBrand: { type: String, required: true },
  laptopPrice: { type: Number, required: true },
  laptopCategory: { type: String, required: true },
  laptopDescription: { type: String, required: true },
  laptopProcessor: { type: String, required: true },
  laptopRAM: { type: String, required: true },
  laptopStorage: { type: String, required: true },
  laptopGraphics: { type: String },
  laptopDisplay: { type: String, required: true },
  laptopOS: { type: String, required: true },
  laptopImage: { type: String, required: true },
   laptopImage: String,
  laptopImagePublicId: String,
});

const LaptopListing = mongoose.model("LaptopListing", laptopSchema);
module.exports = LaptopListing;
