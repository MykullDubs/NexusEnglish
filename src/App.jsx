import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Thermometer, Pill, Clock, Baby, PawPrint, Ruler, Weight,
  ChevronRight, Trash2, Activity, StickyNote, Calendar, UserPlus,
  X, TrendingUp, List, LogOut, LogIn, Mail, Lock, Unlock, AlertCircle, RefreshCw,
  Utensils, Droplets, Bone, Settings, ArrowUp, ArrowDown, 
  Eye, EyeOff, Download, GripHorizontal, Stethoscope,
  Bell, BellRing, Minus, Pencil, Droplet, Repeat, Check, User
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, deleteDoc, updateDoc, setDoc, getDoc,
  doc, onSnapshot, query, orderBy, writeBatch, Timestamp, where
} from "firebase/firestore";
import { Reorder, motion, useAnimation } from "framer-motion";

// --- 1. PASTE YOUR FIREBASE CONFIG HERE ---
  const firebaseConfig = {
    apiKey: "AIzaSyCfjzFY_yZQv66hF_Ob9-wHk1klKBe5rHw",
    authDomain: "nexusenglish-3e9c3.firebaseapp.com",
    databaseURL: "https://nexusenglish-3e9c3-default-rtdb.firebaseio.com",
    projectId: "nexusenglish-3e9c3",
    storageBucket: "nexusenglish-3e9c3.firebasestorage.app",
    messagingSenderId: "18259366717",
    appId: "1:18259366717:web:5cd2e6239f58b18b9f6b54",
    measurementId: "G-YX9PTFX8G5"
  };

// --- 2. Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helpers ---
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (years === 0) return `${months}m`;
  return `${years}y`;
};

