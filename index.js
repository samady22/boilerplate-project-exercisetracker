const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  username: { type: String, require: true, unique: true },
});

const exerciseSchema = new mongoose.Schema(
  {
    userId: { type: String, require: true },
    description: { type: String, require: true },
    duration: { type: Number, require: true },
    date: { type: Date, require: false },
  },
  {
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({ extended: true }));

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  try {
    const found = await User.findOne({ username });
    if (username === "") {
      res.json({ error: "invalid username" });
    } else {
      if (found) {
        res.json(found);
      } else {
        const createUser = new User({ username: username });
        createUser.save();
        res.json(createUser);
      }
    }
  } catch (error) {
    res.send(error);
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await User.find();
    res.send(allUsers);
  } catch (error) {
    res.send(error);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const { _id: userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newExercise = new Exercise({
      userId: userId,
      description: description,
      duration: Number(duration),
      date: !isNaN(new Date(date)) ? date : new Date(),
    });
    await newExercise.save();
    res.json({
      _id: user._id,
      username: user.username,
      date: newExercise.date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description,
    });
  } catch (error) {
    res.json(error);
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    const user = await User.findById(userId);

    if (!user) return res.json({ error: "User not found" });

    const query = { userId: userId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find(query)
      .select("description duration date")
      .limit(Number(limit));

    res.json({
      _id: userId,
      username: user.username,
      count: exercises.length,
      log: exercises.map((item) => ({
        description: item.description,
        duration: item.duration,
        date: item.date.toDateString(),
      })),
    });
  } catch (error) {
    res.json(error);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
