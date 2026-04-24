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

  console.log("DB READY");
}

function generateAccountNumber() {
  return "DX-" + Math.floor(100000000 + Math.random() * 900000000);
}

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

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
          INSERT INTO players (account_number, username, city, state)
          VALUES ($1, $2, $3, $4)
          RETURNING id, account_number, username, city, state, created_at;
          `,
          [accountNumber, data.username, data.city, data.state]
        );

        res.writeHead(200);
        res.end(JSON.stringify({
          playerId: result.rows[0].id,
          accountNumber: result.rows[0].account_number,
          username: result.rows[0].username,
          city: result.rows[0].city,
          state: result.rows[0].state
        }));
      } catch (err) {
        console.error("CREATE PLAYER ERROR:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Create player failed" }));
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
