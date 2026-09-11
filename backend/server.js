// ==========================================
// HEALTHGUARD AI - NODE.JS BACKEND
// SIH PROJECT
// ==========================================

// Import required packages
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// ==========================================
// CREATE EXPRESS APP
// ==========================================

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ==========================================
// MIDDLEWARE
// ==========================================

// Allows frontend to communicate with backend
app.use(cors());

// Allows backend to receive JSON data
app.use(express.json());

// ==========================================
// VARIABLES
// ==========================================

const PORT = 5000;

// Store latest sensor data
//.: added currentSituation tracker and hardware sensor models mapping
let currentSituation = "Normal";

let latestSensorData = {
  heartRate: 78,
  spo2: 98,
  bodyTemperature: 36.7,
  ambientTemperature: 28,
  humidity: 60,
  aqi: 45,
  ecg: 72,
  timestamp: new Date(),
  hardware: {
    esp32: "Connected",
    max30102: "Active",
    max30205: "Active",
    ad8232: "Active",
    bme280: "Active",
    ens160: "Active",
  },
};

// Current risk information
let currentRisk = {
  level: "LOW",
  score: 10,
  message: "Health parameters are within normal range.",
};

//.: Predefined situations for hardware demo simulation
const DEMO_SITUATIONS = {
  Normal: {
    heartRate: 75,
    spo2: 98,
    bodyTemperature: 36.6,
    ambientTemperature: 27,
    humidity: 55,
    aqi: 35,
    ecg: 72,
    situation: "Normal",
  },
  "Heat Stress": {
    heartRate: 110,
    spo2: 96,
    bodyTemperature: 39.2,
    ambientTemperature: 43.5,
    humidity: 78,
    aqi: 65,
    ecg: 95,
    situation: "Heat Stress",
  },
  "Cardiac Risk": {
    heartRate: 145,
    spo2: 92,
    bodyTemperature: 37.1,
    ambientTemperature: 28,
    humidity: 50,
    aqi: 40,
    ecg: 142,
    situation: "Cardiac Risk",
  },
  "Respiratory Risk": {
    heartRate: 115,
    spo2: 86,
    bodyTemperature: 37.9,
    ambientTemperature: 30,
    humidity: 65,
    aqi: 130,
    ecg: 90,
    situation: "Respiratory Risk",
  },
  Pollution: {
    heartRate: 88,
    spo2: 94,
    bodyTemperature: 36.8,
    ambientTemperature: 32,
    humidity: 70,
    aqi: 285,
    ecg: 80,
    situation: "Pollution",
  },
  Emergency: {
    heartRate: 165,
    spo2: 82,
    bodyTemperature: 40.2,
    ambientTemperature: 44,
    humidity: 80,
    aqi: 310,
    ecg: 160,
    situation: "Emergency",
  },
};

// ==========================================
// HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "HealthGuard AI Backend is running",
    status: "OK",
  });
});

// ==========================================
// GET LATEST SENSOR DATA
// ==========================================

app.get("/api/sensors/latest", (req, res) => {
  res.json({
    success: true,
    data: latestSensorData,
    risk: currentRisk,
    situation: currentSituation, //.
  });
});

//.: GET available demo situations
app.get("/api/demo/situations", (req, res) => {
  res.json({
    success: true,
    situations: Object.keys(DEMO_SITUATIONS),
    currentSituation: currentSituation,
  });
});

//.: POST endpoint to switch demo situation
app.post("/api/demo/situation", (req, res) => {
  const { situation } = req.body;
  if (DEMO_SITUATIONS[situation]) {
    currentSituation = situation;
    const base = DEMO_SITUATIONS[situation];
    latestSensorData = {
      ...latestSensorData,
      ...base,
      timestamp: new Date(),
    };
    currentRisk = calculateRisk(latestSensorData);
    io.emit("sensorUpdate", {
      sensors: latestSensorData,
      risk: currentRisk,
      situation: currentSituation,
    });
    return res.json({
      success: true,
      message: `Situation changed to ${situation}`,
      data: latestSensorData,
      risk: currentRisk,
      situation: currentSituation,
    });
  }
  res.status(400).json({ success: false, message: "Invalid situation name" });
});

