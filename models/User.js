const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sous-document pour les documents
const documentSchema = new Schema({
    title: { type: String, required: true },
    link_doc: { type: String },
    linked_trip: { type: Schema.Types.ObjectId, ref: 'Trip' },
    serial_phone: { type: String }
    
});

// Modèle pour l'utilisateur
const userSchema = new Schema({
    username: { type: String, unique, required: true },
    email: { type: String, unique, required: true },
    password: { type: String, unique, required: true },
    token: { type: String },
    trips: [{ type: Schema.Types.ObjectId, ref: 'Trip' }],
    documents: [documentSchema]
    
});

// Export du modèle User
const User = mongoose.model('User', userSchema);
module.exports = User;
