import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Thermometer, Pill, Clock, Baby, PawPrint, Ruler, Weight,
  ChevronRight, Trash2, Activity, StickyNote, Calendar, UserPlus,
  X, TrendingUp, List, LogOut, LogIn, Mail, Lock, Unlock, AlertCircle, RefreshCw,
  Utensils, Droplets, Bone, Settings, ArrowUp, ArrowDown, 
  Eye, EyeOff, Download, GripHorizontal, Stethoscope,
  Bell, BellRing, Minus, Pencil, Droplet, Repeat, Check, User, ChevronDown, ChevronUp
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

// --- Components (MD3 Styled) ---
const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-6 py-3.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide";
  const variants = {
    primary: "bg-slate-800 text-white shadow-md shadow-slate-200/50 hover:bg-slate-900 hover:shadow-lg",
    child: "bg-indigo-600 text-white shadow-md shadow-indigo-200/50 hover:bg-indigo-700 hover:shadow-lg",
    pet: "bg-amber-600 text-white shadow-md shadow-amber-200/50 hover:bg-amber-700 hover:shadow-lg",
    secondary: "bg-indigo-50 text-indigo-900 hover:bg-indigo-100", // MD3 Secondary Container
    danger: "bg-red-100 text-red-900 hover:bg-red-200", // MD3 Error Container
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    google: "bg-slate-100 text-slate-800 hover:bg-slate-200 w-full",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    activeOutline: "bg-indigo-100 text-indigo-900 font-bold"
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
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>}
      <div className="flex items-center bg-slate-100 rounded-full overflow-hidden">
        <button type="button" onClick={handleDecrement} className="w-14 h-14 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors touch-manipulation"><Minus size={20} /></button>
        <div className="flex-1 flex items-center justify-center relative h-14"><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-full text-center bg-transparent font-bold text-xl text-slate-900 outline-none appearance-none m-0 p-0 z-10" placeholder="0" />{unit && <span className="absolute right-4 text-xs text-slate-500 font-medium pointer-events-none">{unit}</span>}</div>
        <button type="button" onClick={handleIncrement} className="w-14 h-14 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors touch-manipulation"><Plus size={20} /></button>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 flex justify-between items-center bg-white">
          <h3 className="font-bold text-xl text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={24} /></button>
        </div>
        <div className="p-6 pt-0 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

