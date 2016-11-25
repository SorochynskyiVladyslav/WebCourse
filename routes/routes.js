module.exports = function(app, passport) {
    var User = require('../models/user');
    var mongodb = require('promised-mongo');
    var mongoUrl = "mongodb://localhost:27017/users";
    var db = mongodb(mongoUrl);
    var menu = db.collection('menu');
    var news = db.collection('news');
    var ObjectId = require('mongodb').ObjectID;

    /*Get home page*/
    app.get('/', function(req, res) {
        db.news.find().toArray().then(function(docs){
            res.render('index', {
                user : req.user,
                news : docs
            })
        })
    });



    app.get('/menu', function(req, res, next) {
        var salad, hot, garnish, dessert, drink;
        db.menu.find({type : 'salad'}).toArray().then(function(docs){
            salad = docs;
            db.menu.find({type : 'hot'}).toArray().then(function(docs){
                hot = docs;
                db.menu.find({type : 'garnish'}).toArray().then(function(docs){
                    garnish = docs;
                    db.menu.find({type : 'dessert'}).toArray().then(function(docs){
                        dessert = docs;
                        db.menu.find({type : 'drink'}).toArray().then(function(docs){
                            drink = docs;
                            res.render('menu', {
                                user : req.user,
                                salad : salad,
                                hot : hot,
                                garnish : garnish,
                                dessert : dessert,
                                drink : drink
                            })
                        });
                    });
                });
            });
        });
    });
    /*Profile page, register and login*/
    app.get('/register', function(req, res) {
        res.render('register', { message: req.flash('signupMessage') });
    });
    app.post('/register', function (req, res) {
        var message;
        User.findOne({ 'email' :  req.body.email }, function(err, user) {
            if (err)
                return err;
            // check to see if there is already a user with that email
            if (user) {
                res.render('register', { message : 'That email is already taken.'});
            } else {
                // if there is no user with that email create the user
                var newUser = new User();
                // set the user's credentials
                newUser.email    = req.body.email;
                newUser.password = newUser.generateHash(req.body.password);
                newUser.name = req.body.name;
                newUser.admin = false;
                newUser.purchases = 0;
                // save the user
                newUser.save(function(err) {
                    if (err)
                        throw err;
                });
                res.render('profile', { user : newUser});
            }
        })
    });
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile', {
            user : req.user // get the user out of session and pass to template
        });
    });
    app.get('/login', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
    /*Add news on the main page*/
    app.post('/addNews', function(req, res){
     var picture = req.files.picture;
     var picture64string = picture.data.toString('base64');
     var newPost = {
     heading : req.body.heading,
     text : req.body.text,
     picture : picture64string
     }
     db.news.insert(newPost);
     res.redirect('/');
     })
     /*Add menu to cart*/
    app.get('/toCart/*', function (req, res){
        res.redirect('/menu');
    })
    /*Delete post on the main page*/
    app.get('/deleteNews/*', function (req, res){
        var key = req.path;
        key = key.slice(12);
        db.news.remove({_id : mongodb.ObjectId(key)} );
        res.redirect('/');
    })
    app.get('/deleteDish/*', function (req, res){
        var key = req.path;
        key = key.slice(12);
        db.menu.remove({_id : mongodb.ObjectId(key)} );
        res.redirect('/menu');
    })
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

function loggedIn (req, res, next) {
    if (req.isAuthenticated())
        return true;
    return false;
}