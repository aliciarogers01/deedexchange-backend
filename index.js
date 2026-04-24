const http = require("http");

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {

  // Allow JSON
  res.setHeader("Content-Type", "application/json");

  // ROUTE: CREATE PLAYER
  if (req.method === "POST" && req.url === "/create-player") {

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        const accountNumber = "DX-" + Math.floor(100000000 + Math.random() * 900000000);

        res.writeHead(200);
        res.end(JSON.stringify({
          accountNumber: accountNumber,
          username: data.username,
          city: data.city,
          state: data.state
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    return;
  }

  // DEFAULT ROUTE
  res.writeHead(200);
  res.end(JSON.stringify({
    message: "DeedExchange backend is running"
  }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
