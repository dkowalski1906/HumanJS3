import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import * as Humanjs from "@vladmandic/human";
import * as tf from "@tensorflow/tfjs-node";

const config = {
  backend: "webgl",
  modelBasePath: "file://models/",
};

const human = new Humanjs.Human(config);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const result = {
  emotion: [
    {
      emotion: "happy",
      score: 1,
    },
  ],
};

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("image", async (data) => {
    if (!data) {
      return;
    }
    const buffer = Buffer.from(data);
    const tensor = human.tf.node.decodeImage(buffer);

    const result = await human.detect(tensor);
    console.log("start");
    console.log(result);
    console.log("end");

    socket.emit("data", result);
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