// --- Components ---
const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-slate-800 text-white shadow-lg shadow-slate-200 hover:bg-slate-900",
    child: "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700",
    pet: "bg-amber-600 text-white shadow-lg shadow-amber-200 hover:bg-amber-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    google: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 w-full",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    activeOutline: "bg-slate-50 border-2 border-indigo-500 text-indigo-700"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const RollerInput = ({ value, onChange, step = 1, min = 0, max = 999, unit = '', label = '' }) => {
  const handleIncrement = () => {
    const current = parseFloat(value) || 0;
    if (current + step <= max) onChange((current + step).toFixed(step < 1 ? 1 : 0));
  };
  const handleDecrement = () => {
    const current = parseFloat(value) || 0;
    if (current - step >= min) onChange((current - step).toFixed(step < 1 ? 1 : 0));
  };
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <button type="button" onClick={handleDecrement} className="w-14 h-14 flex items-center justify-center bg-white text-slate-600 active:bg-slate-100 border-r border-slate-100 touch-manipulation"><Minus size={24} /></button>
        <div className="flex-1 flex items-center justify-center relative h-14"><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-full text-center bg-transparent font-bold text-xl text-slate-800 outline-none appearance-none m-0 p-0 z-10" placeholder="0" />{unit && <span className="absolute right-4 text-xs text-slate-400 font-medium pointer-events-none">{unit}</span>}</div>
        <button type="button" onClick={handleIncrement} className="w-14 h-14 flex items-center justify-center bg-white text-slate-600 active:bg-slate-100 border-l border-slate-100 touch-manipulation"><Plus size={24} /></button>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

const SimpleLineChart = ({ data, colorHex, unit, title }) => {
  if (!data || data.length < 2) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
        <h4 className="text-slate-500 font-medium mb-2">{title}</h4>
        <div className="text-slate-300 text-sm">Not enough data points yet</div>
      </div>
    );
  }
  const values = data.map(d => parseFloat(d.value));
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;
  const dates = data.map(d => new Date(d.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;
  const width = 100;
  const height = 50;
  const padding = 2;
  const points = data.map(d => {
    const x = ((new Date(d.date).getTime() - minDate) / dateRange) * (width - padding * 2) + padding;
    const y = height - (((parseFloat(d.value) - minVal) / range) * (height - padding * 2) + padding);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-end mb-4">
        <h4 className="font-bold text-slate-700">{title}</h4>
        <span className="text-xs text-slate-400">Last: {data[data.length-1].value}{unit}</span>
      </div>
      <div className="relative aspect-[2/1] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <line x1="0" y1="0" x2={width} y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f1f5f9" strokeWidth="0.5" />
          <line x1="0" y1={height} x2={width} y2={height} stroke="#f1f5f9" strokeWidth="0.5" />
          <polyline fill="none" stroke={colorHex} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
          {data.map((d, i) => {
             const x = ((new Date(d.date).getTime() - minDate) / dateRange) * (width - padding * 2) + padding;
             const y = height - (((parseFloat(d.value) - minVal) / range) * (height - padding * 2) + padding);
             return <circle key={i} cx={x} cy={y} r="1.5" fill="white" stroke={colorHex} strokeWidth="1" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-2">
        <span>{new Date(minDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
        <span>{new Date(maxDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
      </div>
    </div>
  );
};

// --- DAD-BOD TRACKER COMPONENT ---
function DadBodTracker({ user }) {
  const [sliderCals, setSliderCals] = useState(300);
  const [foodNote, setFoodNote] = useState("");
  
  const [todayCalories, setTodayCalories] = useState(0);
  const [calorieLogs, setCalorieLogs] = useState([]);
  
  const [currentWeight, setCurrentWeight] = useState("");
  const [latestWeight, setLatestWeight] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);

  // Settings State (IF & Goals)
  const [eatStart, setEatStart] = useState("12:00");
  const [eatEnd, setEatEnd] = useState("20:00");
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) return;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Fetch Calorie Logs
    const calQuery = query(collection(db, `users/${user.uid}/calories`), orderBy("timestamp", "desc"));
    const unsubCals = onSnapshot(calQuery, (snapshot) => {
      const logs = [];
      let todayTotal = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({ id: doc.id, ...data });
        if (data.timestamp && data.timestamp.toDate() >= startOfToday) {
          todayTotal += data.amount;
        }
      });
      setCalorieLogs(logs);
      setTodayCalories(todayTotal);
    });

    // 2. Fetch Weight Logs
    const weightQuery = query(collection(db, `users/${user.uid}/weights`), orderBy("timestamp", "desc"));
    const unsubWeight = onSnapshot(weightQuery, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      setWeightLogs(logs);
      if (logs.length > 0) setLatestWeight(logs[0].weight);
    });

    // 3. Fetch Settings
    const settingsRef = doc(db, `users/${user.uid}/settings/dadbod`);
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        if (docSnap.data().eatStart) {
          setEatStart(docSnap.data().eatStart);
          setEatEnd(docSnap.data().eatEnd);
        }
        if (docSnap.data().calorieGoal) {
          setCalorieGoal(docSnap.data().calorieGoal);
        }
      }
    });

    return () => { unsubCals(); unsubWeight(); unsubSettings(); };
  }, [user]);

  const handleLogCalories = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, `users/${user.uid}/calories`), {
      amount: Number(sliderCals),
      note: foodNote || "Quick Add",
      timestamp: Timestamp.now()
    });
    setSliderCals(300);
    setFoodNote("");
  };

  const handleLogWeight = async (e) => {
    e.preventDefault();
    if (!user || !currentWeight) return;
    await addDoc(collection(db, `users/${user.uid}/weights`), { 
      weight: Number(currentWeight), 
      timestamp: Timestamp.now() 
    });
    setCurrentWeight("");
  };

  const handleDeleteCalorie = async (id) => {
    if(window.confirm("Delete this log?")) await deleteDoc(doc(db, `users/${user.uid}/calories`, id));
  };

  const handleDeleteWeight = async (id) => {
    if(window.confirm("Delete this weight entry?")) await deleteDoc(doc(db, `users/${user.uid}/weights`, id));
  };

  const saveDadBodSettings = async (start, end, goal) => {
    setEatStart(start);
    setEatEnd(end);
    setCalorieGoal(goal);
    if (user) await setDoc(doc(db, `users/${user.uid}/settings/dadbod`), { eatStart: start, eatEnd: end, calorieGoal: goal }, { merge: true });
  };

  const checkCompliance = (timestamp) => {
    if (!timestamp) return true;
    const date = timestamp.toDate();
    const logTime = date.getHours() + date.getMinutes() / 60;
    
    const [sH, sM] = eatStart.split(':').map(Number);
    const startTime = sH + sM / 60;
    
    const [eH, eM] = eatEnd.split(':').map(Number);
    const endTime = eH + eM / 60;

    if (startTime < endTime) return logTime >= startTime && logTime <= endTime;
    return logTime >= startTime || logTime <= endTime;
  };

  const weightChartData = [...weightLogs].reverse().map(l => ({
    date: l.timestamp?.toDate().toISOString() || new Date().toISOString(),
    value: l.weight
  }));

  const formatTime = (timestamp) => timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (timestamp) => timestamp?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysCalorieLogs = calorieLogs.filter(log => log.timestamp?.toDate() >= startOfToday);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12">
      
      {/* 1. MASTER DASHBOARD STATS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Today's Intake</p>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">
              {todayCalories} <span className="text-lg text-slate-400 font-medium">/ {calorieGoal}</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-sm font-medium mb-1">Current Weight</p>
            <div className="text-2xl font-bold text-slate-800">{latestWeight || "--"} <span className="text-sm text-slate-400 font-medium">lbs</span></div>
          </div>
        </div>
        
        {/* IF Schedule Banner */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 text-sm font-medium text-slate-600">
          <Clock size={16} className="text-blue-500" />
          <span>Eating Window: <span className="text-blue-600 font-bold">{eatStart} - {eatEnd}</span></span>
        </div>
      </div>

      {/* 2. CALORIE SLIDER & TIMELINE */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold">Quick Calorie Log</h2>
          </div>
          <button type="button" onClick={() => setShowSettings(!showSettings)} className="text-xs font-bold text-blue-500 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg transition-all active:scale-95">
            <Settings size={12}/> Target & IF
          </button>
        </div>

        {/* Hidden Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
              <div className="col-span-2">
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Daily Calorie Goal</label>
                  <input type="number" step="50" value={calorieGoal} onChange={(e) => saveDadBodSettings(eatStart, eatEnd, Number(e.target.value))} className="w-full bg-white border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Window Start</label>
                  <input type="time" value={eatStart} onChange={(e) => saveDadBodSettings(e.target.value, eatEnd, calorieGoal)} className="w-full bg-white border-none rounded-lg px-2 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Window End</label>
                  <input type="time" value={eatEnd} onChange={(e) => saveDadBodSettings(eatStart, e.target.value, calorieGoal)} className="w-full bg-white border-none rounded-lg px-2 py-2 text-sm font-bold text-slate-700 outline-none shadow-sm focus:ring-2 focus:ring-blue-500" />
              </div>
          </div>
        )}

        <form onSubmit={handleLogCalories} className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-5xl font-black text-blue-600 tracking-tighter">{sliderCals}</span>
            </div>
            <input 
              type="range" min="50" max="2500" step="50" value={sliderCals}
              onChange={(e) => setSliderCals(e.target.value)}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          <input 
            type="text" placeholder="What did you eat? (Optional)" value={foodNote} onChange={(e) => setFoodNote(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-2xl shadow-lg flex justify-center gap-2 transition-all active:scale-95">
            <Plus className="w-6 h-6" /> Log {sliderCals} Calories
          </button>
        </form>

        {todaysCalorieLogs.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Today's Logs</h3>
            <div className="space-y-3">
              {todaysCalorieLogs.map(log => {
                const isCompliant = checkCompliance(log.timestamp);
                return (
                  <div key={log.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${isCompliant ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-200 shadow-sm'}`}>
                    <div>
                      <div className="font-semibold text-slate-700 flex items-center gap-2">
                        {log.note}
                        {!isCompliant && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Fasting</span>}
                      </div>
                      <div className={`text-xs ${isCompliant ? 'text-slate-400' : 'text-red-400 font-medium'}`}>{formatTime(log.timestamp)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-black ${isCompliant ? 'text-blue-600' : 'text-red-600'}`}>{log.amount} <span className="text-xs font-medium opacity-60">kcal</span></span>
                      <button onClick={() => handleDeleteCalorie(log.id)} className={`${isCompliant ? 'text-slate-300 hover:text-red-500' : 'text-red-300 hover:text-red-600'} p-1 transition-colors`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. WEIGHT TRACKER & GRAPH */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Weight className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold">Daily Weigh-In</h2>
        </div>
        
        <form onSubmit={handleLogWeight} className="flex gap-3">
          <input 
            type="number" step="0.1" placeholder="e.g. 185.5" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)}
            className="flex-1 min-w-0 bg-slate-50 border-none rounded-2xl px-4 py-4 text-slate-700 text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={!currentWeight} className="w-14 shrink-0 bg-indigo-600 disabled:bg-slate-300 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95">
            <Check className="w-6 h-6" />
          </button>
        </form>

        {weightChartData.length > 0 && (
          <div className="pt-4">
             <SimpleLineChart 
                data={weightChartData} 
                title="Weight Trend" 
                unit=" lbs" 
                colorHex="#6366f1" 
             />
             <div className="mt-4 max-h-32 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                {weightLogs.map(log => (
                  <div key={log.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg">
                    <span className="text-slate-500">{formatDate(log.timestamp)}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-700">{log.weight} lbs</span>
                      <button onClick={() => handleDeleteWeight(log.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);

  // App Settings State
  const [settings, setSettings] = useState({
    tempUnit: 'C', 
    weightUnit: 'kg', 
    heightUnit: 'cm', 
    dashboardOrder: [
      { id: 'symptom', visible: true, label: 'Symptom' },
      { id: 'medicine', visible: true, label: 'Medicine' },
      { id: 'nutrition', visible: true, label: 'Nutrition' },
      { id: 'growth', visible: true, label: 'Growth' },
      { id: 'doctor', visible: true, label: 'Doctor Visit' }
    ]
  });

  // Loading & Error States
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // UI States
  const [viewMode, setViewMode] = useState('timeline');
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isMedicineOpen, setIsMedicineOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReorderLocked, setIsReorderLocked] = useState(true);
  
  // Dad-bod Mode Toggle State
  const [isDadBodMode, setIsDadBodMode] = useState(false);
  const controls = useAnimation();

  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data Form States
  const [newChildName, setNewChildName] = useState('');
  const [newProfileType, setNewProfileType] = useState('child');
  const [newHeight, setNewHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newBloodType, setNewBloodType] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Unified Log Form State
  const [logForm, setLogForm] = useState({ 
    temp: '', symptoms: [], note: '', 
    medicineName: '', dosage: '', 
    weight: '', height: '', 
    nutritionType: 'food', item: '', amount: '',
    doctorName: '', visitReason: '', prescriptions: '',
    reminderHours: 0, hasReminder: false,
    // New Recurring Fields
    isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5
  });

  const commonSymptoms = ['Cough', 'Runny Nose', 'Vomiting', 'Diarrhea', 'Rash', 'Fatigue', 'Headache', 'Sore Throat', 'Lethargy', 'No Appetite'];
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

  // --- Swipe Handler for Dad-bod mode ---
  const handleDragEnd = (event, info) => {
    if (info.offset.x > 80) setIsDadBodMode(true);
    else if (info.offset.x < -80) setIsDadBodMode(false);
    controls.start({ x: 0 });
  };

  // --- Notification Logic ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const scheduleBatchNotifications = (medicineName, frequencyHours, days) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const totalDoses = (days * 24) / frequencyHours;
      for (let i = 1; i <= totalDoses; i++) {
        const delayHours = frequencyHours * i;
        const ms = delayHours * 60 * 60 * 1000;
        if (delayHours <= 24) {
          setTimeout(() => {
            new Notification("Medicine Reminder", {
              body: `Time for dose #${i} of ${medicineName}`,
              icon: '/pwa-512x512.png'
            });
          }, ms);
        }
      }
      alert(`Schedule created! Reminders set for every ${frequencyHours} hours.\n(Note: Keep this app open or in background for alerts to fire)`);
    } else {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") scheduleBatchNotifications(medicineName, frequencyHours, days);
      });
    }
  };

  // --- Effects (Auth, Settings, Data) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) { setDataLoading(false); setFetchError(null); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => {
            const merged = { ...prev, ...docSnap.data() };
            const defaults = [
              { id: 'symptom', visible: true, label: 'Symptom' },
              { id: 'medicine', visible: true, label: 'Medicine' },
              { id: 'nutrition', visible: true, label: 'Nutrition' },
              { id: 'growth', visible: true, label: 'Growth' },
              { id: 'doctor', visible: true, label: 'Doctor Visit' }
            ];
            const finalOrder = merged.dashboardOrder || [];
            defaults.forEach(def => {
              if (!finalOrder.find(item => item.id === def.id)) {
                finalOrder.push(def);
              }
            });
            return { ...merged, dashboardOrder: finalOrder };
          });
        }
      } catch (e) { console.error("Settings fetch error", e); }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    setFetchError(null);
    const q = query(collection(db, 'users', user.uid, 'children'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChildren(data);
      setDataLoading(false);
    }, (error) => {
      if (error.message.includes("The query requires an index") || error.message.includes("No matching")) {
         const fallbackQ = query(collection(db, 'users', user.uid, 'children'));
         onSnapshot(fallbackQ, (snap) => {
            const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            d.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
            setChildren(d);
            setDataLoading(false);
         });
      } else {
        setFetchError(error.message);
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    } else if (selectedChild && !children.find(c => c.id === selectedChild.id)) {
      setSelectedChild(children.length > 0 ? children[0] : null);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'logs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, (error) => console.error("Error fetching logs:", error));
    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---
  const handleReorder = async (newOrder) => {
    setChildren(newOrder); 
    if (!user) return;
    try {
      const batch = writeBatch(db);
      newOrder.forEach((child, index) => {
        const ref = doc(db, 'users', user.uid, 'children', child.id);
        batch.update(ref, { order: index });
      });
      await batch.commit();
    } catch (e) { console.error("Reorder save failed", e); }
  };

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    if (user) {
      try { await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), newSettings);
      } catch (e) { console.error("Error saving settings", e); }
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!newChildName.trim() || !user) return;
    try {
      const profileData = { name: newChildName, type: newProfileType, height: newHeight, weight: newWeight, dob: newDob, bloodType: newBloodType };
      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'children', editingId), profileData);
      } else {
        const order = children.length;
        const docRef = await addDoc(collection(db, 'users', user.uid, 'children'), { ...profileData, order, createdAt: new Date().toISOString() });
        if (newWeight || newHeight) await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: docRef.id, type: 'measurement', timestamp: new Date().toISOString(), height: newHeight, weight: newWeight, note: 'Initial Profile Creation' });
      }
      closeProfileModal();
    } catch (err) { alert("Save Failed: " + err.message); }
  };

  const openAddProfile = () => { setEditingId(null); setNewChildName(''); setNewProfileType('child'); setNewHeight(''); setNewWeight(''); setNewDob(''); setNewBloodType(''); setIsAddChildOpen(true); };
  const openEditProfile = (child) => { setEditingId(child.id); setNewChildName(child.name); setNewProfileType(child.type); setNewHeight(child.height || ''); setNewWeight(child.weight || ''); setNewDob(child.dob || ''); setNewBloodType(child.bloodType || ''); setIsAddChildOpen(true); };
  const closeProfileModal = () => { setIsAddChildOpen(false); setEditingId(null); };

  const toggleWidgetVisibility = (id) => { const newOrder = settings.dashboardOrder.map(w => w.id === id ? { ...w, visible: !w.visible } : w); handleSaveSettings({ ...settings, dashboardOrder: newOrder }); };
  const moveWidget = (index, direction) => { const newOrder = [...settings.dashboardOrder]; const item = newOrder[index]; newOrder.splice(index, 1); if (direction === 'up') newOrder.splice(Math.max(0, index - 1), 0, item); else newOrder.splice(Math.min(newOrder.length, index + 1), 0, item); handleSaveSettings({ ...settings, dashboardOrder: newOrder }); };

  const handleExportData = () => { const dataStr = JSON.stringify({ children, logs, settings }, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `family-health-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  
  const handleGoogleLogin = async () => { const provider = new GoogleAuthProvider(); try { await signInWithPopup(auth, provider); } catch (error) { setAuthError("Google sign in failed."); } };
  const handleEmailAuth = async (e) => { e.preventDefault(); setAuthError(''); if (!email || !password) return; try { if (isSignUp) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError("Authentication failed. Check email/password."); } };
  const handleLogout = async () => { await signOut(auth); setChildren([]); setLogs([]); setSelectedChild(null); setEmail(''); setPassword(''); };
  
  const handleAddSymptom = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'symptom', timestamp: new Date().toISOString(), temperature: logForm.temp, symptoms: logForm.symptoms, note: logForm.note }); setLogForm({...logForm, temp: '', symptoms: [], note: ''}); setIsSymptomOpen(false); };
  
  const handleAddMedicine = async (e) => { 
    e.preventDefault();
    if(!user) return; 
    await addDoc(collection(db, 'users', user.uid, 'logs'), { 
      childId: selectedChild.id, type: 'medicine', timestamp: new Date().toISOString(), 
      medicineName: logForm.medicineName, dosage: logForm.dosage, note: logForm.note,
      isRecurring: logForm.isRecurring, 
      scheduleFrequency: logForm.isRecurring ? logForm.scheduleFrequency : 0,
      scheduleDuration: logForm.isRecurring ? logForm.scheduleDuration : 0
    });
    if (logForm.isRecurring && logForm.scheduleFrequency > 0 && logForm.scheduleDuration > 0) {
      scheduleBatchNotifications(logForm.medicineName, logForm.scheduleFrequency, logForm.scheduleDuration);
    }
    setLogForm({...logForm, medicineName: '', dosage: '', note: '', isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5}); 
    setIsMedicineOpen(false); 
  };

  const handleAddStats = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'measurement', timestamp: new Date().toISOString(), weight: logForm.weight, height: logForm.height, note: logForm.note }); const updates = {}; if(logForm.weight) updates.weight = logForm.weight; if(logForm.height) updates.height = logForm.height; if(Object.keys(updates).length>0) await updateDoc(doc(db, 'users', user.uid, 'children', selectedChild.id), updates); setLogForm({...logForm, weight: '', height: '', note: ''}); setIsStatsOpen(false); };
  const handleAddNutrition = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'nutrition', timestamp: new Date().toISOString(), nutritionType: logForm.nutritionType, item: logForm.item, amount: logForm.amount, note: logForm.note }); setLogForm({...logForm, item: '', amount: '', note: '', nutritionType: 'food'}); setIsNutritionOpen(false); };
  const handleAddDoctorVisit = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'doctor_visit', timestamp: new Date().toISOString(), doctorName: logForm.doctorName, visitReason: logForm.visitReason, prescriptions: logForm.prescriptions, note: logForm.note }); setLogForm({...logForm, doctorName: '', visitReason: '', prescriptions: '', note: ''}); setIsDoctorOpen(false); };
  
  const deleteLog = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, 'users', user.uid, 'logs', id)); };
  const toggleSymptom = (s) => { if(logForm.symptoms.includes(s)) setLogForm({...logForm, symptoms: logForm.symptoms.filter(x=>x!==s)}); else setLogForm({...logForm, symptoms: [...logForm.symptoms, s]}); };

  // --- Dynamic Theming based on profile type ---
  const isPet = selectedChild?.type === 'pet';
  const isAdult = selectedChild?.type === 'adult';
  let themeBg = 'bg-indigo-600';
  if (isPet) themeBg = 'bg-amber-600';
  if (isAdult) themeBg = 'bg-emerald-600';

  const currentChildLogs = logs.filter(l => l.childId === selectedChild?.id);
  const temperatureData = useMemo(() => currentChildLogs.filter(l => l.type === 'symptom' && l.temperature).map(l => ({ date: l.timestamp, value: l.temperature })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const weightData = useMemo(() => currentChildLogs.filter(l => l.type === 'measurement' && l.weight).map(l => ({ date: l.timestamp, value: l.weight })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // --- Views ---
  if (authLoading || (user && dataLoading)) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4"><Activity className="animate-spin text-indigo-600" size={40} /><p className="text-slate-400 font-medium">Loading...</p></div>;

  if (!user) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center"><div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={32} className="text-indigo-600" /></div><h1 className="text-2xl font-bold text-slate-800 mb-2">Family Health Status</h1><Button onClick={handleGoogleLogin} variant="google" className="mb-6 py-3 border-slate-200 border shadow-sm"><LogIn size={20} /> Sign in with Google</Button><form onSubmit={handleEmailAuth} className="space-y-4 text-left">{authError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{authError}</div>}<div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18} /><input type="email" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Password</label><div className="relative"><Lock className="absolute left-3 top-3 text-slate-400" size={18} /><input type="password" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div><Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white">{isSignUp ? "Create Account" : "Log In"}</Button></form><button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-indigo-600 text-sm font-medium hover:text-indigo-800">{isSignUp ? "Log In" : "Sign Up"}</button></div></div>;

  if (fetchError) return <div className="p-6 text-center"><h1 className="text-red-600 font-bold">Error</h1><p>{fetchError}</p><Button onClick={() => window.location.reload()}>Retry</Button></div>;

  // --- Onboarding ---
  if (children.length === 0 && !isDadBodMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome!</h1>
          <p className="text-slate-500 mb-8">Create a profile to get started.</p>
          <Button onClick={openAddProfile} className="w-full">Create First Profile</Button>
          <button onClick={handleLogout} className="mt-6 text-slate-400 text-sm">Sign Out</button>
        </div>
        <Modal isOpen={isAddChildOpen} onClose={closeProfileModal} title="Add Profile">
          <form onSubmit={handleSaveProfile} className="space-y-4">
             <div className="grid grid-cols-3 gap-4 mb-4">
               <button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'child' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200'}`}><Baby size={24} />Child</button>
               <button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'pet' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200'}`}><PawPrint size={24} />Pet</button>
               <button type="button" onClick={() => setNewProfileType('adult')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'adult' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200'}`}><User size={24} />Adult</button>
             </div>
             <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" />
             <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-700">Height</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100cm" /></div><div><label className="text-sm font-medium text-slate-700">Weight</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 18kg" /></div></div>
             <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-700">DOB</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newDob} onChange={(e) => setNewDob(e.target.value)} /></div><div><label className="text-sm font-medium text-slate-700">Blood Type</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newBloodType} onChange={(e) => setNewBloodType(e.target.value)}><option value="">Select</option>{bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
             <Button type="submit" className="w-full" disabled={!newChildName.trim()}>Save Profile</Button>
          </form>
        </Modal>
      </div>
    );
  }

  // --- Main Dashboard ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-0">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden flex flex-col relative">
        <div className={`${themeBg} p-6 pb-8 text-white rounded-b-[2.5rem] shadow-lg z-10 transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-6">
            <motion.div 
              drag="x" 
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              animate={controls}
              className="cursor-grab active:cursor-grabbing inline-block select-none touch-pan-y"
            >
              <h1 className="text-xl font-bold flex items-center gap-2 opacity-90 transition-all">
                {isDadBodMode ? "🍺 Dad-bod Mode" : <><Activity size={20} /> Family Health</>}
              </h1>
              <p className="text-[10px] text-white/70 font-medium mt-1 animate-pulse">
                &larr; Swipe to switch &rarr;
              </p>
            </motion.div>
            
            <div className="flex gap-2">
              {!isDadBodMode && (
                <>
                  <button onClick={openAddProfile} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><UserPlus size={18} /></button>
                  <button onClick={() => setIsReorderLocked(!isReorderLocked)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">{isReorderLocked ? <Lock size={18} /> : <Unlock size={18} />}</button>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Settings size={18} /></button>
                </>
              )}
            </div>
          </div>
  
          {!isDadBodMode && children.length > 0 && (
            <>
              <Reorder.Group axis="x" values={children} onReorder={handleReorder} className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {children.map(child => (
                  <Reorder.Item key={child.id} value={child} className="flex-shrink-0 snap-start" dragListener={!isReorderLocked}>
                    <button 
                      onClick={() => setSelectedChild(child)} 
                      className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all border select-none ${selectedChild?.id === child.id ? `bg-white ${child.type === 'pet' ? 'text-amber-600' : child.type === 'adult' ? 'text-emerald-600' : 'text-indigo-600'} font-bold shadow-md border-transparent` : 'bg-black/10 text-white/70 border-transparent hover:bg-black/20'} ${!isReorderLocked ? 'border-dashed border-white/50' : ''}`}
                    >
                      {child.type === 'pet' ? <PawPrint size={14} /> : child.type === 'adult' ? <User size={14} /> : <Baby size={14} />}
                      {child.name}
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {selectedChild && (
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-3 text-sm text-white/90 bg-black/10 px-4 py-2 rounded-xl backdrop-blur-md overflow-x-auto scrollbar-hide">
                    {selectedChild.height && <div className="flex items-center gap-1.5 shrink-0"><Ruler size={14} /><span>{selectedChild.height}{settings.heightUnit}</span></div>}
                    {selectedChild.weight && <div className="flex items-center gap-1.5 shrink-0"><Weight size={14} /><span>{selectedChild.weight}{settings.weightUnit}</span></div>}
                    {selectedChild.dob && <div className="flex items-center gap-1.5 shrink-0 border-l border-white/20 pl-2 ml-1"><Calendar size={14} /><span>{calculateAge(selectedChild.dob)}</span></div>}
                    {selectedChild.bloodType && <div className="flex items-center gap-1.5 shrink-0 border-l border-white/20 pl-2 ml-1"><Droplet size={14} /><span>{selectedChild.bloodType}</span></div>}
                  </div>
                  <button onClick={() => openEditProfile(selectedChild)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors shrink-0" aria-label="Edit Profile"><Pencil size={16} /></button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Conditional App Body */}
        {isDadBodMode ? (
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 -mt-6 z-20 rounded-t-3xl">
            <DadBodTracker user={user} />
          </div>
        ) : (
          <>
            {/* Customizable Grid */}
            <div className="px-6 -mt-8 z-20 grid grid-cols-2 gap-3">
              {settings.dashboardOrder.filter(w => w.visible).map((widget) => {
                const style = "bg-white p-4 rounded-2xl shadow-lg shadow-slate-200 border border-slate-50 flex items-center justify-center gap-3 hover:-translate-y-1 transition-transform";
                if (widget.id === 'symptom') return <button key={widget.id} onClick={() => setIsSymptomOpen(true)} className={style}><div className="p-2 bg-red-50 text-red-500 rounded-full"><Thermometer size={20} /></div><span className="text-sm font-bold text-slate-600">Symptom</span></button>;
                if (widget.id === 'medicine') return <button key={widget.id} onClick={() => setIsMedicineOpen(true)} className={style}><div className="p-2 bg-blue-50 text-blue-500 rounded-full"><Pill size={20} /></div><span className="text-sm font-bold text-slate-600">Meds</span></button>;
                if (widget.id === 'nutrition') return <button key={widget.id} onClick={() => setIsNutritionOpen(true)} className={style}><div className="p-2 bg-orange-50 text-orange-500 rounded-full">{isPet ? <Bone size={20} /> : <Utensils size={20} />}</div><span className="text-sm font-bold text-slate-600">Nutrition</span></button>;
                if (widget.id === 'growth') return <button key={widget.id} onClick={() => setIsStatsOpen(true)} className={style}><div className="p-2 bg-emerald-50 text-emerald-500 rounded-full"><Weight size={20} /></div><span className="text-sm font-bold text-slate-600">Growth</span></button>;
                if (widget.id === 'doctor') return <button key={widget.id} onClick={() => setIsDoctorOpen(true)} className={style}><div className="p-2 bg-purple-50 text-purple-500 rounded-full"><Stethoscope size={20} /></div><span className="text-sm font-bold text-slate-600">Doctor</span></button>;
                return null;
              })}
            </div>

            {/* View Toggles */}
            <div className="px-6 mt-6 mb-2">
              <div className="bg-slate-100 p-1 rounded-xl flex">
                <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><List size={16} /> Timeline</button>
                <button onClick={() => setViewMode('trends')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'trends' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><TrendingUp size={16} /> Trends</button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
              {viewMode === 'timeline' ? (
                <div className="space-y-4">
                  {currentChildLogs.length === 0 && <div className="text-center py-10 opacity-40"><StickyNote size={40} className="mx-auto mb-2 text-slate-300" /><p className="text-sm">No logs yet for {selectedChild?.name}</p></div>}
                  {currentChildLogs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l-2 border-slate-200/60 pb-1">
                      <div className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full border-2 border-slate-50 shadow-sm ${log.type === 'medicine' ? 'bg-blue-500' : log.type === 'measurement' ? 'bg-emerald-500' : log.type === 'nutrition' ? 'bg-orange-500' : log.type === 'doctor_visit' ? 'bg-purple-500' : 'bg-red-500'}`} />
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{log.type.replace('_', ' ')} &bull; {formatDate(log.timestamp)} {formatTime(log.timestamp)}</span><button onClick={() => deleteLog(log.id)} className="text-slate-300 hover:text-red-400"><Trash2 size={14} /></button></div>
                        {log.type === 'symptom' && <div className="flex items-start gap-3">{log.temperature && <div className="text-2xl font-bold text-slate-700">{log.temperature}°{settings.tempUnit}</div>}<div className="flex flex-wrap gap-1">{log.symptoms?.map(s => <span key={s} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-md font-medium">{s}</span>)}</div></div>}
                        {log.type === 'medicine' && (
                          <div>
                            <div className="font-bold text-slate-700 text-lg">{log.medicineName}</div>
                            <div className="text-slate-500 text-sm mb-1">{log.dosage}</div>
                            {log.isRecurring && (
                              <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-medium mb-1">
                                <Repeat size={12} /> Every {log.scheduleFrequency}h for {log.scheduleDuration}d
                              </div>
                            )}
                          </div>
                        )}
                        {log.type === 'nutrition' && <div className="flex items-center gap-3"><div className="p-2 bg-orange-50 text-orange-600 rounded-full">{log.nutritionType === 'liquid' || log.nutritionType === 'water' ? <Droplets size={20} /> : isPet ? <Bone size={20} /> : <Utensils size={20} />}</div><div><div className="font-bold text-slate-700">{log.item || (log.nutritionType === 'water' ? 'Water Refill' : 'Meal')}</div>{log.amount && <div className="text-slate-500 text-sm">{log.amount}</div>}</div></div>}
                        {log.type === 'measurement' && <div className="flex gap-4">{log.weight && <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">Weight: {log.weight} {settings.weightUnit}</div>}{log.height && <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">Height: {log.height} {settings.heightUnit}</div>}</div>}
                        {log.type === 'doctor_visit' && <div className="space-y-2"><div className="flex items-center gap-2 text-purple-700 font-bold text-lg"><Stethoscope size={20} /> {log.doctorName || "Doctor Visit"}</div>{log.visitReason && <div className="text-slate-600 font-medium">Reason: {log.visitReason}</div>}{log.prescriptions && (<div className="bg-purple-50 p-3 rounded-xl border border-purple-100 mt-2"><div className="text-xs font-bold text-purple-400 uppercase mb-1">Prescriptions & Schedule</div><div className="text-purple-900 text-sm whitespace-pre-wrap">{log.prescriptions}</div></div>)}</div>}
                        {log.note && <div className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-2 rounded-lg">"{log.note}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6"><SimpleLineChart data={weightData} title={`Weight History (${settings.weightUnit})`} unit={settings.weightUnit} colorHex="#059669" /><SimpleLineChart data={temperatureData} title={`Temp History (°${settings.tempUnit})`} unit={`°${settings.tempUnit}`} colorHex="#dc2626" /></div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App Settings">
        <div className="space-y-8">
          <div><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Units</h4><div className="bg-slate-50 p-4 rounded-2xl space-y-4"><div className="flex justify-between items-center"><span className="font-medium text-slate-700">Temperature</span><div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm"><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'C' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.tempUnit === 'C' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>°C</button><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'F' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.tempUnit === 'F' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>°F</button></div></div><div className="flex justify-between items-center"><span className="font-medium text-slate-700">Weight</span><div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm"><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'kg' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.weightUnit === 'kg' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>kg</button><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'lbs' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.weightUnit === 'lbs' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>lbs</button></div></div></div></div>
          <div><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Dashboard Widgets</h4><div className="bg-slate-50 p-2 rounded-2xl space-y-2">{settings.dashboardOrder.map((widget, idx) => (<div key={widget.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><button onClick={() => toggleWidgetVisibility(widget.id)} className={`p-2 rounded-lg transition-colors ${widget.visible ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{widget.visible ? <Eye size={18} /> : <EyeOff size={18} />}</button><span className={`font-medium ${widget.visible ? 'text-slate-700' : 'text-slate-400'}`}>{widget.label}</span></div><div className="flex gap-1"><button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={18} /></button><button disabled={idx === settings.dashboardOrder.length - 1} onClick={() => moveWidget(idx, 'down')} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={18} /></button></div></div>))}</div></div>
          <div><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Data & Account</h4><Button variant="outline" onClick={handleExportData} className="w-full mb-3 justify-start"><Download size={18} /> Export Data (JSON)</Button><Button variant="danger" onClick={handleLogout} className="w-full justify-start"><LogOut size={18} /> Sign Out</Button></div>
        </div>
      </Modal>

      {/* Combined Add/Edit Profile Modal */}
      <Modal isOpen={isAddChildOpen} onClose={closeProfileModal} title={editingId ? "Edit Profile" : "Add Profile"}>
        <form onSubmit={handleSaveProfile} className="space-y-4">
           <div className="grid grid-cols-3 gap-4 mb-4">
             <button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'child' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200'}`}><Baby size={24} />Child</button>
             <button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'pet' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200'}`}><PawPrint size={24} />Pet</button>
             <button type="button" onClick={() => setNewProfileType('adult')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'adult' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200'}`}><User size={24} />Adult</button>
           </div>
           <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" /></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-700">Height</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100cm" /></div><div><label className="text-sm font-medium text-slate-700">Weight</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 18kg" /></div></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-700">DOB</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newDob} onChange={(e) => setNewDob(e.target.value)} /></div><div><label className="text-sm font-medium text-slate-700">Blood Type</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newBloodType} onChange={(e) => setNewBloodType(e.target.value)}><option value="">Select</option>{bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
           <Button type="submit" className="w-full" disabled={!newChildName.trim()}>{editingId ? "Update Profile" : "Save Profile"}</Button>
        </form>
      </Modal>
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title="Log Growth"><form onSubmit={handleAddStats} className="space-y-4"><RollerInput label={`Weight (${settings.weightUnit})`} value={logForm.weight} onChange={(val) => setLogForm({...logForm, weight: val})} step={0.1} min={0} max={500} unit={settings.weightUnit} /><RollerInput label={`Height (${settings.heightUnit})`} value={logForm.height} onChange={(val) => setLogForm({...logForm, height: val})} step={1} min={0} max={300} unit={settings.heightUnit} /><Button type="submit" className="w-full">Save</Button></form></Modal>
      <Modal isOpen={isSymptomOpen} onClose={() => setIsSymptomOpen(false)} title="Log Symptoms"><form onSubmit={handleAddSymptom} className="space-y-6"><RollerInput label={`Temperature (°${settings.tempUnit})`} value={logForm.temp} onChange={(val) => setLogForm({...logForm, temp: val})} step={0.1} min={30} max={45} unit={`°${settings.tempUnit}`} /><div className="flex flex-wrap gap-2">{commonSymptoms.map(sym => (<button key={sym} type="button" onClick={() => toggleSymptom(sym)} className={`px-3 py-2 rounded-lg text-sm border ${logForm.symptoms.includes(sym) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200'}`}>{sym}</button>))}</div><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full">Save</Button></form></Modal>
      
      <Modal isOpen={isMedicineOpen} onClose={() => setIsMedicineOpen(false)} title="Log Medicine">
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Medicine Name" value={logForm.medicineName} onChange={(e) => setLogForm({ ...logForm, medicineName: e.target.value })} />
          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Dosage" value={logForm.dosage} onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })} />
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-blue-800 font-medium"><Bell size={18} /> Schedule Course</div>
              <div onClick={() => setLogForm({...logForm, isRecurring: !logForm.isRecurring})} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${logForm.isRecurring ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${logForm.isRecurring ? 'left-7' : 'left-1'}`}></div>
              </div>
            </div>
            
            {logForm.isRecurring && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <RollerInput label="Every (Hours):" value={logForm.scheduleFrequency} onChange={(val) => setLogForm({...logForm, scheduleFrequency: val})} step={1} min={1} max={24} unit="hrs" />
                <RollerInput label="For (Days):" value={logForm.scheduleDuration} onChange={(val) => setLogForm({...logForm, scheduleDuration: val})} step={1} min={1} max={30} unit="days" />
                <div className="text-xs text-blue-600 bg-white/50 p-2 rounded border border-blue-200">
                  Note: Notifications will be scheduled for this duration. Keep this app open or in the background.
                </div>
              </div>
            )}
          </div>

          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} />
          <Button type="submit" className="w-full">Log Medicine</Button>
        </form>
      </Modal>

      <Modal isOpen={isNutritionOpen} onClose={() => setIsNutritionOpen(false)} title="Log Nutrition"><form onSubmit={handleAddNutrition} className="space-y-4"><div className="flex gap-4 mb-2"><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'food'})} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${logForm.nutritionType === 'food' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200'}`}>{isPet ? <Bone /> : <Utensils />} Food</button><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'liquid'})} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${logForm.nutritionType === 'liquid' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}><Droplets /> Drink</button></div><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Item / Type" value={logForm.item} onChange={(e) => setLogForm({...logForm, item: e.target.value})} /><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Amount" value={logForm.amount} onChange={(e) => setLogForm({...logForm, amount: e.target.value})} /><Button type="submit" className="w-full bg-orange-600 shadow-orange-200 hover:bg-orange-700">Log</Button></form></Modal>
      <Modal isOpen={isDoctorOpen} onClose={() => setIsDoctorOpen(false)} title="Record Doctor Visit"><form onSubmit={handleAddDoctorVisit} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Doctor / Clinic Name</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Dr. Smith" value={logForm.doctorName} onChange={(e) => setLogForm({...logForm, doctorName: e.target.value})} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Annual Checkup, Fever" value={logForm.visitReason} onChange={(e) => setLogForm({...logForm, visitReason: e.target.value})} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Prescriptions & Schedule</label><textarea rows="4" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="e.g. Amoxicillin 500mg - Twice daily for 7 days" value={logForm.prescriptions} onChange={(e) => setLogForm({...logForm, prescriptions: e.target.value})} /></div><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Additional Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full bg-purple-600 shadow-purple-200 hover:bg-purple-700">Save Visit</Button></form></Modal>

    </div>
  );
}
