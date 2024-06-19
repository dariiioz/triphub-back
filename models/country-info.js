const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Sous-document pour les consulats
const consulateSchema = new Schema({
  address: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  phone: { type: String },
  email: { type: String },
  emergency_phone: { type: String },
});

// Schéma du modèle pour les informations sur l'ambassade
const embassySchema = new Schema({
  address: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  phone: { type: String },
  email: { type: String },
  emergency_phone: { type: String },
});

// Modèle pour les informations du pays
const countryInfoSchema = new Schema({
  country: { type: String, unique: true, required: true },
  embassy: embassySchema,
  consulate: [consulateSchema],
  emergency_number: { type: String },
  police_number: { type: String },
  firefighter_number: { type: String },
  member_112: { type: Boolean },
});

// Export du modèle CountryInfo
const Country = mongoose.model("CountriesInfos", countryInfoSchema);
module.exports = Country;
