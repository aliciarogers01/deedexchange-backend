const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT DEFAULT '',
      system_id TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS profile_picture TEXT DEFAULT '';
  `);
}

function formatProfile(row) {
  return {
    username: row.username,
    city: row.city,
    state: row.state,
    zip: row.zip,
    systemId: row.system_id,
    profilePicture: row.profile_picture || "",
    createdAt: row.created_at
  };
}

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
        systemId: "",
        profilePicture: "",
        createdAt: ""
      });
    }

    res.json(formatProfile(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

app.post("/profile", async (req, res) => {
  try {
    const { username, city, state, profilePicture } = req.body;

    if (!username || !city || !state || !profilePicture) {
      return res.status(400).json({
        error: "Username, city, state, and profile picture are required"
      });
    }

    const countResult = await pool.query("SELECT COUNT(*) FROM profiles");
    const nextNumber = Number(countResult.rows[0].count) + 1;
    const systemId = `DX-${String(nextNumber).padStart(10, "0")}`;

    const result = await pool.query(
      `INSERT INTO profiles (username, city, state, zip, system_id, profile_picture)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [username, city, state, "", systemId, profilePicture]
    );

    res.json({
      message: "Profile created successfully",
      profile: formatProfile(result.rows[0])
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});


// ================================
// 🔥 RESET ROUTE (FOR TESTING)
// ================================
app.delete("/profile", async (req, res) => {
  try {
    await pool.query("DELETE FROM profiles");
    res.json({ message: "All profiles deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete profiles" });
  }
});


const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await setupDatabase();
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database failed to connect:", error);
  }
}

startServer();
