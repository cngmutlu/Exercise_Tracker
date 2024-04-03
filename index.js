const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// MongoDB schemas
const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  description: {type: String, required: true},
  duration: {type: String, required: true},
  date: String
});

// MongoDB Models

let User = mongoose.model('User', userSchema);

let Exercise = mongoose.model('Exercise', exerciseSchema);

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

// GET requests
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', function(req,res) {
  User.find({}).select({"__v":0})
  .then(function(users) {
    res.send(users);
  })
  .catch(function(err) {
    console.log(err);
  });
});

app.get('/api/users/:id/logs', function(req,res) {
  let userIdParam = req.params.id;
  let dbUserName = "";
  let ExeCount = 0;
  User.find({_id: userIdParam})
  .then(function(dbUser) {
    dbUserName = dbUser.username;
  })
  .catch(function(err) {
    console.log(err);
  });
  Exercise.countDocuments({userId: userIdParam})
  .then(function(count) {
    ExeCount = count;
  })
  .catch(function(err) {
    console.log(err);
  });
  Exercise.find({userId: userIdParam}).select({"username":0, "_id": 0})
  .then(function(exercises) {
    res.json({username: dbUserName,
              count: ExeCount,
              _id: userIdParam,
              log: exercises});
  })
  .catch(function(err) {
    console.log(err);
  });
});

// POST requests
app.post('/api/users', function(req,res) {
  let newPerson = new User({username: req.body.username});
  newPerson.save()
  .then(function(user) {
    res.json({username: user.username, _id: user._id});
  })
  .catch(function(err) {
    console.log(err);
  });
});

app.post('/api/users/:id/exercises', function(req,res) {
  let userId = req.params.id;
  let desc = req.body.description;
  let dur = req.body.duration;
  let date = req.body.date;
  if(!date) {
    date = new Date().toDateString();
  }
  User.findById(userId)
  .then(function(dbUser) {
    let newExercise = new Exercise({
      userId: dbUser._id,
      username: dbUser.username,
      description: desc,
      duration: parseInt(dur),
      date: date
    });
    newExercise.save()
    .then(function(Exercise) {
      res.json({
        username: Exercise.username,
        description: Exercise.description,
        duration: Exercise.duration,
        date: Exercise.date,
        _id: Exercise.userId
      });
    })
    .catch(function(err) {
      console.log(err);
    });
  })
  .catch(function(err) {
    console.log(err);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
