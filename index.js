const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Temporary in-memory profile storage
// This will reset whenever Railway restarts.
// Later we will replace this with a database.
let profile = {
  username: "",
  city: "",
  state: "",
  zip: "",
  systemId: ""
};

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/test", (req, res) => {
  res.json({ message: "Unity connected successfully 🚀" });
});

app.get("/profile", (req, res) => {
  res.json(profile);
});

app.post("/profile", (req, res) => {
  const { username, city, state, zip, systemId } = req.body;

  profile = {
    username,
    city,
    state,
    zip,
    systemId
  };

  res.json({
    message: "Profile saved successfully",
    profile
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
