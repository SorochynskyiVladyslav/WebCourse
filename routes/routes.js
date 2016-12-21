module.exports = function(app, passport) {
    var User = require('../models/user');
    var bcrypt   = require('bcrypt-nodejs');
    var mongodb = require('mongodb');
    //var mongoUrl = 'mongodb://localhost:27017/users';
    var mongoUrl = 'mongodb://vlad:vlad@ds133328.mlab.com:33328/web_course';
    var ObjectId = require('mongodb').ObjectID;

    var mongo = require('mongodb').MongoClient;


    /*Get home page*/
    app.get('/', function(req, res) {
        mongo.connect(mongoUrl, function(err, db){
            var news = db.collection('news');
            news.find({}).toArray(function(err, docs) {
                if (err)
                    res.render('error', {message : err.message, error:err});
                res.render('index', {
                    user : req.user,
                    news : docs
                })
            });
        })
    });
    app.get('/menu', function(req, res, next) {
        mongo.connect(mongoUrl, function(err, db){
            var menu = db.collection('menu');
            menu.find({}).toArray(function(err, docs) {
                if (err)
                    res.render('error', {message : err.message, error:err});
                res.render('menu', {
                    user : req.user,
                    dishes : docs
                })
            });
        })
    });
    app.get('/contacts', function(req, res, next){
        res.render('contacts', {
            user : req.user
        });
    })
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
     mongo.connect(mongoUrl, function(err, db){
         var news = db.collection('news');
         console.log("Connected to database!");
         news.insert({
             heading : req.body.heading,
             text : req.body.text,
             picture : picture64string
         },
             (function(err, docs) {
                if (err)
                     res.render('error', {message : err.message, error:err});
                else
                    res.redirect('/');
         }));
        })
     })
    app.post('/addDish', function (req, res){
        var picture = req.files.picture;
        var picture64string = picture.data.toString('base64');
        var type = req.body.type;

        mongo.connect(mongoUrl, function(err, db){
            var menu = db.collection('menu');
            console.log("Connected to database!");
            menu.insert({
                    type : type,
                    name : req.body.name,
                    price : req.body.price,
                    weight : req.body.weight,
                    picture : picture64string
                },
                (function(err) {
                    if (err) res.render('error', {message : err.message, error:err});
                    else res.redirect('/menu');
                }));
        })
    })
    app.get('/toCart/:dish_id', function (req, res){
        mongo.connect(mongoUrl, function(err, db){
            var menu = db.collection('menu');
            var users = db.collection('users');
            menu.findOne({_id : ObjectId(req.params.dish_id)},
                function(err, doc) {
                    if (err) res.render('error', {message : err.message, error:err});
                    var dishName = doc.name;
                    users.updateOne({email : req.user.email}, {$push: {"cart": dishName}},
                        function(err){
                            if (err) res.render('error', {message : err.message, error:err});
                            else res.redirect('/menu');
                        });
                });
        })
    })
    app.get('/cart', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var users = db.collection('users');
            var menu = db.collection('menu');
            users.findOne({_id : ObjectId(req.user._id)},
            function (err, docs){
                var cart = docs.cart;
                var result = [];
                menu.find({}).toArray(function(err, doc){
                    for (var i = 0; i < cart.length; i++){
                        for (var j = 0; j < doc.length; j++){
                            if (cart[i] == doc[j].name) {
                                var dish = {name : doc[j].name,
                                    price: doc[j].price}
                                result.push(dish);
                                continue;
                            }
                        }
                    }
                    res.render('cart', {
                        user : req.user,
                        cart : result
                    });
                })
            })
        })
    })
    app.get('/buy', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var users = db.collection('users');
            var menu = db.collection('menu');
            users.findOne({_id : ObjectId(req.user._id)},
                function (err, docs){
                    var cart = docs.cart;
                    var result = [];
                    menu.find({}).toArray(function(err, doc){
                    for (var i = 0; i < cart.length; i++){
                        for (var j = 0; j < doc.length; j++){
                            if (cart[i] == doc[j].name) {
                                var dish = {name : doc[j].name,
                                    price: doc[j].price}
                                result.push(dish);
                                continue;
                            }
                        }
                    }
                    var sum = 0;
                    for(var i = 0; i < result.length; i++){
                        sum += result[i].price;
                    }
                    users.updateOne({_id : ObjectId(req.user._id)}, {$set:{"cart":[]}, $inc:{"purchases":sum}},
                        function(err){
                        if (err) res.render('error', {message : err.message, error:err});
                    })
                    var orders = db.collection('orders');
                    orders.insert({
                        user : req.user._id,
                        cart : result,
                        sum : sum
                    }, function(err){
                        if (err) res.render('error', {message : err.message, error:err});
                        else res.redirect('/profile');
                    })
                    })
                })
        })
    })
    app.get('/deleteNews/*', function (req, res){
        var key = req.path;
        key = key.slice(12);
        mongo.connect(mongoUrl, function(err, db){
            var news = db.collection('news');
            news.deleteOne({ _id: ObjectId(key) },(function(err) {
                if (err)
                    res.render('error', {message : err.message, error:err});
                else res.redirect('/');
            }));
        })
    })
    app.get('/deleteDish/*', function (req, res){
        var key = req.path;
        key = key.slice(12);
        mongo.connect(mongoUrl, function(err, db){
            var menu = db.collection('menu');
            menu.deleteOne({ _id: ObjectId(key) },(function(err) {
                if (err)
                    res.render('error', {message : err.message, error:err});
                else res.redirect('/menu');
            }));
        })
    })
    app.get('/sortedDishes', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var menu = db.collection('menu');
            menu.find({type : req.query.type}).toArray(function(err, docs) {
                if (err) res.render('error', {message : err.message, error:err});
                res.send(JSON.stringify(docs));
            });
        })
    })
    app.get('/allDishes', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var menu = db.collection('menu');
            menu.find({}).toArray(function(err, docs) {
                if (err) res.render('error', {message : err.message, error:err});
                res.send(JSON.stringify(docs));
            });
        })
    })
    app.get('/api/users/:user_id', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var users = db.collection('users');
            users.findOne({_id : ObjectId(req.params.user_id)}, function(err, docs) {
                if (err) res.json(err);
                else res.json(docs);
            });
        })
    })
    app.post('/api/users', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var users = db.collection('users');
            users.insert({purchases: 0, admin: false, name: req.body.name,
                    password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null),
                    email: req.body.email, cart: []},
                function(err){
                    if (err) res.json(err);
                    else res.json({response:1});
                });
        })
    })
    app.put('/api/users/:user_id', function (req, res){
        mongo.connect(mongoUrl, function(err, db){
            var users = db.collection('users');
            users.updateOne({_id : ObjectId(req.params.user._id)}, {$set:{admin : req.body.admin}},
                function(err){
                    if (err) res.json(err);
                    else res.json({response:1});
                });
        })
    })
    app.delete('/api/users/:user_id', function(req, res){
        mongo.connect(mongoUrl, function(err, db){
            var users = db.collection('users');
            users.deleteOne({_id : ObjectId(req.params.user._id)}, function(err) {
                if (err) res.json(err);
                else res.json({response : 1});
            });
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