// ==========================================
// RECEIVE SENSOR DATA FROM ESP32 OR MANUAL HARDWARE DISPLAY
// ==========================================

app.post("/api/sensors", (req, res) => {
  const data = req.body;

  //.: Allow hardware override and update latest sensor values
  if (data.situation) {
    currentSituation = data.situation;
  } else {
    currentSituation = "Custom Hardware Input";
  }

  latestSensorData = {
    ...latestSensorData,
    heartRate:
      data.heartRate !== undefined
        ? Number(data.heartRate)
        : latestSensorData.heartRate,
    spo2: data.spo2 !== undefined ? Number(data.spo2) : latestSensorData.spo2,
    bodyTemperature:
      data.bodyTemperature !== undefined
        ? Number(data.bodyTemperature)
        : latestSensorData.bodyTemperature,
    ambientTemperature:
      data.ambientTemperature !== undefined
        ? Number(data.ambientTemperature)
        : latestSensorData.ambientTemperature,
    humidity:
      data.humidity !== undefined
        ? Number(data.humidity)
        : latestSensorData.humidity,
    aqi: data.aqi !== undefined ? Number(data.aqi) : latestSensorData.aqi,
    ecg: data.ecg !== undefined ? Number(data.ecg) : latestSensorData.ecg,
    timestamp: new Date(),
  };

  // Calculate risk
  currentRisk = calculateRisk(latestSensorData);

  // Send updated data to every connected frontend
  io.emit("sensorUpdate", {
    sensors: latestSensorData,
    risk: currentRisk,
    situation: currentSituation, //.
  });

  res.json({
    success: true,
    message: "Sensor data received",
    data: latestSensorData,
    risk: currentRisk,
    situation: currentSituation,
  });
});

// ==========================================
// RISK CALCULATION
// ==========================================

function calculateRisk(data) {
  let score = 0;
  let customMsg = []; //.

  // ------------------------------
  // HEART RATE & ECG (MAX30102 / AD8232)
  // ------------------------------
  if (data.heartRate > 140) {
    score += 35;
    customMsg.push("Severe Tachycardia / Cardiac Stress");
  } else if (data.heartRate > 120) {
    score += 30;
    customMsg.push("Elevated Heart Rate");
  } else if (data.heartRate > 100) {
    score += 15;
  }

  // ------------------------------
  // SPO2 (MAX30102)
  // ------------------------------
  if (data.spo2 < 88) {
    score += 45;
    customMsg.push("Critical Hypoxia (Low SpO2)");
  } else if (data.spo2 < 92) {
    score += 30;
    customMsg.push("Low Oxygen Saturation");
  } else if (data.spo2 < 95) {
    score += 15;
  }

  // ------------------------------
  // BODY TEMPERATURE (MAX30205)
  // ------------------------------
  if (data.bodyTemperature > 39.5) {
    score += 35;
    customMsg.push("High Fever / Heat Hyperpyrexia");
  } else if (data.bodyTemperature > 38.5) {
    score += 20;
    customMsg.push("Elevated Body Temp");
  }

  // ------------------------------
  // AMBIENT TEMP (BME280)
  // ------------------------------
  if (data.ambientTemperature > 40) {
    score += 25;
    customMsg.push("Extreme Environmental Heat Stress");
  }

  // ------------------------------
  // AIR QUALITY (ENS160)
  // ------------------------------
  if (data.aqi > 250) {
    score += 35;
    customMsg.push("Hazardous Air Pollution Index");
  } else if (data.aqi > 150) {
    score += 25;
    customMsg.push("Poor Air Quality");
  } else if (data.aqi > 100) {
    score += 15;
  }

  // ------------------------------
  // DETERMINE RISK LEVEL
  // ------------------------------
  let level;
  let message;

  if (score >= 60) {
    level = "HIGH";
    message =
      customMsg.length > 0
        ? `CRITICAL RISK: ${customMsg.join(" • ")}`
        : "Multiple abnormal parameters detected. Immediate attention recommended.";
  } else if (score >= 30) {
    level = "MODERATE";
    message =
      customMsg.length > 0
        ? `WARNING: ${customMsg.join(" • ")}`
        : "Some health or environmental parameters require monitoring.";
  } else {
    level = "LOW";
    message = "Health parameters are within normal range.";
  }

  return {
    level: level,
    score: score,
    message: message,
  };
}

