module.exports = function(app, passport) {
    var User = require('../models/user');
    var mongodb = require('promised-mongo');
    var mongoUrl = "mongodb://localhost:27017/users";
    var db = mongodb(mongoUrl);
    var menu = db.collection('menu');
    var news = db.collection('news');
    var users = db.collection('users');
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
        db.menu.find().toArray().then(function(docs){
            res.render('menu', {
                user: req.user,
                dishes : docs
            })
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
                newUser.cart = [];
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
    app.post('/addDish', function (req, res){
        var picture = req.files.picture;
        var picture64string = picture.data.toString('base64');
        var type = req.body.type;
        var newDish = {
            type : type,
            name : req.body.name,
            price : req.body.price,
            weight : req.body.weight,
            picture : picture64string
        }
        db.menu.insert(newDish);
        res.redirect('/menu');
    })
     /*Add dish to cart*/
    app.get('/toCart/*', function (req, res){
        var key = req.path;
        key = key.slice(8);
        db.menu.findOne({_id : mongodb.ObjectId(key)})
            .then(function(doc){
               var dishName = doc.name;
               db.users.update({email : req.user.email}, {$push: {"cart": dishName}})
                   .then(function(req, res){
                       res.redirect('/menu');
                   })
                   .catch(function(req, res){
                       res.status(500).end(err);
                   })
            })
        .catch(function(err){console.log(err);});
        res.redirect('/menu');
    })
    app.get('/cart', function(req, res){

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

    app.get('/sortedDishes', function(req, res){
        var key = req.query.search;
        db.menu.find({ price : { $lte : parseInt(key)}}).toArray().then (function(docs){
                console.log(JSON.stringify(docs));
                res.send(JSON.stringify(docs));
        })
    })
    app.get('/allDishes', function(req, res){
        db.menu.find().toArray()
            .then (function(docs){
                res.send(JSON.stringify(docs));
            })
    })



    app.get('/api/dishes', function (req, res) {
        db.menu.find().toArray().then(function(docs){
        var menu = [];
        for (var i = 0; i < docs.length; i++){
            var dish = {
                _id : docs[i]._id,
                type : docs[i].type,
                name : docs[i].name,
                price : docs[i].price,
                weight : docs[i].weight
            }
            menu.push(dish);
        }
        res.json(menu);
    });
    })
    app.post('/api/dishes', function(req, res){
        var newDish = {
            name: req.body.name,
            type : req.body.type,
            price : req.body.price,
            weight : req.body.weight
        }
        db.menu.insert(newDish);
        res.redirect('/api/dishes');
    })
    app.get('/api/dishes/:dish_id', function(req, res){
        var key = req.params.dish_id;
        console.log(key);
        db.menu.findOne({_id : mongodb.ObjectId(key)} ).then(function(docs){
           res.json(docs);
        });
    })
    app.get('/api/users/:user_id', function(req, res){
        var key = req.params.user_id;
        console.log(key);
        db.users.findOne({_id : mongodb.ObjectId(key)} ).then(function(docs){
            res.json(docs);
        });
    })
    app.post('/api/users', function(req, res){
        var newUser = new User();
        // set the user's credentials
        newUser.email    = req.body.email;
        newUser.password = newUser.generateHash(req.body.password);
        newUser.name = req.body.name;
        newUser.admin = false;
        newUser.purchases = 0;
        newUser.cart = [];
        // save the user
        newUser.save(function(err) {
            if (err)
                throw err;
        });
    })
    app.update('/api/users/:user_id', function (req, res){
        var key = req.params.user_id;
        db.users.update({_id : mongodb.ObjectId(key)}, {$set : {admin : req.body.admin}})
            .then (function(req, res){
            res.json({response : 1});
        })
            .catch(function(req, res){
            res.json({response : 0});
            })
    })
    app.remove('/api/users/:user_id', function(req, res){
        db.users.remove({_id : req.params.user_id})
            .then (function(req, res){
                res.json({response : 1});
            })
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