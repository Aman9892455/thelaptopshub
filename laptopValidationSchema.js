const Joi = require("joi");

const laptopValidationSchema = Joi.object({
  laptopName: Joi.string().required(),
  laptopBrand: Joi.string().required(),
  laptopPrice: Joi.number().required(),
  laptopCategory: Joi.string().required(),
  laptopDescription: Joi.string().required(),
  laptopProcessor: Joi.string().required(),
  laptopRAM: Joi.string().required(),
  laptopStorage: Joi.string().required(),
  laptopGraphics: Joi.string().allow(""),
  laptopDisplay: Joi.string().required(),
  laptopOS: Joi.string().required(),
  laptopImage: Joi.string().required(),
  laptopImagePublicId: Joi.string().allow("")
});


module.exports = laptopValidationSchema;