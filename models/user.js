var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var Schema = mongoose.Schema;

var dishSchema = mongoose.Schema({
    name : String,
    price : Number
})

// define the schema for user model
var userSchema = mongoose.Schema({
    name         : String,
    email        : String,
    password     : String,
    purchases    : Number,
    admin        : Boolean,
    cart         : [dishSchema]
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