const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Sous-document pour les activités
const activitySchema = new Schema({
    title: { type: String, required: true },
    plannedAt: { type: Date, required: true },
    address: { type: String },
    notes: [{ type: String }],
});

// Modèle pour les voyages
const tripSchema = new Schema({
    title: { type: String, required: true },
    background_url: { type: String },
    country: { type: String, required: true },
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    shareWith: [{ type: Schema.Types.ObjectId, ref: "User" }],
    activities: [activitySchema],
    sos_infos: [{ type: Schema.Types.ObjectId, ref: "CountriesInfos" }],
    invitation_link: { type: String },
});

// Export du modèle Trip
const Trip = mongoose.model("Trip", tripSchema);
module.exports = Trip;