// ==========================================
// GET CURRENT RISK
// ==========================================

app.get("/api/risk/current", (req, res) => {
  res.json({
    success: true,
    risk: currentRisk,
    situation: currentSituation, //.
  });
});

// ==========================================
// DEMO DATA GENERATOR
// ==========================================

let demoMode = true;

// Generate natural realistic micro-variations based on currentSituation / manual settings
//.: modified to simulate live hardware signal jitter around current base values
function generateDemoData() {
  const jitter = (val, maxDelta = 2, isFloat = false) => {
    const delta = Math.random() * maxDelta * 2 - maxDelta;
    let res = val + delta;
    if (isFloat) return Number(res.toFixed(1));
    return Math.round(res);
  };

  latestSensorData = {
    ...latestSensorData,
    heartRate: Math.max(
      50,
      Math.min(190, jitter(latestSensorData.heartRate, 2)),
    ),
    spo2: Math.max(70, Math.min(100, jitter(latestSensorData.spo2, 0.5))),
    bodyTemperature: Math.max(
      35,
      Math.min(42, jitter(latestSensorData.bodyTemperature, 0.1, true)),
    ),
    ambientTemperature: Math.max(
      15,
      Math.min(50, jitter(latestSensorData.ambientTemperature, 0.2, true)),
    ),
    humidity: Math.max(20, Math.min(95, jitter(latestSensorData.humidity, 1))),
    aqi: Math.max(10, Math.min(500, jitter(latestSensorData.aqi, 2))),
    ecg: Math.max(50, Math.min(190, jitter(latestSensorData.ecg, 3))),
    timestamp: new Date(),
  };

  currentRisk = calculateRisk(latestSensorData);

  // Send data to frontend
  io.emit("sensorUpdate", {
    sensors: latestSensorData,
    risk: currentRisk,
    situation: currentSituation, //.
  });
}

// ==========================================
// START DEMO SIMULATION
// ==========================================

if (demoMode) {
  setInterval(() => {
    generateDemoData();
  }, 2000);
}

// ==========================================
// SOCKET.IO CONNECTION
// ==========================================

io.on("connection", (socket) => {
  console.log("Frontend connected:", socket.id);

  // Send current data immediately
  //.: include currentSituation
  socket.emit("sensorUpdate", {
    sensors: latestSensorData,
    risk: currentRisk,
    situation: currentSituation,
  });

  //.: Socket listener for frontend setting situation
  socket.on("setSituation", (sit) => {
    if (DEMO_SITUATIONS[sit]) {
      currentSituation = sit;
      latestSensorData = {
        ...latestSensorData,
        ...DEMO_SITUATIONS[sit],
        timestamp: new Date(),
      };
      currentRisk = calculateRisk(latestSensorData);
      io.emit("sensorUpdate", {
        sensors: latestSensorData,
        risk: currentRisk,
        situation: currentSituation,
      });
    }
  });

  //.: Socket listener for manual hardware sensor changes
  socket.on("manualSensorUpdate", (updatedSensors) => {
    currentSituation = updatedSensors.situation || "Custom Hardware Input";
    latestSensorData = {
      ...latestSensorData,
      ...updatedSensors,
      timestamp: new Date(),
    };
    currentRisk = calculateRisk(latestSensorData);
    io.emit("sensorUpdate", {
      sensors: latestSensorData,
      risk: currentRisk,
      situation: currentSituation,
    });
  });

  // When frontend disconnects
  socket.on("disconnect", () => {
    console.log("Frontend disconnected:", socket.id);
  });
});

// ==========================================
// START SERVER
// ==========================================

server.listen(PORT, () => {
  console.log("--------------------------------------");
  console.log("HealthGuard AI Backend");
  console.log("--------------------------------------");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Demo sensor simulation: ON");
  console.log("--------------------------------------");
});
