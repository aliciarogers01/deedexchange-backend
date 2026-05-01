const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      username TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      system_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

setupDatabase();

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/test", (req, res) => {
  res.json({ message: "Unity connected successfully 🚀" });
});

app.get("/profile", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM profiles ORDER BY id DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.json({
        username: "",
        city: "",
        state: "",
        zip: "",
        systemId: ""
      });
    }

    const profile = result.rows[0];

    res.json({
      username: profile.username,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      systemId: profile.system_id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

app.post("/profile", async (req, res) => {
  try {
    const { username, city, state, zip, systemId } = req.body;

    const result = await pool.query(
      `INSERT INTO profiles (username, city, state, zip, system_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [username, city, state, zip, systemId]
    );

    res.json({
      message: "Profile saved successfully",
      profile: {
        username: result.rows[0].username,
        city: result.rows[0].city,
        state: result.rows[0].state,
        zip: result.rows[0].zip,
        systemId: result.rows[0].system_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
