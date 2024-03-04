const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema({
    title: { type: String, required: true },
    link_doc: { type: String },
    linked_trip: { type: Schema.Types.ObjectId, ref: 'Trip' },
    serial_phone: { type: String }
});

const userSchema = new Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    token: { type: String,},
    trips: [{ type: Schema.Types.ObjectId, ref: 'Trip' }],
    documents: [documentSchema]
});

const User = mongoose.model('User', userSchema);
module.exports = User;
