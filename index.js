const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("MongoDB connected successfully");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

const exerciseSchema = new mongoose.Schema({
    userId: String,
    username: String,
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: String,
});

const userSchema = new mongoose.Schema({
    username: String,
});

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/api/users/delete', async function (_req, res) {
    console.log('### delete all users ###'.toLocaleUpperCase());
    try {
        const result = await User.deleteMany({});
        res.json({ message: 'All users have been deleted!', result: result });
    } catch (err) {
        console.error(err);
        res.json({ message: 'Deleting all users failed!' });
    }
});

app.get('/api/exercises/delete', async function (_req, res) {
    console.log('### delete all exercises ###'.toLocaleUpperCase());
    try {
        const result = await Exercise.deleteMany({});
        res.json({ message: 'All exercises have been deleted!', result: result });
    } catch (err) {
        console.error(err);
        res.json({ message: 'Deleting all exercises failed!' });
    }
});

app.get('/', async (_req, res) => {
    res.sendFile(__dirname + '/views/index.html');
    await User.syncIndexes();
    await Exercise.syncIndexes();
});

app.get('/api/users', async function (_req, res) {
    console.log('### get all users ###'.toLocaleUpperCase());
    try {
        const users = await User.find({});
        if (users.length === 0) {
            res.json({ message: 'There are no users in the database!' });
        } else {
            console.log('users in database: '.toLocaleUpperCase() + users.length);
            res.json(users);
        }
    } catch (err) {
        console.error(err);
        res.json({ message: 'Getting all users failed!' });
    }
});

app.post('/api/users', function (req, res) {
    const inputUsername = req.body.username;
    let newUser = new User({ username: inputUsername });
    console.log('creating a new user with username - '.toLocaleUpperCase() + inputUsername);
    newUser.save()
        .then(user => {
            res.json({ username: user.username, _id: user._id });
        })
        .catch(err => {
            console.error(err);
            res.json({ message: 'User creation failed!' });
        });
});

app.post('/api/users/:_id/exercises', function (req, res) {
    var userId = req.params._id;
    var description = req.body.description;
    var duration = req.body.duration;
    var date = req.body.date;

    if (!date) {
        date = new Date().toISOString().substring(0, 10);
    }

    console.log('looking for user with id ['.toLocaleUpperCase() + userId + '] ...');

    User.findById(userId)
        .then(function(dbUser){
          let newExercise = new Exercise({
            userId: dbUser._id,
            username: dbUser.username,
            description: description,
            duration: parseInt(duration),
            date: date,
        });
          newExercise.save()
                     .then(function(exercise){
                      res.json({
                        username: dbUser.username,
                        description: exercise.description,
                        duration: exercise.duration,
                        date: new Date(exercise.date).toDateString(),
                        _id: dbUser._id,
                    });
                     })
                     .catch(function(err){
                      console.log(err);
                     });
        })
        .catch(function(err){
          console.log(err);
        });

});

app.get('/api/users/:_id/logs', async function (req, res) {
    const userId = req.params._id;
    const from = req.query.from || new Date(0).toISOString().substring(0, 10);
    const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
    const limit = Number(req.query.limit) || 0;

    try {
        let user = await User.findById(userId).exec();
        console.log('looking for exercises with id ['.toLocaleUpperCase() + userId + '] ...');
        let exercises = await Exercise.find({
            userId: userId,
            date: { $gte: from, $lte: to },
        })
            .select('description duration date')
            .limit(limit)
            .exec();

        let parsedDatesLog = exercises.map((exercise) => {
            return {
                description: exercise.description,
                duration: exercise.duration,
                date: new Date(exercise.date).toDateString(),
            };
        });

        res.json({
            _id: user._id,
            username: user.username,
            count: parsedDatesLog.length,
            log: parsedDatesLog,
        });
    } catch (err) {
        console.error(err);
        res.json({ message: 'Error retrieving logs!' });
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
