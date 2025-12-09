const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.static("public"));

app.get("/videos", (req, res) => {
  const dir = "./videos";
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".mp4"));
  const result = files.map(f => ({ title: path.parse(f).name, file: f }));
  res.json(result);
});

app.get("/stream/:filename", (req, res) => {
  const filePath = `./videos/${req.params.filename}`;
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  const range = req.headers.range;
  if (!range) {
    res.status(416).send("Requires Range header");
    return;
  }

  const CHUNK_SIZE = 10 ** 6;
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

  const stream = fs.createReadStream(filePath, { start, end });
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": "video/mp4"
  });

  stream.pipe(res);
});

app.listen(3000, () => console.log("Server running on port 3000"));