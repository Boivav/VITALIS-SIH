//.: Added useEffect, useContext, createContext for real-time Node.js integration
import React, { useState, useEffect, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Wind,
  Thermometer,
  Gauge,
  Bell,
  Bot,
  Cpu,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  Battery,
  Sparkles,
  ShieldCheck,
  Sliders,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { io } from "socket.io-client"; //.: import socket.io-client
import "./index.css";

//.: Health Context & Provider for real-time backend integration
const HealthContext = createContext();

const SOCKET_URL = "http://localhost:5000";

export function HealthProvider({ children }) {
  const [sensors, setSensors] = useState({
    heartRate: 75,
    spo2: 98,
    bodyTemperature: 36.6,
    ambientTemperature: 27,
    humidity: 55,
    aqi: 35,
    ecg: 72,
  });

  const [risk, setRisk] = useState({
    level: "LOW",
    score: 10,
    message: "Health parameters are within normal range.",
  });

  const [situation, setSituationState] = useState("Normal");
  const [isConnected, setIsConnected] = useState(false) ;
  const [socket, setSocket] = useState(null) ;

  const [historyData, setHistoryData] = useState([
    { t: "06:00", hr: 72, spo2: 98, temp: 36.5, aq: 32, ecg: 70 },
    { t: "09:00", hr: 75, spo2: 98, temp: 36.6, aq: 35, ecg: 72 },
    { t: "12:00", hr: 78, spo2: 97, temp: 36.7, aq: 40, ecg: 74 },
  ]);

  useEffect(() => {
    //.: Establish socket connection to Node.js backend
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Node.js backend socket");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Node.js backend");
      setIsConnected(false);
    });

    //.: Receive real-time sensor updates from Node.js backend
    newSocket.on("sensorUpdate", (data) => {
      if (data.sensors) {
        setSensors(data.sensors);
        const nowStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setHistoryData((prev) => {
          const next = [
            ...prev,
            {
              t: nowStr,
              hr: data.sensors.heartRate,
              spo2: data.sensors.spo2,
              temp: data.sensors.bodyTemperature,
              aq: data.sensors.aqi,
              ecg: data.sensors.ecg,
            },
          ];
          return next.slice(-12); // Keep last 12 points
        });
      }

      if (data.risk) {
        setRisk(data.risk);
      }

      if (data.situation) {
        setSituationState(data.situation);
      }
    });

    // Initial fetch fallback
    fetch(`${SOCKET_URL}/api/sensors/latest`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          if (resData.data) setSensors(resData.data);
          if (resData.risk) setRisk(resData.risk);
          if (resData.situation) setSituationState(resData.situation);
        }
      })
      .catch(() => {});

    return () => newSocket.close();
  }, []);

  //.: Function to set predefined demo situations
  const triggerSituation = (sitName) => {
    if (socket && isConnected) {
      socket.emit("setSituation", sitName);
    } else {
      fetch(`${SOCKET_URL}/api/demo/situation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: sitName }),
      }).catch((err) => console.error("Error setting situation:", err));
    }
  };

  //.: Function to manually alter hardware sensor data
  const updateSensor = (updatedFields) => {
    const newPayload = { ...sensors, ...updatedFields };
    setSensors(newPayload);

    if (socket && isConnected) {
      socket.emit("manualSensorUpdate", newPayload);
    } else {
      fetch(`${SOCKET_URL}/api/sensors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayload),
      }).catch((err) =>
        console.error("Error posting manual sensor data:", err),
      );
    }
  };

  return (
    <HealthContext.Provider
      value={{
        sensors,
        risk,
        situation,
        isConnected,
        historyData,
        triggerSituation,
        updateSensor,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

//.: Custom hook for using Health Context
export function useHealth() {
  return useContext(HealthContext);
}

//.: Hardware Sensors Control Display component
function HardwareSensorControls() {
  const { sensors, updateSensor, situation } = useHealth();

  return (
    <div className="card p-6 bg-slate-900 text-white mt-6 rounded-2xl shadow-xl border border-slate-800">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-widest">
            <Cpu size={16} /> Hardware Sensor Control Panel
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Manual Hardware Input Simulation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Altering parameters sends live signals from hardware models to the
            Node.js backend.
          </p>
        </div>
        <span className="text-xs bg-teal-500/20 text-teal-300 font-bold px-3 py-1.5 rounded-full border border-teal-500/30">
          Active Situation: {situation}
        </span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* ESP32 Controller */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-teal-300">ESP32</span>
            <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-mono">
              Main MCU
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Central controller broadcasting live sensor feeds.
          </p>
          <div className="mt-3 text-xs text-slate-300 flex justify-between">
            <span>
              Status: <strong className="text-teal-400">Connected</strong>
            </span>
            <span>
              Battery: <strong>87%</strong>
            </span>
          </div>
        </div>

        {/* MAX30102 Sensor */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-teal-300">MAX30102</span>
            <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono">
              HR + SpO₂
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Heart Rate:</span>
                <strong className="text-teal-300">
                  {sensors.heartRate} BPM
                </strong>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={sensors.heartRate}
                onChange={(e) =>
                  updateSensor({ heartRate: Number(e.target.value) })
                }
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>SpO₂ Level:</span>
                <strong className="text-teal-300">{sensors.spo2} %</strong>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                value={sensors.spo2}
                onChange={(e) => updateSensor({ spo2: Number(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* MAX30205 Sensor */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-teal-300">MAX30205</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono">
              Body Temp
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Body Temperature:</span>
              <strong className="text-teal-300">
                {sensors.bodyTemperature} °C
              </strong>
            </div>
            <input
              type="range"
              min="35.0"
              max="42.0"
              step="0.1"
              value={sensors.bodyTemperature}
              onChange={(e) =>
                updateSensor({ bodyTemperature: Number(e.target.value) })
              }
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>
        </div>

        {/* AD8232 Sensor */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-teal-300">AD8232</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono">
              ECG Activity
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>ECG Signal Rate:</span>
              <strong className="text-teal-300">{sensors.ecg} BPM</strong>
            </div>
            <input
              type="range"
              min="50"
              max="180"
              value={sensors.ecg}
              onChange={(e) => updateSensor({ ecg: Number(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>
        </div>

        {/* BME280 Sensor */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-teal-300">BME280</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">
              Ambient Temp & Humidity
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Ambient Temp:</span>
                <strong className="text-teal-300">
                  {sensors.ambientTemperature} °C
                </strong>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="0.5"
                value={sensors.ambientTemperature}
                onChange={(e) =>
                  updateSensor({ ambientTemperature: Number(e.target.value) })
                }
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Humidity:</span>
                <strong className="text-teal-300">{sensors.humidity} %</strong>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                value={sensors.humidity}
                onChange={(e) =>
                  updateSensor({ humidity: Number(e.target.value) })
                }
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ENS160 Sensor */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-teal-300">ENS160</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
              Air Quality (AQI)
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Air Quality Index:</span>
              <strong className="text-teal-300">{sensors.aqi} AQI</strong>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              value={sensors.aqi}
              onChange={(e) => updateSensor({ aqi: Number(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }) {
  const [o, setO] = useState(false),
    nav = useNavigate(),
    //.: read backend situation & triggerSituation from useHealth context
    { situation, triggerSituation, isConnected } = useHealth(),
    items = [
      ["/dashboard", "Overview", Activity],
      ["/history", "Health History", HeartPulse],
      ["/devices", "Devices", Cpu],
      ["/insights", "AI Insights", Sparkles],
      ["/assistant", "VITALIS AI", Bot],
      ["/reports", "Reports", FileText],
      ["/settings", "Settings", Settings],
    ];

  //.: Preset situation buttons required by user
  const situationOptions = [
    "Normal",
    "Heat Stress",
    "Cardiac Risk",
    "Respiratory Risk",
    "Pollution",
    "Emergency",
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside
        className={`${o ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-30 w-64 h-screen bg-white border-r p-5 transition-transform`}
      >
        <div className="flex justify-between mb-8">
          <button onClick={() => nav("/dashboard")} className="text-left">
            <div className="text-2xl font-black">
              VITALIS<span className="text-teal-500">.</span>
            </div>
            <div className="text-[10px] tracking-[.25em] text-slate-400">
              AIoT HEALTH
            </div>
          </button>
          <button className="md:hidden" onClick={() => setO(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-3">
          Workspace
        </div>
        <nav className="space-y-1">
          {items.map(([to, l, I]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setO(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isActive ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50"}`
              }
            >
              <I size={18} />
              {l}
            </NavLink>
          ))}
        </nav>
        <div className="card p-4 mt-8 bg-slate-900 text-white">
          <ShieldCheck size={19} className="text-teal-300" />
          <div className="font-bold text-sm mt-3">Wellness first</div>
          <p className="text-xs text-slate-300 leading-5">
            Monitoring and wellness, not medical diagnosis.
          </p>
        </div>
        <button
          onClick={() => nav("/")}
          className="mt-6 flex gap-2 items-center text-sm text-slate-400 px-3"
        >
          <LogOut size={16} />
          Exit demo
        </button>
      </aside>
      {o && (
        <div
          onClick={() => setO(false)}
          className="fixed inset-0 bg-slate-900/20 z-20 md:hidden"
        />
      )}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header Bar */}
        <header className="bg-white border-b flex flex-col md:flex-row items-start md:items-center justify-between px-5 md:px-8 py-3 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setO(true)}>
              <Menu />
            </button>
            <div>
              <div className="text-xs text-slate-400">
                Demo Situations & Live Node.js Sync
              </div>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Active:{" "}
                <span className="text-teal-600 font-extrabold">
                  {situation}
                </span>
              </div>
            </div>
          </div>

          {/* .: Demo Situation Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden lg:inline">
              Simulations:
            </span>
            {situationOptions.map((sit) => {
              const active = situation === sit;
              return (
                <button
                  key={sit}
                  onClick={() => triggerSituation(sit)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm ${
                    active
                      ? "bg-teal-600 text-white ring-2 ring-teal-400 scale-105"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  [{sit}]
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 ml-auto md:ml-0">
            {/* .: Node.js Backend Connection Indicator */}
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
                isConnected
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <Wifi size={14} />
              {isConnected ? "Blutooth Connected" : "Connecting..."}
            </span>
            <Bell size={19} className="text-slate-500" />
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
              V
            </div>
          </div>
        </header>
        <div className="p-5 md:p-8 max-w-[1500px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

function Landing() {
  let n = useNavigate();
  const { sensors, risk } = useHealth(); //.

  return (
    <div className="min-h-screen bg-white">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between">
        <div>
          <div className="text-2xl font-black">
            VITALIS<span className="text-teal-500">.</span>
          </div>
          <div className="text-[9px] tracking-[.3em] text-slate-200">
            AIoT HEALTH COMPANION
          </div>
        </div>
        <button
          onClick={() => n("/dashboard")}
          className="btn bg-slate-900 text-white"
        >
          Open Demo
        </button>
      </nav>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
            <Sparkles size={14} />
            AI + IoT wellness monitoring
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-6 leading-[.98]">
            Understand your health.
            <br />
            <span className="text-teal-500">Act smarter.</span>
          </h1>
          <p className="text-lg text-slate-700 mt-7 max-w-xl leading-8">
            Connected sensor data, personal baselines, trends and AI-powered
            explanations in one simple companion.
          </p>
          <button
            onClick={() => n("/dashboard")}
            className="btn bg-teal-600 text-white mt-8 px-6"
          >
            Get started
          </button>
        </div>
        <div className="card p-5 bg-slate-950 text-white">
          <div className="flex justify-between mb-5">
            <div>
              <div className="text-xs text-slate-300">
                LIVE WELLNESS SNAPSHOT
              </div>
              <b>Today</b>
            </div>
            <span className="text-xs bg-teal-500/20 text-teal-300 px-3 py-1.5 rounded-full">
              DEMO MODE
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              [HeartPulse, "Heart rate", `${sensors.heartRate} BPM`],
              [Wind, "SpO₂", `${sensors.spo2} %`],
              [Thermometer, "Body temp", `${sensors.bodyTemperature} °C`],
              [Gauge, "AQI", `${sensors.aqi}`],
            ].map(([I, a, b]) => (
              <div className="bg-white/5 rounded-2xl p-4" key={a}>
                <I size={18} className="text-teal-300" />
                <div className="text-xs text-slate-300 mt-4">{a}</div>
                <div className="text-2xl font-black">{b}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-teal-500/10">
            <div className="text-xs text-teal-300">VITALIS AI STATUS</div>
            <p className="text-sm font-semibold text-slate-200">
              {risk.message}
            </p>
          </div>
        </div>
      </section>
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-xs font-bold tracking-widest text-teal-600">
            HOW IT WORKS
          </div>
          <h2 className="text-4xl font-black mt-2">
            Connect. Monitor. Understand. Improve.
          </h2>
          <div className="grid md:grid-cols-4 gap-4 mt-10">
            {[
              "Connect sensors",
              "Collect readings",
              "Understand trends",
              "Act on insights",
            ].map((x, i) => (
              <div className="card p-6" key={x}>
                <div className="text-3xl font-black text-slate-400">
                  0{i + 1}
                </div>
                <div className="font-bold mt-8">{x}</div>
                <p className="text-sm text-slate-700 mt-2">
                  A clear, human-friendly health data flow.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ I, label, value, unit, sub }) {
  return (
    <div className="card p-5">
      <div className="flex justify-between">
        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <I size={18} />
        </div>
        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
          LIVE
        </span>
      </div>
      <div className="text-sm text-slate-400 mt-5">{label}</div>
      <div className="mt-1">
        <span className="text-3xl font-black">{value}</span>{" "}
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-400 mt-2">{sub}</div>
    </div>
  );
}

function Dashboard() {
  //.: connect real-time state from useHealth
  const { sensors, risk, situation, historyData } = useHealth();

  return (
    <Layout>
      <div className="mb-6">
        <div className="text-xs text-teal-600 font-bold uppercase tracking-widest">
          Good day
        </div>
        <h1 className="text-3xl md:text-4xl font-black mt-1">
          Your health at a glance
        </h1>
        <p className="text-slate-400 mt-1">
          Connected Node.js backend & hardware simulation controls.
        </p>
      </div>

      {/* .: Live Risk Alert Status Banner */}
      <div
        className={`p-4 rounded-2xl mb-6 flex items-start gap-4 border transition-all ${
          risk.level === "HIGH"
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : risk.level === "MODERATE"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-teal-50 border-teal-200 text-teal-900"
        }`}
      >
        {risk.level === "HIGH" ? (
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={22} />
        ) : (
          <CheckCircle className="text-teal-600 shrink-0 mt-0.5" size={22} />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm uppercase tracking-wide">
              {risk.level} RISK LEVEL (Score: {risk.score})
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/80 border">
              Scenario: {situation}
            </span>
          </div>
          <p className="text-sm font-semibold mt-1 leading-relaxed">
            {risk.message}
          </p>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric
          I={HeartPulse}
          label="Heart rate (MAX30102)"
          value={sensors.heartRate}
          unit="BPM"
          sub="Live sensor pulse"
        />
        <Metric
          I={Wind}
          label="SpO₂ (MAX30102)"
          value={sensors.spo2}
          unit="%"
          sub="Blood oxygen level"
        />
        <Metric
          I={Thermometer}
          label="Body temp (MAX30205)"
          value={sensors.bodyTemperature}
          unit="°C"
          sub="Skin thermal probe"
        />
        <Metric
          I={Gauge}
          label="Air quality (ENS160)"
          value={sensors.aqi}
          unit="AQI"
          sub={`Ambient: ${sensors.ambientTemperature}°C`}
        />
        <Metric
          I={Activity}
          label="ECG Signal (AD8232)"
          value={sensors.ecg}
          unit="BPM"
          sub="Electrical cardiac trace"
        />
      </div>

      {/* Real-time Trend Charts */}
      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between">
            <div>
              <h2 className="font-black">Real-time Heart Rate Trend</h2>
              <p className="text-xs text-slate-400">
                Live stream from Node.js backend
              </p>
            </div>
            <b className="text-2xl">
              {sensors.heartRate} <small className="text-slate-400">BPM</small>
            </b>
          </div>
          <div className="h-64 mt-5">
            <ResponsiveContainer>
              <AreaChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" />
                <YAxis domain={[50, 180]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="hr"
                  stroke="#0d9488"
                  fill="#0d9488"
                  strokeWidth={3}
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-black">Wellness Score</h2>
          <div className="flex justify-center py-8">
            <div
              className={`w-36 h-36 rounded-full border-[12px] flex items-center justify-center ${
                risk.level === "HIGH"
                  ? "border-rose-200 text-rose-700"
                  : risk.level === "MODERATE"
                    ? "border-amber-200 text-amber-700"
                    : "border-teal-200 text-teal-700"
              }`}
            >
              <div className="text-center">
                <div className="text-4xl font-black">
                  {Math.max(0, 100 - risk.score)}
                </div>
                <div className="text-[10px] text-slate-400">/ 100</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500 text-center font-medium">
            {risk.message}
          </p>
        </div>
      </div>

      {/* .: Hardware Sensor Simulation Controls embedded in Dashboard */}
      <HardwareSensorControls />
    </Layout>
  );
}

function History() {
  const { historyData } = useHealth(); //.

  return (
    <Layout>
      <h1 className="text-3xl font-black">Health history</h1>
      <p className="text-slate-400 mt-2">
        Explore live real-time sensor measurements and trends from Node.js.
      </p>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        {[
          ["Heart rate (MAX30102)", "hr", "BPM", 50, 180, "#0d9488"],
          ["SpO₂ (MAX30102)", "spo2", "%", 70, 100, "#0284c7"],
          ["Body temperature (MAX30205)", "temp", "°C", 35, 42, "#f59e0b"],
          ["Air quality (ENS160)", "aq", "AQI", 0, 500, "#10b981"],
        ].map(([t, k, u, a, b, color]) => (
          <div className="card p-6" key={k}>
            <div className="flex justify-between">
              <h2 className="font-black">{t}</h2>
              <span className="text-xs text-slate-400">Live stream</span>
            </div>
            <div className="h-56 mt-5">
              <ResponsiveContainer>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="t" />
                  <YAxis domain={[a, b]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={k}
                    stroke={color}
                    strokeWidth={3}
                    dot={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-400">
              Live hardware stream · unit: {u}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function Devices() {
  const { sensors, isConnected } = useHealth(); //.

  return (
    <Layout>
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black">Hardware & Sensors</h1>
          <p className="text-slate-400 mt-1">
            VITALIS ESP32 controller and connected sensor array.
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded-full font-bold text-sm ${
            isConnected
              ? "bg-teal-100 text-teal-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {isConnected ? "ESP32 Controller Online" : "Connecting to ESP32..."}
        </span>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex justify-between flex-wrap gap-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Cpu />
            </div>
            <div>
              <h2 className="font-black">ESP32 Health Monitor (Main MCU)</h2>
              <div className="text-sm text-slate-400">
                ESP32_001 · Port 5000 · Socket connected
              </div>
            </div>
          </div>
          <span className="text-teal-600 font-bold flex items-center gap-1">
            <Wifi size={16} /> Online
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-7">
          {[
            [
              "MAX30102",
              "Heart rate + SpO₂",
              `${sensors.heartRate} BPM / ${sensors.spo2}%`,
            ],
            ["MAX30205", "Body temperature", `${sensors.bodyTemperature} °C`],
            ["AD8232", "Electrical cardiac activity", `${sensors.ecg} BPM ECG`],
            [
              "BME280",
              "Ambient temp & humidity",
              `${sensors.ambientTemperature} °C / ${sensors.humidity}%`,
            ],
            ["ENS160", "Air quality index", `${sensors.aqi} AQI`],
          ].map(([a, b, val]) => (
            <div className="bg-slate-50 rounded-xl p-4 border" key={a}>
              <b className="text-sm">{a}</b>
              <div className="text-xs text-slate-500 mt-1">{b}</div>
              <div className="text-sm font-bold text-teal-700 mt-2">{val}</div>
              <div className="text-[10px] text-teal-600 font-bold mt-2">
                CONNECTED & ACTIVE
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-xs text-slate-400 flex items-center gap-2">
          <Battery size={14} className="inline text-teal-600" /> Lithium-ion
          3.7V Battery · 87%
        </div>
      </div>

      {/* .: Interactive Hardware Controls Component */}
      <HardwareSensorControls />
    </Layout>
  );
}

function Insights() {
  const { sensors, risk } = useHealth(); //.

  return (
    <Layout>
      <h1 className="text-3xl font-black">AI insights</h1>
      <p className="text-slate-400 mt-2">
        Explainable observations derived from your connected hardware signals.
      </p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        {[
          [
            "Cardiovascular Status (MAX30102 / AD8232)",
            `Current heart rate is ${sensors.heartRate} BPM with ECG rate of ${sensors.ecg} BPM. ${risk.message}`,
          ],
          [
            "Thermal Balance (MAX30205)",
            `Body temperature is ${sensors.bodyTemperature} °C with ambient surroundings at ${sensors.ambientTemperature} °C.`,
          ],
          [
            "Environment & AQI (ENS160)",
            `Current Air Quality Index (AQI) is ${sensors.aqi} with humidity at ${sensors.humidity}%.`,
          ],
        ].map(([a, b]) => (
          <div className="card p-6" key={a}>
            <Sparkles className="text-teal-500" />
            <h2 className="font-black mt-5">{a}</h2>
            <p className="text-sm text-slate-500 leading-6 mt-3">{b}</p>
            <button className="text-xs font-bold text-teal-600 mt-5">
              View reasoning →
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function Assistant() {
  const { sensors, risk, situation } = useHealth(); //.
  const [m, setM] = useState([
    {
      r: "ai",
      t: "Hi. I’m VITALIS AI. I am directly connected to your ESP32 hardware sensors. Ask me about your real-time heart rate, SpO2, body temperature, or ambient AQI.",
    },
  ]);
  const [q, setQ] = useState("");

  const send = () => {
    if (!q.trim()) return;
    let x = q.toLowerCase();
    let a = "";

    if (x.includes("heart") || x.includes("bpm") || x.includes("ecg")) {
      a = `Live MAX30102 Heart Rate is ${sensors.heartRate} BPM, and AD8232 ECG signal is ${sensors.ecg} BPM. Active Situation: ${situation}.`;
    } else if (x.includes("spo2") || x.includes("oxygen")) {
      a = `Live MAX30102 SpO₂ level is ${sensors.spo2}%. Risk evaluation: ${risk.message}.`;
    } else if (
      x.includes("temp") ||
      x.includes("fever") ||
      x.includes("heat")
    ) {
      a = `Live MAX30205 Body Temperature is ${sensors.bodyTemperature} °C (Ambient: ${sensors.ambientTemperature} °C).`;
    } else if (
      x.includes("aqi") ||
      x.includes("pollution") ||
      x.includes("air")
    ) {
      a = `Live ENS160 Air Quality Index is ${sensors.aqi} AQI.`;
    } else {
      a = `Current status: Heart Rate ${sensors.heartRate} BPM, SpO₂ ${sensors.spo2}%, Temp ${sensors.bodyTemperature}°C, AQI ${sensors.aqi}. Overall Risk: ${risk.level}.`;
    }

    setM((v) => [...v, { r: "u", t: q }, { r: "ai", t: a }]);
    setQ("");
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-black">VITALIS AI Companion</h1>
        <p className="text-slate-400 mt-2">
          Ask questions about your live connected hardware sensors.
        </p>
        <div className="card mt-6 overflow-hidden">
          <div className="p-5 border-b flex gap-3">
            <Bot className="text-teal-500" />
            <div>
              <b>Health companion</b>
              <div className="text-xs text-slate-400">
                Connected to Node.js & ESP32 · Situation: {situation}
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4 min-h-[380px] bg-slate-50">
            {m.map((x, i) => (
              <div key={i} className={x.r === "u" ? "text-right" : ""}>
                <span
                  className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 text-sm text-left ${
                    x.r === "u"
                      ? "bg-slate-900 text-white"
                      : "bg-white border shadow-sm"
                  }`}
                >
                  {x.t}
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="e.g. What is my heart rate and SpO2?"
              className="flex-1 rounded-xl bg-slate-50 px-4 py-3 outline-none border"
            />
            <button onClick={send} className="btn bg-teal-600 text-white">
              Ask
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Reports() {
  return (
    <Layout>
      <h1 className="text-3xl font-black">Reports</h1>
      <p className="text-slate-400 mt-2">
        Wellness summaries for different periods.
      </p>
      <div className="grid md:grid-cols-3 gap-5 mt-6">
        {["Weekly report", "Monthly report", "Custom report"].map((x) => (
          <div className="card p-6" key={x}>
            <FileText className="text-teal-500" />
            <h2 className="font-black mt-5">{x}</h2>
            <p className="text-sm text-slate-500 mt-2">
              Averages, trends, activity and AI wellness summary.
            </p>
            <button className="btn bg-slate-900 text-white mt-5 w-full">
              Generate
            </button>
          </div>
        ))}
      </div>
      <div className="card p-6 mt-5 text-sm text-slate-500">
        <b>Disclaimer:</b> This report is for wellness monitoring and
        informational purposes only. It is not a medical diagnosis.
      </div>
    </Layout>
  );
}

function SettingsPage() {
  return (
    <Layout>
      <h1 className="text-3xl font-black">Settings</h1>
      <p className="text-slate-400 mt-2">
        Manage your profile and preferences.
      </p>
      <div className="max-w-2xl card p-6 mt-6 space-y-5">
        {[
          ["Name", "VITALIS User"],
          ["Email", "demo@vitalis.app"],
          ["Height", "—"],
          ["Activity goal", "60 min / day"],
        ].map(([a, b]) => (
          <div key={a}>
            <label className="text-xs font-bold text-slate-500">{a}</label>
            <input
              defaultValue={b}
              className="w-full mt-2 rounded-xl bg-slate-50 px-4 py-3 outline-none border"
            />
          </div>
        ))}
        <button className="btn bg-teal-600 text-white">Save preferences</button>
      </div>
    </Layout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/history" element={<History />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

//.: Wrap App with HealthProvider for real-time socket data
createRoot(document.getElementById("root")).render(
  <HealthProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HealthProvider>,
);
