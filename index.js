process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const http = require("http");
const { Pool } = require("pg");

const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS account_number TEXT;`);
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS username TEXT;`);
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS city TEXT;`);
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS state TEXT;`);
  await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_image TEXT;`);

  console.log("DB READY");
}

function generateAccountNumber() {
  return "DX-" + Math.floor(100000000 + Math.random() * 900000000);
}

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  // GET PLAYER
  if (req.method === "GET" && req.url.startsWith("/player")) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const accountNumber = url.searchParams.get("accountNumber");

      pool.query(
        `
        SELECT id, account_number, username, city, state, profile_image
        FROM players
        WHERE account_number = $1;
        `,
        [accountNumber]
      ).then(result => {
        if (result.rows.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Player not found" }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          playerId: result.rows[0].id,
          accountNumber: result.rows[0].account_number,
          username: result.rows[0].username,
          city: result.rows[0].city,
          state: result.rows[0].state,
          profileImage: result.rows[0].profile_image
        }));
      }).catch(err => {
        console.error("GET PLAYER ERROR:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Fetch player failed" }));
      });
    } catch (err) {
      console.error("GET PLAYER ERROR:", err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Fetch player failed" }));
    }

    return;
  }

  // CREATE PLAYER
  if (req.method === "POST" && req.url === "/create-player") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const accountNumber = generateAccountNumber();

        const result = await pool.query(
          `
          INSERT INTO players (account_number, username, city, state, profile_image)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, account_number, username, city, state, profile_image;
          `,
          [
            accountNumber,
            data.username,
            data.city,
            data.state,
            data.profileImage || ""
          ]
        );

        res.writeHead(200);
        res.end(JSON.stringify({
          playerId: result.rows[0].id,
          accountNumber: result.rows[0].account_number,
          username: result.rows[0].username,
          city: result.rows[0].city,
          state: result.rows[0].state,
          profileImage: result.rows[0].profile_image
        }));
      } catch (err) {
        console.error("CREATE PLAYER ERROR:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Create player failed" }));
      }
    });

    return;
  }

  // UPDATE PLAYER
  if (req.method === "POST" && req.url === "/update-player") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        const result = await pool.query(
          `
          UPDATE players
          SET username = $1,
              city = $2,
              state = $3,
              profile_image = $4
          WHERE account_number = $5
          RETURNING id, account_number, username, city, state, profile_image;
          `,
          [
            data.username,
            data.city,
            data.state,
            data.profileImage || "",
            data.accountNumber
          ]
        );

        if (result.rows.length === 0) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Player not found" }));
          return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          playerId: result.rows[0].id,
          accountNumber: result.rows[0].account_number,
          username: result.rows[0].username,
          city: result.rows[0].city,
          state: result.rows[0].state,
          profileImage: result.rows[0].profile_image
        }));
      } catch (err) {
        console.error("UPDATE PLAYER ERROR:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Update player failed" }));
      }
    });

    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    message: "DeedExchange backend is running"
  }));
});

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
