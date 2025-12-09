const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const VIDEO_DIR = path.join(__dirname, "videos");

app.use(express.static("public"));

// 영상 목록 보내기
app.get("/videos", (req, res) => {
  try {
    const files = fs
      .readdirSync(VIDEO_DIR)
      .filter((f) => f.endsWith(".mp4") || f.endsWith(".mkv") || f.endsWith(".webm"));

    const list = files.map((file) => ({
      title: path.parse(file).name,
      file: file,
    }));

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read video directory" });
  }
});

// 스트리밍
app.get("/stream/:filename", (req, res) => {
  const filePath = path.join(VIDEO_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Range 헤더 없는 경우 → 전체 파일 전송
  if (!range) {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Range 헤더 있는 경우 → 일부만 보내기 (시크바 이동 가능)
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const CHUNK_SIZE = 10 ** 6;
  const end = parts[1]
    ? parseInt(parts[1], 10)
    : Math.min(start + CHUNK_SIZE, fileSize - 1);

  if (start >= fileSize) {
    res.status(416).send("Requested range not satisfiable\n" + start + " >= " + fileSize);
    return;
  }

  const contentLength = end - start + 1;
  const head = {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  res.writeHead(206, head);
  const stream = fs.createReadStream(filePath, { start, end });
  stream.pipe(res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});