require('dotenv').config();
const ejs = require('ejs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const dotenv = require('dotenv');
// const bcrypt = require('bcrypt');
// const saltRounds = 12;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb://localhost:27017/userDB', {family:4, useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...')
);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser((_id, done) => {
  User.findById( _id).then(user => {
    done(null, user);
  }).catch(err => console.log(err));
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get('/', (req, res) => {
    res.render('home');
    }
);

app.get('/auth/google', 
    passport.authenticate("google", {scope: ["profile"]})
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.route('/login')
.get(function(req, res){
    res.render('login');
    }
)
.post(function(req, res){
    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({email: username}).then(foundUser => {
    //     if (foundUser) {
    //         bcrypt.compare(password, foundUser.password, function(err, result) {
    //             if(result === true)
    //             res.render('secrets');
    //             else
    //             res.send('Wrong password');
    //         });
    //     } else {
    //         res.send('User not found');
    //     }
    // }).catch(err => console.log(err));

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function(){
                res.redirect('/secrets');
            });
        }
    });
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

app.get('/secrets', (req, res) => {
    User.find({'secret': {$ne: null}}).then(foundUsers => {
        if(foundUsers){
            res.render('secrets', {usersWithSecrets: foundUsers});
        }
    }
    ).catch(err => console.log(err));
});

app.route('/submit')
.get(function(req, res) {
    if(req.isAuthenticated()){
        res.render('submit');
    } else {
        res.redirect('/login');
    }
})
.post(function(req, res) {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id).then(foundUser =>{
        if(err){
            console.log(err);
        } else {
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save().then(() => {
                    res.redirect('/secrets');
                }).catch(err => console.log(err));

            }
        }
    });
    
});


app.route('/register')
.get(function(req, res)  {
    res.render('register');
    }
)
.post(function(req, res)  {
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     if(!err){
    //         const newUser = new User({
    //             email: req.body.username,
    //             password: hash
    //         });
    //         newUser.save().then(() => {
    //             res.render('secrets');
    //         }).catch(err => console.log(err));
    //     } else {
    //         console.log(err);
    //     }
    // });


    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate('local')(req, res, function(){
                res.redirect('/secrets');
            });
        }
    });


});







app.listen(3000, () => {
    console.log('Server started on port 3000');
    }
);

