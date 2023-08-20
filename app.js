require('dotenv').config();
const ejs = require('ejs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect('mongodb://localhost:27017/userDB', {family:4, useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...')
);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = new mongoose.model('User', userSchema);



app.get('/', (req, res) => {
    res.render('home');
    }
);

app.route('/login')
.get(function(req, res){
    res.render('login');
    }
)
.post(function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}).then(foundUser => {
        if (foundUser) {
            if (foundUser.password === password) {
                res.render('secrets');
            } else {
                res.send('Wrong password');
            }
        } else {
            res.send('User not found');
        }
    }).catch(err => console.log(err));
});

app.route('/register')
.get(function(req, res)  {
    res.render('register');
    }
)
.post(function(req, res)  {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save().then(() => {
        res.render('secrets');
    }).catch(err => console.log(err));
    
});







app.listen(3000, () => {
    console.log('Server started on port 3000');
    }
);

