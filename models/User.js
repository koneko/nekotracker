//create mongoose model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//create temporary mail schema
//nah, create user schema, like a boss
var temporaryMailSchema = new Schema({
    mail: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    list: {
        type: Array,
        required: true,
        default: []
    }
});
//create temporary mail model
var User = mongoose.model('User', temporaryMailSchema);
//export temporary mail model
module.exports = User;