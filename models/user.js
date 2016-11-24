var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for user model
var userSchema = mongoose.Schema({
    name         : String,
    email        : String,
    password     : String,
    purchases    : Number,
    admin        : Boolean
});

// generate a hash for password
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);