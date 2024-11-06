// models/Assignment.js
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    giver: String,
    recipient: String,
    code: String // Unique code for each assignment
});

module.exports = mongoose.model('Assignment', assignmentSchema);
