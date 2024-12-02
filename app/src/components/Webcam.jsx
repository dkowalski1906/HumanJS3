import React, { useEffect, useRef, useState } from "react";
import ReactWebcam from "react-webcam";
import { io } from "socket.io-client";

const FPS = 4;

const emotionToEmoji = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprised: "😮",
  neutral: "😐",
  fear: "😨",
  disgust: "🤢",
  unknown: "❓",
};

const ageToEmoji = {
  baby: "👶",
  young: "🧒",
  adult: "🧑",
  old: "👴",
  veryOld: "🦳",
};

const handEmoji = "🖐️";

const categorizeAge = (age) => {
  if (age < 3) return "baby";
  if (age < 18) return "young";
  if (age < 50) return "adult";
  if (age < 90) return "old";
  return "veryOld";
};

export function Webcam() {
  const webCamRef = useRef();
  const canvasRef = useRef();
  const socket = io("http://localhost:3000", {
    transports: ["websocket"],
  });

  const [emotion, setEmotion] = useState("unknown");
  const [age, setAge] = useState(0);
  const [mode, setMode] = useState("emotion"); // État du mode : "emotion" ou "age"
  const [handsDetected, setHandsDetected] = useState([]); // État pour savoir si des mains sont détectées

  const snap = () => webCamRef.current?.getScreenshot();

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.connected);
    });

    const interval = setInterval(async () => {
      const image = snap();
      if (!image) return;

      const data = await fetch(image);
      const blob = await data.blob();
      const arraybuffer = await blob.arrayBuffer();
      socket.emit("image", arraybuffer);

      socket.on("data", (result) => {
        const emotions = result.face[0]?.emotion || [];
        const detectedEmotion = emotions.reduce(
          (prev, current) =>
            prev.probability > current.probability ? prev : current,
          { emotion: "unknown", probability: 0 }
        );
        setEmotion(detectedEmotion.emotion);

        const age = result.face[0]?.age || 0;
        setAge(age);

        const hands = result.hand || [];
        setHandsDetected(hands);

        const faceBox = result.face[0]?.box || [];
        const handBoxes = hands.map(hand => hand.box || []); // Récupérer les coordonnées de toutes les mains

        if (faceBox.length === 4) {
          const [xMin, yMin, xMax, yMax] = faceBox;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          canvas.width = webCamRef.current.video.videoWidth;
          canvas.height = webCamRef.current.video.videoHeight;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const smileySize = 200;
          const centerX = (xMin + (xMax - xMin) / 2);
          const centerY = yMin + (yMax - yMin) / 2;

          const content = mode === "emotion" 
            ? emotionToEmoji[detectedEmotion.emotion] || "❓" 
            : ageToEmoji[categorizeAge(age)];

          ctx.font = `${smileySize * 0.7}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "black";
          ctx.fillText(content, centerX, centerY);

          handsDetected.forEach((hand, index) => {
            const handBox = handBoxes[index] || [];
            if (handBox.length === 4) {
              const [hxMin, hyMin, hxMax, hyMax] = handBox;
              const handCenterX = hxMin + (hxMax - hxMin) / 2;
              const handCenterY = hyMin + (hyMax - hyMin) / 2;

              ctx.font = `${smileySize * 0.7}px Arial`;
              ctx.fillText(handEmoji, handCenterX, handCenterY);
            }
          });
        }
      });
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [socket, mode, handsDetected]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <ReactWebcam
        ref={webCamRef}
        screenshotFormat="image/jpeg"
        style={{ width: "100%", height: "auto" }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          border: "2px solid red",
        }}
      />
      <div style={{ marginTop: "10px", textAlign: "center" }}>
        <button onClick={() => setMode(mode === "emotion" ? "age" : "emotion")}>
          Switch to {mode === "emotion" ? "Age Mode" : "Emotion Mode"}
        </button>
        <p>
          {mode === "emotion"
            ? `Current Emotion: ${emotion} ${emotionToEmoji[emotion] || "❓"}`
            : `Age: ${age} years ${ageToEmoji[categorizeAge(age)]}`}
        </p>
      </div>
    </div>
  );
}