const SimpleLineChart = ({ data, colorHex, unit, title }) => {
  if (!data || data.length < 2) {
    return (
      <div className="bg-slate-50 p-6 rounded-[28px] text-center">
        <h4 className="text-slate-600 font-medium mb-2">{title}</h4>
        <div className="text-slate-400 text-sm">Not enough data points yet</div>
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
    <div className="bg-slate-50 p-5 rounded-[28px]">
      <div className="flex justify-between items-end mb-4">
        <h4 className="font-bold text-slate-800">{title}</h4>
        <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">Last: {data[data.length-1].value}{unit}</span>
      </div>
      <div className="relative aspect-[2/1] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <line x1="0" y1="0" x2={width} y2="0" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2"/>
          <line x1="0" y1={height} x2={width} y2={height} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2"/>
          <polyline fill="none" stroke={colorHex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
          {data.map((d, i) => {
             const x = ((new Date(d.date).getTime() - minDate) / dateRange) * (width - padding * 2) + padding;
             const y = height - (((parseFloat(d.value) - minVal) / range) * (height - padding * 2) + padding);
             return <circle key={i} cx={x} cy={y} r="2" fill="white" stroke={colorHex} strokeWidth="1.5" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-slate-400 font-medium mt-3">
        <span>{new Date(minDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
        <span>{new Date(maxDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
      </div>
    </div>
  );
};

// --- DAD-BOD TRACKER COMPONENT (MD3 Styled) ---
function DadBodTracker({ user }) {
  const [sliderCals, setSliderCals] = useState(300);
  const [foodNote, setFoodNote] = useState("");
  const [todayCalories, setTodayCalories] = useState(0);
  const [calorieLogs, setCalorieLogs] = useState([]);
  const [currentWeight, setCurrentWeight] = useState("");
  const [latestWeight, setLatestWeight] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [eatStart, setEatStart] = useState("12:00");
  const [eatEnd, setEatEnd] = useState("20:00");
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [showSettings, setShowSettings] = useState(false);
  const [habits, setHabits] = useState([]);
  const [showHabits, setShowHabits] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");

  useEffect(() => {
    if (!user) return;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const calQuery = query(collection(db, `users/${user.uid}/calories`), orderBy("timestamp", "desc"));
    const unsubCals = onSnapshot(calQuery, (snapshot) => {
      const logs = []; let todayTotal = 0;
      const logs = []; let todayTotal = 0;
      snapshot.forEach((doc) => {
        const data = doc.data(); logs.push({ id: doc.id, ...data });
        if (data.timestamp && data.timestamp.toDate() >= startOfToday) todayTotal += data.amount;
        const data = doc.data(); logs.push({ id: doc.id, ...data });
        if (data.timestamp && data.timestamp.toDate() >= startOfToday) todayTotal += data.amount;
      });
      setCalorieLogs(logs); setTodayCalories(todayTotal);
      setCalorieLogs(logs); setTodayCalories(todayTotal);
    });

    const weightQuery = query(collection(db, `users/${user.uid}/weights`), orderBy("timestamp", "desc"));
    const unsubWeight = onSnapshot(weightQuery, (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setWeightLogs(logs); if (logs.length > 0) setLatestWeight(logs[0].weight);
      snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
      setWeightLogs(logs); if (logs.length > 0) setLatestWeight(logs[0].weight);
    });

    const settingsRef = doc(db, `users/${user.uid}/settings/dadbod`);
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        if (docSnap.data().eatStart) setEatStart(docSnap.data().eatStart);
        if (docSnap.data().eatEnd) setEatEnd(docSnap.data().eatEnd);
        if (docSnap.data().calorieGoal) setCalorieGoal(docSnap.data().calorieGoal);
      }
    });

    return () => { unsubCals(); unsubWeight(); unsubSettings(); unsubHabits(); };
  }, [user]);

  const handleLogCalories = async (e) => {
    e.preventDefault(); if (!user) return;
    await addDoc(collection(db, `users/${user.uid}/calories`), { amount: Number(sliderCals), note: foodNote || "Quick Add", timestamp: Timestamp.now() });
    setSliderCals(300); setFoodNote("");
  };

  const handleLogWeight = async (e) => {
    e.preventDefault(); if (!user || !currentWeight) return;
    await addDoc(collection(db, `users/${user.uid}/weights`), { weight: Number(currentWeight), timestamp: Timestamp.now() });
    setCurrentWeight("");
  };

  const handleDeleteCalorie = async (id) => { if(window.confirm("Delete log?")) await deleteDoc(doc(db, `users/${user.uid}/calories`, id)); };
  const handleDeleteWeight = async (id) => { if(window.confirm("Delete weight?")) await deleteDoc(doc(db, `users/${user.uid}/weights`, id)); };

  const saveDadBodSettings = async (start, end, goal) => {
    setEatStart(start); setEatEnd(end); setCalorieGoal(goal);
    if (user) await setDoc(doc(db, `users/${user.uid}/settings/dadbod`), { eatStart: start, eatEnd: end, calorieGoal: goal }, { merge: true });
  };

  const handleAddHabit = async (e) => {
    e.preventDefault(); if (!newHabitName.trim() || !user) return;
    await addDoc(collection(db, `users/${user.uid}/habits`), { name: newHabitName, completedDates: [], createdAt: Timestamp.now() });
    setNewHabitName("");
  };

  const toggleHabitDate = async (habit, dateStr) => {
    let updatedDates = [...(habit.completedDates || [])];
    if (updatedDates.includes(dateStr)) updatedDates = updatedDates.filter(d => d !== dateStr);
    else updatedDates.push(dateStr);
    await updateDoc(doc(db, `users/${user.uid}/habits`, habit.id), { completedDates: updatedDates });
  };

  const handleDeleteHabit = async (id) => { if (window.confirm("Delete habit?")) await deleteDoc(doc(db, `users/${user.uid}/habits`, id)); };

  const checkCompliance = (timestamp) => {
    if (!timestamp) return true;
    const date = timestamp.toDate(); const logTime = date.getHours() + date.getMinutes() / 60;
    const [sH, sM] = eatStart.split(':').map(Number); const [eH, eM] = eatEnd.split(':').map(Number);
    const startTime = sH + sM / 60; const endTime = eH + eM / 60;
    if (startTime < endTime) return logTime >= startTime && logTime <= endTime;
    return logTime >= startTime || logTime <= endTime;
  };

  const weightChartData = [...weightLogs].reverse().map(l => ({ date: l.timestamp?.toDate().toISOString() || new Date().toISOString(), value: l.weight }));
  const formatTime = (timestamp) => timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (timestamp) => timestamp?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' });
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todaysCalorieLogs = calorieLogs.filter(log => log.timestamp?.toDate() >= startOfToday);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12">
      
      {/* 1. MASTER DASHBOARD STATS */}
      <div className="bg-white p-6 rounded-[28px] shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-600 text-sm font-medium mb-1">Today's Intake</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              {todayCalories} <span className="text-lg text-slate-400 font-medium">/ {calorieGoal}</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-slate-600 text-sm font-medium mb-1">Weight</p>
            <div className="text-2xl font-bold text-slate-900">{latestWeight || "--"} <span className="text-sm text-slate-400 font-medium">lbs</span></div>
            <p className="text-slate-600 text-sm font-medium mb-1">Weight</p>
            <div className="text-2xl font-bold text-slate-900">{latestWeight || "--"} <span className="text-sm text-slate-400 font-medium">lbs</span></div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-4 text-sm font-medium text-slate-600">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-full"><Clock size={14} /></div>
          <span>Eating Window: <span className="text-blue-700 font-bold">{eatStart} - {eatEnd}</span></span>
        </div>

        {/* HABIT TRACKER */}
        <div className="pt-2">
          <button onClick={() => setShowHabits(!showHabits)} className="w-full flex justify-between items-center text-sm font-bold text-slate-800 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors">
            <div className="flex items-center gap-2"><div className="p-1 bg-emerald-100 text-emerald-700 rounded-full"><Activity size={14} /></div> Streaks & Habits</div>
            {showHabits ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>

          {showHabits && (
            <div className="mt-4 space-y-6 animate-in slide-in-from-top-2">
              {habits.length === 0 && <p className="text-sm text-slate-500 text-center bg-slate-50 p-4 rounded-2xl">No habits added yet.</p>}
              {habits.map(habit => (
                <div key={habit.id} className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-slate-800">{habit.name}</span>
                    <button onClick={() => handleDeleteHabit(habit.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex justify-between gap-2">
                    {last7Days.map(({ dateStr, dayName, dayNum }) => {
                      const isCompleted = (habit.completedDates || []).includes(dateStr);
                      const isToday = dateStr === getLocalYYYYMMDD(new Date());
                      return (
                        <button key={dateStr} onClick={() => toggleHabitDate(habit, dateStr)} className={`flex flex-col items-center justify-center flex-1 aspect-[1/1.2] rounded-full transition-all active:scale-90 ${isCompleted ? 'bg-emerald-500 text-white shadow-md' : isToday ? 'bg-slate-100 text-slate-500 border-2 border-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                          <span className="text-[10px] font-bold uppercase">{dayName}</span>
                          <span className={`text-sm font-black ${isCompleted ? 'text-white' : 'text-slate-700'}`}>{dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddHabit} className="flex gap-2">
                <input type="text" placeholder="e.g., Drink Water" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-sm text-slate-800 outline-none focus:bg-slate-200 transition-colors" />
                <button type="submit" disabled={!newHabitName.trim()} className="bg-emerald-100 text-emerald-800 disabled:bg-slate-100 disabled:text-slate-400 w-12 h-12 rounded-full font-bold transition-all active:scale-95 flex items-center justify-center"><Plus size={20} /></button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 2. CALORIE SLIDER & TIMELINE */}
      <div className="bg-white p-6 rounded-[28px] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-full"><Utensils size={18} /></div>
            <h2 className="text-lg font-bold text-slate-900">Food Log</h2>
          </div>
          <button type="button" onClick={() => setShowSettings(!showSettings)} className="text-xs font-bold text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-full transition-all active:scale-95">
            <Settings size={14}/> Goals
          </button>
        </div>

        {showSettings && (
          <div className="p-4 bg-slate-50 rounded-3xl grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
              <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-600 ml-2">Daily Calorie Goal</label>
                  <input type="number" step="50" value={calorieGoal} onChange={(e) => saveDadBodSettings(eatStart, eatEnd, Number(e.target.value))} className="w-full bg-white rounded-full px-4 py-3 text-base font-bold text-slate-800 outline-none mt-1 shadow-sm" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-600 ml-2">Window Start</label>
                  <input type="time" value={eatStart} onChange={(e) => saveDadBodSettings(e.target.value, eatEnd, calorieGoal)} className="w-full bg-white rounded-full px-4 py-3 text-sm font-bold text-slate-800 outline-none mt-1 shadow-sm" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-600 ml-2">Window End</label>
                  <input type="time" value={eatEnd} onChange={(e) => saveDadBodSettings(eatStart, e.target.value, calorieGoal)} className="w-full bg-white rounded-full px-4 py-3 text-sm font-bold text-slate-800 outline-none mt-1 shadow-sm" />
              </div>
          </div>
        )}

        <form onSubmit={handleLogCalories} className="space-y-6">
          <div className="space-y-4 bg-slate-50 p-6 rounded-3xl">
            <div className="flex justify-center items-end">
              <span className="text-6xl font-black text-blue-600 tracking-tighter">{sliderCals}</span>
            </div>
            <input type="range" min="50" max="2500" step="50" value={sliderCals} onChange={(e) => setSliderCals(e.target.value)} className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
          </div>
          <input type="text" placeholder="What did you eat? (Optional)" value={foodNote} onChange={(e) => setFoodNote(e.target.value)} className="w-full bg-slate-100 rounded-full px-5 py-4 text-slate-800 focus:bg-slate-200 transition-colors outline-none" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4 rounded-full shadow-md flex justify-center gap-2 transition-all active:scale-95">
            <Plus className="w-6 h-6" /> Log Calories
          </button>
        </form>

        {todaysCalorieLogs.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 ml-2">Today's Logs</h3>
            <div className="space-y-2">
              {todaysCalorieLogs.map(log => {
                const isCompliant = checkCompliance(log.timestamp);
                return (
                  <div key={log.id} className={`flex justify-between items-center p-4 rounded-[20px] transition-colors ${isCompliant ? 'bg-slate-50' : 'bg-red-50'}`}>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {log.note}
                        {!isCompliant && <span className="text-[10px] font-black bg-red-200 text-red-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Fasting</span>}
                      </div>
                      <div className={`text-sm ${isCompliant ? 'text-slate-500' : 'text-red-500 font-medium'}`}>{formatTime(log.timestamp)}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-black text-lg ${isCompliant ? 'text-blue-700' : 'text-red-700'}`}>{log.amount} <span className="text-xs font-bold opacity-60">kcal</span></span>
                      <button onClick={() => handleDeleteCalorie(log.id)} className={`p-2 rounded-full transition-colors ${isCompliant ? 'text-slate-400 hover:bg-slate-200' : 'text-red-400 hover:bg-red-200'}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. WEIGHT TRACKER & GRAPH */}
      <div className="bg-white p-6 rounded-[28px] shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full"><Weight size={18} /></div>
          <h2 className="text-lg font-bold text-slate-900">Weigh-In</h2>
        </div>
        
        <form onSubmit={handleLogWeight} className="flex gap-3">
          <input type="number" step="0.1" placeholder="e.g. 185.5" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} className="flex-1 min-w-0 bg-slate-100 rounded-full px-5 py-4 text-slate-800 text-lg font-bold outline-none focus:bg-slate-200 transition-colors" />
          <button type="submit" disabled={!currentWeight} className="w-16 shrink-0 bg-indigo-100 disabled:bg-slate-100 text-indigo-700 disabled:text-slate-400 rounded-full font-bold flex items-center justify-center transition-all active:scale-95"><Check className="w-6 h-6" /></button>
        </form>

        {weightChartData.length > 0 && (
          <div className="pt-2">
             <SimpleLineChart data={weightChartData} title="Weight Trend" unit=" lbs" colorHex="#4f46e5" />
             <div className="mt-4 max-h-32 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
                {weightLogs.map(log => (
                  <div key={log.id} className="flex justify-between items-center text-sm p-3 hover:bg-slate-50 rounded-2xl">
                    <span className="text-slate-600 font-medium">{formatDate(log.timestamp)}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-800 text-base">{log.weight} lbs</span>
                      <button onClick={() => handleDeleteWeight(log.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={16} /></button>
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
// --- DAD-BOD BANNER (Top Header) ---
function DadBodBanner({ user }) {
  const [eatStart, setEatStart] = useState("12:00");
  const [eatEnd, setEatEnd] = useState("20:00");
  const [waterCount, setWaterCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState("--:--");
  const [isFasting, setIsFasting] = useState(true);

  // Habit Tracker State
  const [habits, setHabits] = useState([]);
  const [showHabits, setShowHabits] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");

  useEffect(() => {
    if (!user) return;
    
    // 1. Fetch IF Settings
    const settingsRef = doc(db, `users/${user.uid}/settings/dadbod`);
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        if (docSnap.data().eatStart) setEatStart(docSnap.data().eatStart);
        if (docSnap.data().eatEnd) setEatEnd(docSnap.data().eatEnd);
      }
    });

    // 2. Fetch Today's Water
    const todayStr = new Date().toISOString().split('T')[0];
    const waterRef = doc(db, `users/${user.uid}/water`, todayStr);
    const unsubWater = onSnapshot(waterRef, (docSnap) => {
      if (docSnap.exists()) setWaterCount(docSnap.data().count || 0);
      else setWaterCount(0);
    });

    // 3. Fetch Habits
    const habitsQuery = query(collection(db, `users/${user.uid}/habits`), orderBy("createdAt", "asc"));
    const unsubHabits = onSnapshot(habitsQuery, (snapshot) => {
      const h = []; snapshot.forEach(doc => h.push({ id: doc.id, ...doc.data() })); setHabits(h);
    });

    return () => { unsubSettings(); unsubWater(); unsubHabits(); };
  }, [user]);

  // Live Countdown Timer Math
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const [sH, sM] = eatStart.split(':').map(Number);
      const [eH, eM] = eatEnd.split(':').map(Number);

      let start = new Date(now); start.setHours(sH, sM, 0, 0);
      let end = new Date(now); end.setHours(eH, eM, 0, 0);

      let fasting = true; let target = null;

      if (start < end) {
        if (now < start) { fasting = true; target = start; }
        else if (now >= start && now < end) { fasting = false; target = end; }
        else { fasting = true; target = new Date(start); target.setDate(target.getDate() + 1); }
      } else {
        if (now >= start) { fasting = false; target = new Date(end); target.setDate(target.getDate() + 1); }
        else if (now < end) { fasting = false; target = end; }
        else { fasting = true; target = start; }
      }

      setIsFasting(fasting);
      const diffMs = target - now;
      const h = Math.floor(diffMs / (1000 * 60 * 60));
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setTimeLeft(`${formattedTime} until fast ${fasting ? 'ends' : 'starts'}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [eatStart, eatEnd]);

  // Handlers
  const handleAddWater = async () => {
    if (!user) return; const todayStr = new Date().toISOString().split('T')[0];
    await setDoc(doc(db, `users/${user.uid}/water`, todayStr), { count: Math.min(waterCount + 1, 8) }, { merge: true });
  };
  const handleRemoveWater = async () => {
    if (!user || waterCount === 0) return; const todayStr = new Date().toISOString().split('T')[0];
    await setDoc(doc(db, `users/${user.uid}/water`, todayStr), { count: waterCount - 1 }, { merge: true });
  };

  const handleAddHabit = async (e) => {
    e.preventDefault(); if (!newHabitName.trim() || !user) return;
    await addDoc(collection(db, `users/${user.uid}/habits`), { name: newHabitName, completedDates: [], createdAt: Timestamp.now() });
    setNewHabitName("");
  };
  const toggleHabitDate = async (habit, dateStr) => {
    let updatedDates = [...(habit.completedDates || [])];
    if (updatedDates.includes(dateStr)) updatedDates = updatedDates.filter(d => d !== dateStr);
    else updatedDates.push(dateStr);
    await updateDoc(doc(db, `users/${user.uid}/habits`, habit.id), { completedDates: updatedDates });
  };
  const handleDeleteHabit = async (id) => { if (window.confirm("Delete habit?")) await deleteDoc(doc(db, `users/${user.uid}/habits`, id)); };

  const getLocalYYYYMMDD = (date) => {
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
      days.push({ dateStr: getLocalYYYYMMDD(d), dayName: d.toLocaleDateString([], { weekday: 'short' }).charAt(0), dayNum: d.getDate() });
    }
    return days;
  }, []);

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
      
      {/* IF Countdown */}
      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-white/80" />
          <span className="text-sm font-bold text-white tracking-wide">{timeLeft}</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isFasting ? 'bg-amber-400/20 text-amber-200' : 'bg-emerald-400/20 text-emerald-200'}`}>
          {isFasting ? 'Fasting' : 'Eating'}
        </div>
      </div>

      {/* Water Tracker */}
      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Daily Water</span>
          <span className="text-xs font-bold text-white/90">{waterCount} / 8</span>
        </div>
        <div className="flex justify-between items-center gap-1">
          {[...Array(8)].map((_, i) => (
            <button key={i} onClick={i < waterCount ? handleRemoveWater : handleAddWater} className="p-1 active:scale-90 transition-transform">
              <Droplet size={24} className={i < waterCount ? "text-blue-400 fill-blue-400 drop-shadow-md" : "text-white/20"} />
            </button>
          ))}
        </div>
      </div>

      {/* Habits Tracker (Dark Glass Mode) */}
      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2">
        <button onClick={() => setShowHabits(!showHabits)} className="w-full flex justify-between items-center text-sm font-bold text-white transition-colors">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            Streaks & Habits
          </div>
          {showHabits ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
        </button>

        {showHabits && (
          <div className="mt-4 space-y-5 animate-in slide-in-from-top-2">
            {habits.length === 0 && <p className="text-xs text-white/50 text-center italic">No habits added yet.</p>}
            
            {habits.map(habit => (
              <div key={habit.id} className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-bold text-white/90">{habit.name}</span>
                  <button onClick={() => handleDeleteHabit(habit.id)} className="text-white/30 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
                </div>
                <div className="flex justify-between gap-1.5">
                  {last7Days.map(({ dateStr, dayName, dayNum }) => {
                    const isCompleted = (habit.completedDates || []).includes(dateStr);
                    const isToday = dateStr === getLocalYYYYMMDD(new Date());
                    return (
                      <button 
                        key={dateStr}
                        onClick={() => toggleHabitDate(habit, dateStr)}
                        className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl border transition-all active:scale-95
                          ${isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                            : isToday 
                              ? 'bg-white/10 border-emerald-400/50 text-white/70 border-dashed' 
                              : 'bg-black/20 border-transparent text-white/30 hover:bg-white/10'}`}
                      >
                        <span className="text-[10px] font-bold uppercase">{dayName}</span>
                        <span className={`text-sm font-black ${isCompleted ? 'text-white' : 'text-white/80'}`}>{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <form onSubmit={handleAddHabit} className="flex gap-2 pt-2">
              <input 
                type="text" 
                placeholder="e.g. No Energy Drinks" 
                value={newHabitName} 
                onChange={(e) => setNewHabitName(e.target.value)}
                className="flex-1 bg-black/20 border-none rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button type="submit" disabled={!newHabitName.trim()} className="bg-emerald-500 disabled:bg-white/10 disabled:text-white/30 text-white px-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center">
                <Plus size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);

  const [settings, setSettings] = useState({
    tempUnit: 'C', weightUnit: 'kg', heightUnit: 'cm', 
    dashboardOrder: [
      { id: 'symptom', visible: true, label: 'Symptom' },
      { id: 'medicine', visible: true, label: 'Medicine' },
      { id: 'nutrition', visible: true, label: 'Nutrition' },
      { id: 'growth', visible: true, label: 'Growth' },
      { id: 'doctor', visible: true, label: 'Doctor Visit' }
    ]
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [viewMode, setViewMode] = useState('timeline');
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isMedicineOpen, setIsMedicineOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReorderLocked, setIsReorderLocked] = useState(true);
  
  const [isDadBodMode, setIsDadBodMode] = useState(false);
  const controls = useAnimation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  const [newChildName, setNewChildName] = useState('');
  const [newProfileType, setNewProfileType] = useState('child');
  const [newHeight, setNewHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newBloodType, setNewBloodType] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [logForm, setLogForm] = useState({ 
    temp: '', symptoms: [], note: '', medicineName: '', dosage: '', 
    weight: '', height: '', nutritionType: 'food', item: '', amount: '',
    doctorName: '', visitReason: '', prescriptions: '', reminderHours: 0, hasReminder: false,
    isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5
  });

  const commonSymptoms = ['Cough', 'Runny Nose', 'Vomiting', 'Diarrhea', 'Rash', 'Fatigue', 'Headache', 'Sore Throat', 'Lethargy', 'No Appetite'];
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 80) setIsDadBodMode(true);
    else if (info.offset.x < -80) setIsDadBodMode(false);
    controls.start({ x: 0 });
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== 'granted') Notification.requestPermission();
  }, []);

  const scheduleBatchNotifications = (medicineName, frequencyHours, days) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const totalDoses = (days * 24) / frequencyHours;
      for (let i = 1; i <= totalDoses; i++) {
        const ms = frequencyHours * i * 60 * 60 * 1000;
        if (frequencyHours * i <= 24) setTimeout(() => new Notification("Medicine Reminder", { body: `Time for dose #${i} of ${medicineName}`, icon: '/pwa-512x512.png' }), ms);
      }
      alert(`Schedule created! Reminders set for every ${frequencyHours} hours.`);
    } else {
      Notification.requestPermission().then(p => { if (p === "granted") scheduleBatchNotifications(medicineName, frequencyHours, days); });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthLoading(false);
      if (!u) { setDataLoading(false); setFetchError(null); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'config'));
        if (docSnap.exists()) {
          setSettings(prev => {
            const merged = { ...prev, ...docSnap.data() };
            const defaults = [{ id: 'symptom', visible: true, label: 'Symptom' }, { id: 'medicine', visible: true, label: 'Medicine' }, { id: 'nutrition', visible: true, label: 'Nutrition' }, { id: 'growth', visible: true, label: 'Growth' }, { id: 'doctor', visible: true, label: 'Doctor Visit' }];
            const finalOrder = merged.dashboardOrder || [];
            defaults.forEach(def => { if (!finalOrder.find(item => item.id === def.id)) finalOrder.push(def); });
            return { ...merged, dashboardOrder: finalOrder };
          });
        }
      } catch (e) { console.error("Settings fetch error", e); }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true); setFetchError(null);
    const q = query(collection(db, 'users', user.uid, 'children'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChildren(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setDataLoading(false);
    }, (error) => {
      if (error.message.includes("requires an index") || error.message.includes("No matching")) {
         onSnapshot(query(collection(db, 'users', user.uid, 'children')), (snap) => {
            const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            d.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
            setChildren(d); setDataLoading(false);
         });
      } else { setFetchError(error.message); setDataLoading(false); }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
    else if (selectedChild && !children.find(c => c.id === selectedChild.id)) setSelectedChild(children.length > 0 ? children[0] : null);
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

  const handleReorder = async (newOrder) => {
    setChildren(newOrder); if (!user) return;
    try { const batch = writeBatch(db); newOrder.forEach((child, index) => batch.update(doc(db, 'users', user.uid, 'children', child.id), { order: index })); await batch.commit(); } catch (e) { console.error("Reorder failed", e); }
  };

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    if (user) try { await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), newSettings); } catch (e) { console.error("Error saving settings", e); }
    if (user) try { await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), newSettings); } catch (e) { console.error("Error saving settings", e); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); if (!newChildName.trim() || !user) return;
    e.preventDefault(); if (!newChildName.trim() || !user) return;
    try {
      const profileData = { name: newChildName, type: newProfileType, height: newHeight, weight: newWeight, dob: newDob, bloodType: newBloodType };
      if (editingId) await updateDoc(doc(db, 'users', user.uid, 'children', editingId), profileData);
      else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'children'), { ...profileData, order: children.length, createdAt: new Date().toISOString() });
      if (editingId) await updateDoc(doc(db, 'users', user.uid, 'children', editingId), profileData);
      else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'children'), { ...profileData, order: children.length, createdAt: new Date().toISOString() });
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

  const handleExportData = () => { const dataStr = JSON.stringify({ children, logs, settings }, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `health-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  const handleExportData = () => { const dataStr = JSON.stringify({ children, logs, settings }, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `health-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setAuthError("Google sign in failed."); } };
  const handleEmailAuth = async (e) => { e.preventDefault(); setAuthError(''); if (!email || !password) return; try { if (isSignUp) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError("Authentication failed."); } };
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setAuthError("Google sign in failed."); } };
  const handleEmailAuth = async (e) => { e.preventDefault(); setAuthError(''); if (!email || !password) return; try { if (isSignUp) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError("Authentication failed."); } };
  const handleLogout = async () => { await signOut(auth); setChildren([]); setLogs([]); setSelectedChild(null); setEmail(''); setPassword(''); };
  
  const handleAddSymptom = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'symptom', timestamp: new Date().toISOString(), temperature: logForm.temp, symptoms: logForm.symptoms, note: logForm.note }); setLogForm({...logForm, temp: '', symptoms: [], note: ''}); setIsSymptomOpen(false); };
  const handleAddMedicine = async (e) => { 
    e.preventDefault(); if(!user) return; 
    await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'medicine', timestamp: new Date().toISOString(), medicineName: logForm.medicineName, dosage: logForm.dosage, note: logForm.note, isRecurring: logForm.isRecurring, scheduleFrequency: logForm.isRecurring ? logForm.scheduleFrequency : 0, scheduleDuration: logForm.isRecurring ? logForm.scheduleDuration : 0 });
    if (logForm.isRecurring && logForm.scheduleFrequency > 0 && logForm.scheduleDuration > 0) scheduleBatchNotifications(logForm.medicineName, logForm.scheduleFrequency, logForm.scheduleDuration);
    setLogForm({...logForm, medicineName: '', dosage: '', note: '', isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5}); setIsMedicineOpen(false); 
    e.preventDefault(); if(!user) return; 
    await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'medicine', timestamp: new Date().toISOString(), medicineName: logForm.medicineName, dosage: logForm.dosage, note: logForm.note, isRecurring: logForm.isRecurring, scheduleFrequency: logForm.isRecurring ? logForm.scheduleFrequency : 0, scheduleDuration: logForm.isRecurring ? logForm.scheduleDuration : 0 });
    if (logForm.isRecurring && logForm.scheduleFrequency > 0 && logForm.scheduleDuration > 0) scheduleBatchNotifications(logForm.medicineName, logForm.scheduleFrequency, logForm.scheduleDuration);
    setLogForm({...logForm, medicineName: '', dosage: '', note: '', isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5}); setIsMedicineOpen(false); 
  };
  const handleAddStats = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'measurement', timestamp: new Date().toISOString(), weight: logForm.weight, height: logForm.height, note: logForm.note }); const updates = {}; if(logForm.weight) updates.weight = logForm.weight; if(logForm.height) updates.height = logForm.height; if(Object.keys(updates).length>0) await updateDoc(doc(db, 'users', user.uid, 'children', selectedChild.id), updates); setLogForm({...logForm, weight: '', height: '', note: ''}); setIsStatsOpen(false); };
  const handleAddNutrition = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'nutrition', timestamp: new Date().toISOString(), nutritionType: logForm.nutritionType, item: logForm.item, amount: logForm.amount, note: logForm.note }); setLogForm({...logForm, item: '', amount: '', note: '', nutritionType: 'food'}); setIsNutritionOpen(false); };
  const handleAddDoctorVisit = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'doctor_visit', timestamp: new Date().toISOString(), doctorName: logForm.doctorName, visitReason: logForm.visitReason, prescriptions: logForm.prescriptions, note: logForm.note }); setLogForm({...logForm, doctorName: '', visitReason: '', prescriptions: '', note: ''}); setIsDoctorOpen(false); };
  const deleteLog = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, 'users', user.uid, 'logs', id)); };
  const toggleSymptom = (s) => { if(logForm.symptoms.includes(s)) setLogForm({...logForm, symptoms: logForm.symptoms.filter(x=>x!==s)}); else setLogForm({...logForm, symptoms: [...logForm.symptoms, s]}); };

 const isPet = selectedChild?.type === 'pet';
  const isAdult = selectedChild?.type === 'adult';
  
  // Force a sleek dark mode header when in Dad-bod Mode
  let themeBg = 'bg-indigo-600'; 
  if (isPet) themeBg = 'bg-amber-600'; 
  if (isAdult) themeBg = 'bg-emerald-600';
  if (isDadBodMode) themeBg = 'bg-slate-900'; 

  const currentChildLogs = logs.filter(l => l.childId === selectedChild?.id);
  const temperatureData = useMemo(() => currentChildLogs.filter(l => l.type === 'symptom' && l.temperature).map(l => ({ date: l.timestamp, value: l.temperature })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const weightData = useMemo(() => currentChildLogs.filter(l => l.type === 'measurement' && l.weight).map(l => ({ date: l.timestamp, value: l.weight })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (authLoading || (user && dataLoading)) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4"><Activity className="animate-spin text-indigo-600" size={40} /><p className="text-slate-500 font-medium">Loading...</p></div>;
  if (authLoading || (user && dataLoading)) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4"><Activity className="animate-spin text-indigo-600" size={40} /><p className="text-slate-500 font-medium">Loading...</p></div>;

  if (!user) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6"><div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-sm text-center"><div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={40} className="text-indigo-600" /></div><h1 className="text-2xl font-black text-slate-900 mb-8">Family Health Status</h1><Button onClick={handleGoogleLogin} variant="google" className="mb-6"><LogIn size={20} /> Sign in with Google</Button><form onSubmit={handleEmailAuth} className="space-y-4 text-left">{authError && <div className="p-3 bg-red-100 text-red-900 text-sm rounded-2xl text-center font-medium">{authError}</div>}<div><label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Email</label><div className="relative"><Mail className="absolute left-4 top-4 text-slate-400" size={20} /><input type="email" className="w-full pl-12 p-4 bg-slate-100 rounded-full outline-none focus:bg-slate-200 transition-colors" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div><div><label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Password</label><div className="relative"><Lock className="absolute left-4 top-4 text-slate-400" size={20} /><input type="password" className="w-full pl-12 p-4 bg-slate-100 rounded-full outline-none focus:bg-slate-200 transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div><Button type="submit" className="w-full mt-2">{isSignUp ? "Create Account" : "Log In"}</Button></form><button onClick={() => setIsSignUp(!isSignUp)} className="mt-8 text-indigo-600 text-sm font-bold hover:text-indigo-800">{isSignUp ? "Log In Instead" : "Create an Account"}</button></div></div>;
  if (!user) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6"><div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-sm text-center"><div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={40} className="text-indigo-600" /></div><h1 className="text-2xl font-black text-slate-900 mb-8">Family Health Status</h1><Button onClick={handleGoogleLogin} variant="google" className="mb-6"><LogIn size={20} /> Sign in with Google</Button><form onSubmit={handleEmailAuth} className="space-y-4 text-left">{authError && <div className="p-3 bg-red-100 text-red-900 text-sm rounded-2xl text-center font-medium">{authError}</div>}<div><label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Email</label><div className="relative"><Mail className="absolute left-4 top-4 text-slate-400" size={20} /><input type="email" className="w-full pl-12 p-4 bg-slate-100 rounded-full outline-none focus:bg-slate-200 transition-colors" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div><div><label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Password</label><div className="relative"><Lock className="absolute left-4 top-4 text-slate-400" size={20} /><input type="password" className="w-full pl-12 p-4 bg-slate-100 rounded-full outline-none focus:bg-slate-200 transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div><Button type="submit" className="w-full mt-2">{isSignUp ? "Create Account" : "Log In"}</Button></form><button onClick={() => setIsSignUp(!isSignUp)} className="mt-8 text-indigo-600 text-sm font-bold hover:text-indigo-800">{isSignUp ? "Log In Instead" : "Create an Account"}</button></div></div>;

  if (fetchError) return <div className="p-6 text-center"><h1 className="text-red-600 font-bold">Error</h1><p>{fetchError}</p><Button onClick={() => window.location.reload()}>Retry</Button></div>;

  if (children.length === 0 && !isDadBodMode) return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-sm text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><UserPlus size={40} className="text-indigo-600"/></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome!</h1>
          <p className="text-slate-500 mb-8 font-medium">Create a profile to get started.</p>
  if (children.length === 0 && !isDadBodMode) return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-sm text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><UserPlus size={40} className="text-indigo-600"/></div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Welcome!</h1>
          <p className="text-slate-500 mb-8 font-medium">Create a profile to get started.</p>
          <Button onClick={openAddProfile} className="w-full">Create First Profile</Button>
          <button onClick={handleLogout} className="mt-8 text-slate-400 font-bold text-sm">Sign Out</button>
          <button onClick={handleLogout} className="mt-8 text-slate-400 font-bold text-sm">Sign Out</button>
        </div>
      </div>
  );
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24 md:pb-0 selection:bg-indigo-200 selection:text-indigo-900">
      <div className="max-w-md mx-auto min-h-screen bg-slate-100 overflow-hidden flex flex-col relative">
        
        {/* MD3 Header App Bar */}
        <div className={`${themeBg} p-6 pb-10 text-white rounded-b-[40px] shadow-sm z-10 transition-colors duration-500`}>
    <div className="min-h-screen bg-slate-100 font-sans pb-24 md:pb-0 selection:bg-indigo-200 selection:text-indigo-900">
      <div className="max-w-md mx-auto min-h-screen bg-slate-100 overflow-hidden flex flex-col relative">
        
        {/* MD3 Header App Bar */}
        <div className={`${themeBg} p-6 pb-10 text-white rounded-b-[40px] shadow-sm z-10 transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-6">
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd} animate={controls} className="cursor-grab active:cursor-grabbing inline-block select-none touch-pan-y">
              <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
                {isDadBodMode ? "Dad-bod Mode" : <><Activity size={24} /> Family Health</>}
              </h1>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 animate-pulse">&larr; Swipe to switch &rarr;</p>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 animate-pulse">&larr; Swipe to switch &rarr;</p>
            </motion.div>
            
            <div className="flex gap-2">
              {!isDadBodMode && (
                <>
                  <button onClick={openAddProfile} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><UserPlus size={20} /></button>
                  <button onClick={() => setIsReorderLocked(!isReorderLocked)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">{isReorderLocked ? <Lock size={20} /> : <Unlock size={20} />}</button>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Settings size={20} /></button>
                  <button onClick={openAddProfile} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><UserPlus size={20} /></button>
                  <button onClick={() => setIsReorderLocked(!isReorderLocked)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">{isReorderLocked ? <Lock size={20} /> : <Unlock size={20} />}</button>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Settings size={20} /></button>
                </>
              )}
            </div>
          </div>
  
          {/* THE NEW BANNER */}
          {isDadBodMode && (
            <DadBodBanner user={user} />
          )}

          {!isDadBodMode && children.length > 0 && (
            <>
              <Reorder.Group axis="x" values={children} onReorder={handleReorder} className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {children.map(child => (
                  <Reorder.Item key={child.id} value={child} className="flex-shrink-0 snap-start" dragListener={!isReorderLocked}>
                    <button onClick={() => setSelectedChild(child)} className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all select-none font-bold ${selectedChild?.id === child.id ? `bg-white ${child.type === 'pet' ? 'text-amber-700' : child.type === 'adult' ? 'text-emerald-700' : 'text-indigo-700'} shadow-sm` : 'bg-black/10 text-white/90 hover:bg-black/20'} ${!isReorderLocked ? 'border-2 border-dashed border-white/50' : ''}`}>
                      {child.type === 'pet' ? <PawPrint size={16} /> : child.type === 'adult' ? <User size={16} /> : <Baby size={16} />}
                    <button onClick={() => setSelectedChild(child)} className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all select-none font-bold ${selectedChild?.id === child.id ? `bg-white ${child.type === 'pet' ? 'text-amber-700' : child.type === 'adult' ? 'text-emerald-700' : 'text-indigo-700'} shadow-sm` : 'bg-black/10 text-white/90 hover:bg-black/20'} ${!isReorderLocked ? 'border-2 border-dashed border-white/50' : ''}`}>
                      {child.type === 'pet' ? <PawPrint size={16} /> : child.type === 'adult' ? <User size={16} /> : <Baby size={16} />}
                      {child.name}
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {selectedChild && (
                <div className="flex justify-between items-center mt-2 bg-black/10 p-3 rounded-[24px] backdrop-blur-md">
                  <div className="flex items-center gap-4 text-sm font-medium text-white/90 overflow-x-auto scrollbar-hide">
                    {selectedChild.height && <div className="flex items-center gap-1.5 shrink-0"><Ruler size={16} className="opacity-70"/><span>{selectedChild.height}{settings.heightUnit}</span></div>}
                    {selectedChild.weight && <div className="flex items-center gap-1.5 shrink-0"><Weight size={16} className="opacity-70"/><span>{selectedChild.weight}{settings.weightUnit}</span></div>}
                    {selectedChild.dob && <div className="flex items-center gap-1.5 shrink-0 border-l border-white/20 pl-3"><Calendar size={16} className="opacity-70"/><span>{calculateAge(selectedChild.dob)}</span></div>}
                    {selectedChild.bloodType && <div className="flex items-center gap-1.5 shrink-0 border-l border-white/20 pl-3"><Droplet size={16} className="opacity-70"/><span>{selectedChild.bloodType}</span></div>}
                <div className="flex justify-between items-center mt-2 bg-black/10 p-3 rounded-[24px] backdrop-blur-md">
                  <div className="flex items-center gap-4 text-sm font-medium text-white/90 overflow-x-auto scrollbar-hide">
                    {selectedChild.height && <div className="flex items-center gap-1.5 shrink-0"><Ruler size={16} className="opacity-70"/><span>{selectedChild.height}{settings.heightUnit}</span></div>}
                    {selectedChild.weight && <div className="flex items-center gap-1.5 shrink-0"><Weight size={16} className="opacity-70"/><span>{selectedChild.weight}{settings.weightUnit}</span></div>}
                    {selectedChild.dob && <div className="flex items-center gap-1.5 shrink-0 border-l border-white/20 pl-3"><Calendar size={16} className="opacity-70"/><span>{calculateAge(selectedChild.dob)}</span></div>}
                    {selectedChild.bloodType && <div className="flex items-center gap-1.5 shrink-0 border-l border-white/20 pl-3"><Droplet size={16} className="opacity-70"/><span>{selectedChild.bloodType}</span></div>}
                  </div>
                  <button onClick={() => openEditProfile(selectedChild)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors shrink-0 ml-2" aria-label="Edit Profile"><Pencil size={16} /></button>
                  <button onClick={() => openEditProfile(selectedChild)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors shrink-0 ml-2" aria-label="Edit Profile"><Pencil size={16} /></button>
                </div>
              )}
            </>
          )}
        </div>

        {isDadBodMode ? (
          <div className="flex-1 p-6 overflow-y-auto -mt-6 z-20">
          <div className="flex-1 p-6 overflow-y-auto -mt-6 z-20">
            <DadBodTracker user={user} />
          </div>
        ) : (
          <>
            {/* MD3 Grid Layout */}
            <div className="px-6 -mt-6 z-20 grid grid-cols-2 gap-4">
            {/* MD3 Grid Layout */}
            <div className="px-6 -mt-6 z-20 grid grid-cols-2 gap-4">
              {settings.dashboardOrder.filter(w => w.visible).map((widget) => {
                const style = "bg-white p-5 rounded-[28px] shadow-sm flex flex-col items-start gap-3 hover:-translate-y-0.5 transition-transform cursor-pointer";
                if (widget.id === 'symptom') return <button key={widget.id} onClick={() => setIsSymptomOpen(true)} className={style}><div className="p-3 bg-red-100 text-red-700 rounded-full"><Thermometer size={24} /></div><span className="text-sm font-bold text-slate-800">Symptom</span></button>;
                if (widget.id === 'medicine') return <button key={widget.id} onClick={() => setIsMedicineOpen(true)} className={style}><div className="p-3 bg-blue-100 text-blue-700 rounded-full"><Pill size={24} /></div><span className="text-sm font-bold text-slate-800">Medicine</span></button>;
                if (widget.id === 'nutrition') return <button key={widget.id} onClick={() => setIsNutritionOpen(true)} className={style}><div className="p-3 bg-orange-100 text-orange-700 rounded-full">{isPet ? <Bone size={24} /> : <Utensils size={24} />}</div><span className="text-sm font-bold text-slate-800">Nutrition</span></button>;
                if (widget.id === 'growth') return <button key={widget.id} onClick={() => setIsStatsOpen(true)} className={style}><div className="p-3 bg-emerald-100 text-emerald-700 rounded-full"><Weight size={24} /></div><span className="text-sm font-bold text-slate-800">Growth</span></button>;
                if (widget.id === 'doctor') return <button key={widget.id} onClick={() => setIsDoctorOpen(true)} className={style}><div className="p-3 bg-purple-100 text-purple-700 rounded-full"><Stethoscope size={24} /></div><span className="text-sm font-bold text-slate-800">Doctor</span></button>;
                const style = "bg-white p-5 rounded-[28px] shadow-sm flex flex-col items-start gap-3 hover:-translate-y-0.5 transition-transform cursor-pointer";
                if (widget.id === 'symptom') return <button key={widget.id} onClick={() => setIsSymptomOpen(true)} className={style}><div className="p-3 bg-red-100 text-red-700 rounded-full"><Thermometer size={24} /></div><span className="text-sm font-bold text-slate-800">Symptom</span></button>;
                if (widget.id === 'medicine') return <button key={widget.id} onClick={() => setIsMedicineOpen(true)} className={style}><div className="p-3 bg-blue-100 text-blue-700 rounded-full"><Pill size={24} /></div><span className="text-sm font-bold text-slate-800">Medicine</span></button>;
                if (widget.id === 'nutrition') return <button key={widget.id} onClick={() => setIsNutritionOpen(true)} className={style}><div className="p-3 bg-orange-100 text-orange-700 rounded-full">{isPet ? <Bone size={24} /> : <Utensils size={24} />}</div><span className="text-sm font-bold text-slate-800">Nutrition</span></button>;
                if (widget.id === 'growth') return <button key={widget.id} onClick={() => setIsStatsOpen(true)} className={style}><div className="p-3 bg-emerald-100 text-emerald-700 rounded-full"><Weight size={24} /></div><span className="text-sm font-bold text-slate-800">Growth</span></button>;
                if (widget.id === 'doctor') return <button key={widget.id} onClick={() => setIsDoctorOpen(true)} className={style}><div className="p-3 bg-purple-100 text-purple-700 rounded-full"><Stethoscope size={24} /></div><span className="text-sm font-bold text-slate-800">Doctor</span></button>;
                return null;
              })}
            </div>

            {/* View Toggles (MD3 segmented button style) */}
            {/* View Toggles (MD3 segmented button style) */}
            <div className="px-6 mt-6 mb-2">
              <div className="bg-slate-200/50 p-1 rounded-full flex">
                <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><List size={18} /> Timeline</button>
                <button onClick={() => setViewMode('trends')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'trends' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={18} /> Trends</button>
              <div className="bg-slate-200/50 p-1 rounded-full flex">
                <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><List size={18} /> Timeline</button>
                <button onClick={() => setViewMode('trends')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'trends' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={18} /> Trends</button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex-1 p-6 overflow-y-auto">
              {viewMode === 'timeline' ? (
                <div className="space-y-4 relative">
                  {currentChildLogs.length === 0 && <div className="text-center py-12"><div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4"><StickyNote size={24} className="text-slate-400" /></div><p className="text-sm font-bold text-slate-500">No logs yet for {selectedChild?.name}</p></div>}
                  
                <div className="space-y-4 relative">
                  {currentChildLogs.length === 0 && <div className="text-center py-12"><div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4"><StickyNote size={24} className="text-slate-400" /></div><p className="text-sm font-bold text-slate-500">No logs yet for {selectedChild?.name}</p></div>}
                  
                  {currentChildLogs.map((log) => (
                    <div key={log.id} className="relative pl-6 pb-2">
                      <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-slate-200/60 rounded-full"></div>
                      <div className={`absolute left-0 top-6 w-[20px] h-[20px] rounded-full border-4 border-slate-100 shadow-sm z-10 ${log.type === 'medicine' ? 'bg-blue-500' : log.type === 'measurement' ? 'bg-emerald-500' : log.type === 'nutrition' ? 'bg-orange-500' : log.type === 'doctor_visit' ? 'bg-purple-500' : 'bg-red-500'}`} />
                      
                      <div className="bg-white p-5 rounded-[28px] shadow-sm ml-2">
                        <div className="flex justify-between items-start mb-3"><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{log.type.replace('_', ' ')} &bull; {formatDate(log.timestamp)} {formatTime(log.timestamp)}</span><button onClick={() => deleteLog(log.id)} className="text-slate-300 hover:text-red-500 bg-slate-50 p-1.5 rounded-full transition-colors"><Trash2 size={16} /></button></div>
                        {log.type === 'symptom' && <div className="flex items-start gap-4">{log.temperature && <div className="text-3xl font-black text-slate-900">{log.temperature}°<span className="text-lg text-slate-400">{settings.tempUnit}</span></div>}<div className="flex flex-wrap gap-1.5">{log.symptoms?.map(s => <span key={s} className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-full font-bold">{s}</span>)}</div></div>}
                        {log.type === 'medicine' && (<div><div className="font-black text-slate-900 text-xl">{log.medicineName}</div><div className="text-slate-600 font-medium mb-2">{log.dosage}</div>{log.isRecurring && (<div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-1"><Repeat size={14} /> Every {log.scheduleFrequency}h for {log.scheduleDuration}d</div>)}</div>)}
                        {log.type === 'nutrition' && <div className="flex items-center gap-4"><div className="p-3 bg-orange-50 text-orange-600 rounded-full">{log.nutritionType === 'liquid' || log.nutritionType === 'water' ? <Droplets size={24} /> : isPet ? <Bone size={24} /> : <Utensils size={24} />}</div><div><div className="font-black text-slate-900 text-lg">{log.item || (log.nutritionType === 'water' ? 'Water Refill' : 'Meal')}</div>{log.amount && <div className="text-slate-500 font-medium">{log.amount}</div>}</div></div>}
                        {log.type === 'measurement' && <div className="flex gap-3 flex-wrap">{log.weight && <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-sm font-bold">Weight: {log.weight} {settings.weightUnit}</div>}{log.height && <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-sm font-bold">Height: {log.height} {settings.heightUnit}</div>}</div>}
                        {log.type === 'doctor_visit' && <div className="space-y-3"><div className="flex items-center gap-2 text-purple-900 font-black text-xl"><Stethoscope size={24} /> {log.doctorName || "Doctor Visit"}</div>{log.visitReason && <div className="text-slate-700 font-medium bg-purple-50 px-3 py-1.5 rounded-lg inline-block">Reason: {log.visitReason}</div>}{log.prescriptions && (<div className="bg-slate-50 p-4 rounded-2xl mt-2"><div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Prescriptions</div><div className="text-slate-800 font-medium whitespace-pre-wrap">{log.prescriptions}</div></div>)}</div>}
                        {log.note && <div className="mt-3 text-sm text-slate-600 font-medium bg-slate-50 p-3 rounded-2xl">"{log.note}"</div>}
                    <div key={log.id} className="relative pl-6 pb-2">
                      <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-slate-200/60 rounded-full"></div>
                      <div className={`absolute left-0 top-6 w-[20px] h-[20px] rounded-full border-4 border-slate-100 shadow-sm z-10 ${log.type === 'medicine' ? 'bg-blue-500' : log.type === 'measurement' ? 'bg-emerald-500' : log.type === 'nutrition' ? 'bg-orange-500' : log.type === 'doctor_visit' ? 'bg-purple-500' : 'bg-red-500'}`} />
                      
                      <div className="bg-white p-5 rounded-[28px] shadow-sm ml-2">
                        <div className="flex justify-between items-start mb-3"><span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{log.type.replace('_', ' ')} &bull; {formatDate(log.timestamp)} {formatTime(log.timestamp)}</span><button onClick={() => deleteLog(log.id)} className="text-slate-300 hover:text-red-500 bg-slate-50 p-1.5 rounded-full transition-colors"><Trash2 size={16} /></button></div>
                        {log.type === 'symptom' && <div className="flex items-start gap-4">{log.temperature && <div className="text-3xl font-black text-slate-900">{log.temperature}°<span className="text-lg text-slate-400">{settings.tempUnit}</span></div>}<div className="flex flex-wrap gap-1.5">{log.symptoms?.map(s => <span key={s} className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-full font-bold">{s}</span>)}</div></div>}
                        {log.type === 'medicine' && (<div><div className="font-black text-slate-900 text-xl">{log.medicineName}</div><div className="text-slate-600 font-medium mb-2">{log.dosage}</div>{log.isRecurring && (<div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-1"><Repeat size={14} /> Every {log.scheduleFrequency}h for {log.scheduleDuration}d</div>)}</div>)}
                        {log.type === 'nutrition' && <div className="flex items-center gap-4"><div className="p-3 bg-orange-50 text-orange-600 rounded-full">{log.nutritionType === 'liquid' || log.nutritionType === 'water' ? <Droplets size={24} /> : isPet ? <Bone size={24} /> : <Utensils size={24} />}</div><div><div className="font-black text-slate-900 text-lg">{log.item || (log.nutritionType === 'water' ? 'Water Refill' : 'Meal')}</div>{log.amount && <div className="text-slate-500 font-medium">{log.amount}</div>}</div></div>}
                        {log.type === 'measurement' && <div className="flex gap-3 flex-wrap">{log.weight && <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-sm font-bold">Weight: {log.weight} {settings.weightUnit}</div>}{log.height && <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-2xl text-sm font-bold">Height: {log.height} {settings.heightUnit}</div>}</div>}
                        {log.type === 'doctor_visit' && <div className="space-y-3"><div className="flex items-center gap-2 text-purple-900 font-black text-xl"><Stethoscope size={24} /> {log.doctorName || "Doctor Visit"}</div>{log.visitReason && <div className="text-slate-700 font-medium bg-purple-50 px-3 py-1.5 rounded-lg inline-block">Reason: {log.visitReason}</div>}{log.prescriptions && (<div className="bg-slate-50 p-4 rounded-2xl mt-2"><div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Prescriptions</div><div className="text-slate-800 font-medium whitespace-pre-wrap">{log.prescriptions}</div></div>)}</div>}
                        {log.note && <div className="mt-3 text-sm text-slate-600 font-medium bg-slate-50 p-3 rounded-2xl">"{log.note}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6"><SimpleLineChart data={weightData} title={`Weight History (${settings.weightUnit})`} unit={settings.weightUnit} colorHex="#10b981" /><SimpleLineChart data={temperatureData} title={`Temp History (°${settings.tempUnit})`} unit={`°${settings.tempUnit}`} colorHex="#ef4444" /></div>
                <div className="space-y-6"><SimpleLineChart data={weightData} title={`Weight History (${settings.weightUnit})`} unit={settings.weightUnit} colorHex="#10b981" /><SimpleLineChart data={temperatureData} title={`Temp History (°${settings.tempUnit})`} unit={`°${settings.tempUnit}`} colorHex="#ef4444" /></div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Settings Modal (MD3) */}
      {/* Settings Modal (MD3) */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App Settings">
        <div className="space-y-8">
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Units</h4><div className="bg-slate-50 p-5 rounded-[28px] space-y-5"><div className="flex justify-between items-center"><span className="font-bold text-slate-700">Temperature</span><div className="flex bg-slate-200/50 rounded-full p-1"><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'C' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.tempUnit === 'C' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>°C</button><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'F' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.tempUnit === 'F' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>°F</button></div></div><div className="flex justify-between items-center"><span className="font-bold text-slate-700">Weight</span><div className="flex bg-slate-200/50 rounded-full p-1"><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'kg' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.weightUnit === 'kg' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>kg</button><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'lbs' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.weightUnit === 'lbs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>lbs</button></div></div></div></div>
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Widgets</h4><div className="bg-slate-50 p-3 rounded-[28px] space-y-2">{settings.dashboardOrder.map((widget, idx) => (<div key={widget.id} className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><button onClick={() => toggleWidgetVisibility(widget.id)} className={`p-2 rounded-full transition-colors ${widget.visible ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{widget.visible ? <Eye size={20} /> : <EyeOff size={20} />}</button><span className={`font-bold ${widget.visible ? 'text-slate-800' : 'text-slate-400'}`}>{widget.label}</span></div><div className="flex gap-1"><button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowUp size={20} /></button><button disabled={idx === settings.dashboardOrder.length - 1} onClick={() => moveWidget(idx, 'down')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowDown size={20} /></button></div></div>))}</div></div>
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Account</h4><Button variant="outline" onClick={handleExportData} className="w-full mb-3 !rounded-full"><Download size={18} /> Export Data (JSON)</Button><Button variant="danger" onClick={handleLogout} className="w-full !rounded-full"><LogOut size={18} /> Sign Out</Button></div>
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Units</h4><div className="bg-slate-50 p-5 rounded-[28px] space-y-5"><div className="flex justify-between items-center"><span className="font-bold text-slate-700">Temperature</span><div className="flex bg-slate-200/50 rounded-full p-1"><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'C' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.tempUnit === 'C' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>°C</button><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'F' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.tempUnit === 'F' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>°F</button></div></div><div className="flex justify-between items-center"><span className="font-bold text-slate-700">Weight</span><div className="flex bg-slate-200/50 rounded-full p-1"><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'kg' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.weightUnit === 'kg' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>kg</button><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'lbs' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.weightUnit === 'lbs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>lbs</button></div></div></div></div>
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Widgets</h4><div className="bg-slate-50 p-3 rounded-[28px] space-y-2">{settings.dashboardOrder.map((widget, idx) => (<div key={widget.id} className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><button onClick={() => toggleWidgetVisibility(widget.id)} className={`p-2 rounded-full transition-colors ${widget.visible ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{widget.visible ? <Eye size={20} /> : <EyeOff size={20} />}</button><span className={`font-bold ${widget.visible ? 'text-slate-800' : 'text-slate-400'}`}>{widget.label}</span></div><div className="flex gap-1"><button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowUp size={20} /></button><button disabled={idx === settings.dashboardOrder.length - 1} onClick={() => moveWidget(idx, 'down')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowDown size={20} /></button></div></div>))}</div></div>
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Account</h4><Button variant="outline" onClick={handleExportData} className="w-full mb-3 !rounded-full"><Download size={18} /> Export Data (JSON)</Button><Button variant="danger" onClick={handleLogout} className="w-full !rounded-full"><LogOut size={18} /> Sign Out</Button></div>
        </div>
      </Modal>

      {/* Add/Edit Profile Modal (MD3) */}
      {/* Add/Edit Profile Modal (MD3) */}
      <Modal isOpen={isAddChildOpen} onClose={closeProfileModal} title={editingId ? "Edit Profile" : "Add Profile"}>
        <form onSubmit={handleSaveProfile} className="space-y-4">
           <div className="grid grid-cols-3 gap-3 mb-6">
             <button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'child' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Baby size={28} />Child</button>
             <button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'pet' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><PawPrint size={28} />Pet</button>
             <button type="button" onClick={() => setNewProfileType('adult')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'adult' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><User size={28} />Adult</button>
           <div className="grid grid-cols-3 gap-3 mb-6">
             <button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'child' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Baby size={28} />Child</button>
             <button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'pet' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><PawPrint size={28} />Pet</button>
             <button type="button" onClick={() => setNewProfileType('adult')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'adult' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><User size={28} />Adult</button>
           </div>
           <div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Name</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" /></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Height</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100cm" /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Weight</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 18kg" /></div></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">DOB</label><input type="date" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newDob} onChange={(e) => setNewDob(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Blood Type</label><select className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newBloodType} onChange={(e) => setNewBloodType(e.target.value)}><option value="">Select</option>{bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
           <Button type="submit" className="w-full mt-4" disabled={!newChildName.trim()}>{editingId ? "Update Profile" : "Save Profile"}</Button>
           <div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Name</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" /></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Height</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100cm" /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Weight</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 18kg" /></div></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">DOB</label><input type="date" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newDob} onChange={(e) => setNewDob(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Blood Type</label><select className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newBloodType} onChange={(e) => setNewBloodType(e.target.value)}><option value="">Select</option>{bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
           <Button type="submit" className="w-full mt-4" disabled={!newChildName.trim()}>{editingId ? "Update Profile" : "Save Profile"}</Button>
        </form>
      </Modal>

      {/* Log Modals (MD3) */}
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title="Log Growth"><form onSubmit={handleAddStats} className="space-y-6"><RollerInput label={`Weight (${settings.weightUnit})`} value={logForm.weight} onChange={(val) => setLogForm({...logForm, weight: val})} step={0.1} min={0} max={500} unit={settings.weightUnit} /><RollerInput label={`Height (${settings.heightUnit})`} value={logForm.height} onChange={(val) => setLogForm({...logForm, height: val})} step={1} min={0} max={300} unit={settings.heightUnit} /><Button type="submit" className="w-full !mt-8">Save</Button></form></Modal>
      <Modal isOpen={isSymptomOpen} onClose={() => setIsSymptomOpen(false)} title="Log Symptoms"><form onSubmit={handleAddSymptom} className="space-y-6"><RollerInput label={`Temperature (°${settings.tempUnit})`} value={logForm.temp} onChange={(val) => setLogForm({...logForm, temp: val})} step={0.1} min={30} max={45} unit={`°${settings.tempUnit}`} /><div className="flex flex-wrap gap-2">{commonSymptoms.map(sym => (<button key={sym} type="button" onClick={() => toggleSymptom(sym)} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${logForm.symptoms.includes(sym) ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{sym}</button>))}</div><textarea className="w-full p-4 bg-slate-100 rounded-3xl outline-none focus:bg-slate-200 font-medium text-slate-800" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full">Save</Button></form></Modal>

      {/* Log Modals (MD3) */}
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title="Log Growth"><form onSubmit={handleAddStats} className="space-y-6"><RollerInput label={`Weight (${settings.weightUnit})`} value={logForm.weight} onChange={(val) => setLogForm({...logForm, weight: val})} step={0.1} min={0} max={500} unit={settings.weightUnit} /><RollerInput label={`Height (${settings.heightUnit})`} value={logForm.height} onChange={(val) => setLogForm({...logForm, height: val})} step={1} min={0} max={300} unit={settings.heightUnit} /><Button type="submit" className="w-full !mt-8">Save</Button></form></Modal>
      <Modal isOpen={isSymptomOpen} onClose={() => setIsSymptomOpen(false)} title="Log Symptoms"><form onSubmit={handleAddSymptom} className="space-y-6"><RollerInput label={`Temperature (°${settings.tempUnit})`} value={logForm.temp} onChange={(val) => setLogForm({...logForm, temp: val})} step={0.1} min={30} max={45} unit={`°${settings.tempUnit}`} /><div className="flex flex-wrap gap-2">{commonSymptoms.map(sym => (<button key={sym} type="button" onClick={() => toggleSymptom(sym)} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${logForm.symptoms.includes(sym) ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{sym}</button>))}</div><textarea className="w-full p-4 bg-slate-100 rounded-3xl outline-none focus:bg-slate-200 font-medium text-slate-800" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full">Save</Button></form></Modal>
      
      <Modal isOpen={isMedicineOpen} onClose={() => setIsMedicineOpen(false)} title="Log Medicine">
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Medicine Name" value={logForm.medicineName} onChange={(e) => setLogForm({ ...logForm, medicineName: e.target.value })} />
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Dosage" value={logForm.dosage} onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })} />
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Medicine Name" value={logForm.medicineName} onChange={(e) => setLogForm({ ...logForm, medicineName: e.target.value })} />
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Dosage" value={logForm.dosage} onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })} />
          
          <div className="bg-blue-50 p-5 rounded-3xl">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold"><Bell size={20} /> Schedule Course</div>
              <div onClick={() => setLogForm({...logForm, isRecurring: !logForm.isRecurring})} className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors ${logForm.isRecurring ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${logForm.isRecurring ? 'left-7 shadow-sm' : 'left-1 shadow-sm'}`}></div></div>
            </div>
          <div className="bg-blue-50 p-5 rounded-3xl">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold"><Bell size={20} /> Schedule Course</div>
              <div onClick={() => setLogForm({...logForm, isRecurring: !logForm.isRecurring})} className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors ${logForm.isRecurring ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${logForm.isRecurring ? 'left-7 shadow-sm' : 'left-1 shadow-sm'}`}></div></div>
            </div>
            {logForm.isRecurring && (
              <div className="space-y-5 pt-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-5 pt-4 animate-in fade-in slide-in-from-top-2">
                <RollerInput label="Every (Hours):" value={logForm.scheduleFrequency} onChange={(val) => setLogForm({...logForm, scheduleFrequency: val})} step={1} min={1} max={24} unit="hrs" />
                <RollerInput label="For (Days):" value={logForm.scheduleDuration} onChange={(val) => setLogForm({...logForm, scheduleDuration: val})} step={1} min={1} max={30} unit="days" />
                <div className="text-xs font-medium text-blue-700 bg-white/60 p-3 rounded-2xl text-center">Note: Notifications require app open or backgrounded.</div>
                <div className="text-xs font-medium text-blue-700 bg-white/60 p-3 rounded-2xl text-center">Note: Notifications require app open or backgrounded.</div>
              </div>
            )}
          </div>
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-medium text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} />
          <Button type="submit" className="w-full !mt-6">Log Medicine</Button>
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-medium text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} />
          <Button type="submit" className="w-full !mt-6">Log Medicine</Button>
        </form>
      </Modal>

      <Modal isOpen={isNutritionOpen} onClose={() => setIsNutritionOpen(false)} title="Log Nutrition"><form onSubmit={handleAddNutrition} className="space-y-4"><div className="flex gap-3 mb-2"><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'food'})} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-colors ${logForm.nutritionType === 'food' ? 'bg-orange-100 text-orange-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{isPet ? <Bone size={28}/> : <Utensils size={28}/>} Food</button><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'liquid'})} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-colors ${logForm.nutritionType === 'liquid' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Droplets size={28}/> Drink</button></div><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="Item / Type" value={logForm.item} onChange={(e) => setLogForm({...logForm, item: e.target.value})} /><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="Amount" value={logForm.amount} onChange={(e) => setLogForm({...logForm, amount: e.target.value})} /><Button type="submit" className="w-full !bg-orange-600 !mt-6">Log Nutrition</Button></form></Modal>
      <Modal isOpen={isDoctorOpen} onClose={() => setIsDoctorOpen(false)} title="Record Doctor Visit"><form onSubmit={handleAddDoctorVisit} className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Doctor / Clinic Name</label><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Dr. Smith" value={logForm.doctorName} onChange={(e) => setLogForm({...logForm, doctorName: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Reason for Visit</label><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Checkup" value={logForm.visitReason} onChange={(e) => setLogForm({...logForm, visitReason: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Prescriptions & Schedule</label><textarea rows="3" className="w-full p-4 bg-slate-100 rounded-3xl font-medium text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Amoxicillin 500mg" value={logForm.prescriptions} onChange={(e) => setLogForm({...logForm, prescriptions: e.target.value})} /></div><textarea className="w-full p-4 bg-slate-100 rounded-3xl font-medium text-slate-800 outline-none focus:bg-slate-200" placeholder="Additional Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full !bg-purple-600 !mt-6">Save Visit</Button></form></Modal>
      <Modal isOpen={isNutritionOpen} onClose={() => setIsNutritionOpen(false)} title="Log Nutrition"><form onSubmit={handleAddNutrition} className="space-y-4"><div className="flex gap-3 mb-2"><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'food'})} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-colors ${logForm.nutritionType === 'food' ? 'bg-orange-100 text-orange-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{isPet ? <Bone size={28}/> : <Utensils size={28}/>} Food</button><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'liquid'})} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-colors ${logForm.nutritionType === 'liquid' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Droplets size={28}/> Drink</button></div><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="Item / Type" value={logForm.item} onChange={(e) => setLogForm({...logForm, item: e.target.value})} /><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="Amount" value={logForm.amount} onChange={(e) => setLogForm({...logForm, amount: e.target.value})} /><Button type="submit" className="w-full !bg-orange-600 !mt-6">Log Nutrition</Button></form></Modal>
      <Modal isOpen={isDoctorOpen} onClose={() => setIsDoctorOpen(false)} title="Record Doctor Visit"><form onSubmit={handleAddDoctorVisit} className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Doctor / Clinic Name</label><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Dr. Smith" value={logForm.doctorName} onChange={(e) => setLogForm({...logForm, doctorName: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Reason for Visit</label><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Checkup" value={logForm.visitReason} onChange={(e) => setLogForm({...logForm, visitReason: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Prescriptions & Schedule</label><textarea rows="3" className="w-full p-4 bg-slate-100 rounded-3xl font-medium text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Amoxicillin 500mg" value={logForm.prescriptions} onChange={(e) => setLogForm({...logForm, prescriptions: e.target.value})} /></div><textarea className="w-full p-4 bg-slate-100 rounded-3xl font-medium text-slate-800 outline-none focus:bg-slate-200" placeholder="Additional Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full !bg-purple-600 !mt-6">Save Visit</Button></form></Modal>

    </div>
  );
}