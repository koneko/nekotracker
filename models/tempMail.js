//create mongoose model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//create temporary mail schema, set its time to live to 5 minutes
var temporaryMailSchema = new Schema({
    mail: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    expires: 300
});
//create temporary mail model
var temporaryMail = mongoose.model('temporaryMail', temporaryMailSchema);
//export temporary mail model
module.exports = temporaryMail;