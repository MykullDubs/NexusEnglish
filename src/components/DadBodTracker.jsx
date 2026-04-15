import React, { useState, useEffect, useMemo } from 'react';
import { Utensils, Weight, Settings, Plus, Trash2, Check, Clock, Droplet, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SimpleLineChart } from "./SharedUI";

export function DadBodBanner({ user, showToast, askConfirm }) {
  const [eatStart, setEatStart] = useState("12:00"); const [eatEnd, setEatEnd] = useState("20:00");
  const [waterCount, setWaterCount] = useState(0); const [timeLeft, setTimeLeft] = useState("--:--");
  const [isFasting, setIsFasting] = useState(true); const [habits, setHabits] = useState([]);
  const [showHabits, setShowHabits] = useState(false); const [newHabitName, setNewHabitName] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, `users/${user.uid}/settings/dadbod`), (docSnap) => { if (docSnap.exists()) { if (docSnap.data().eatStart) setEatStart(docSnap.data().eatStart); if (docSnap.data().eatEnd) setEatEnd(docSnap.data().eatEnd); } });
    const unsubWater = onSnapshot(doc(db, `users/${user.uid}/water`, new Date().toISOString().split('T')[0]), (docSnap) => { if (docSnap.exists()) setWaterCount(docSnap.data().count || 0); else setWaterCount(0); });
    const unsubHabits = onSnapshot(query(collection(db, `users/${user.uid}/habits`), orderBy("createdAt", "asc")), (snapshot) => { const h = []; snapshot.forEach(doc => h.push({ id: doc.id, ...doc.data() })); setHabits(h); });
    return () => { unsubSettings(); unsubWater(); unsubHabits(); };
  }, [user]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date(); const [sH, sM] = eatStart.split(':').map(Number); const [eH, eM] = eatEnd.split(':').map(Number);
      let start = new Date(now); start.setHours(sH, sM, 0, 0); let end = new Date(now); end.setHours(eH, eM, 0, 0);
      let fasting = true; let target = null;
      if (start < end) { if (now < start) { fasting = true; target = start; } else if (now >= start && now < end) { fasting = false; target = end; } else { fasting = true; target = new Date(start); target.setDate(target.getDate() + 1); } } 
      else { if (now >= start) { fasting = false; target = new Date(end); target.setDate(target.getDate() + 1); } else if (now < end) { fasting = false; target = end; } else { fasting = true; target = start; } }
      setIsFasting(fasting); const diffMs = target - now; const h = Math.floor(diffMs / (1000 * 60 * 60)); const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} until fast ${fasting ? 'ends' : 'starts'}`);
    };
    updateTimer(); const interval = setInterval(updateTimer, 60000); return () => clearInterval(interval);
  }, [eatStart, eatEnd]);

  const handleAddWater = async () => { if (!user) return; await setDoc(doc(db, `users/${user.uid}/water`, new Date().toISOString().split('T')[0]), { count: Math.min(waterCount + 1, 8) }, { merge: true }); };
  const handleRemoveWater = async () => { if (!user || waterCount === 0) return; await setDoc(doc(db, `users/${user.uid}/water`, new Date().toISOString().split('T')[0]), { count: waterCount - 1 }, { merge: true }); };
  const handleAddHabit = async (e) => { e.preventDefault(); if (!newHabitName.trim() || !user) return; await addDoc(collection(db, `users/${user.uid}/habits`), { name: newHabitName, completedDates: [], createdAt: Timestamp.now() }); setNewHabitName(""); showToast("Habit tracked!", "success"); };
  const toggleHabitDate = async (habit, dateStr) => { import { updateDoc } from "firebase/firestore"; let updatedDates = [...(habit.completedDates || [])]; if (updatedDates.includes(dateStr)) updatedDates = updatedDates.filter(d => d !== dateStr); else updatedDates.push(dateStr); await updateDoc(doc(db, `users/${user.uid}/habits`, habit.id), { completedDates: updatedDates }); };
  const handleDeleteHabit = (id) => { askConfirm("Delete Habit", "Are you sure you want to stop tracking this habit?", async () => { await deleteDoc(doc(db, `users/${user.uid}/habits`, id)); showToast("Habit deleted", "success"); }); };

  const last7Days = useMemo(() => {
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i); days.push({ dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, dayName: d.toLocaleDateString([], { weekday: 'short' }).charAt(0), dayNum: d.getDate() }); } return days;
  }, []);

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between"><div className="flex items-center gap-3"><Clock size={18} className="text-white/80" /><span className="text-sm font-bold text-white tracking-wide">{timeLeft}</span></div><div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isFasting ? 'bg-amber-400/20 text-amber-200' : 'bg-emerald-400/20 text-emerald-200'}`}>{isFasting ? 'Fasting' : 'Eating'}</div></div>
      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2"><div className="flex justify-between items-center"><span className="text-xs font-bold text-white/70 uppercase tracking-widest">Daily Water</span><span className="text-xs font-bold text-white/90">{waterCount} / 8</span></div><div className="flex justify-between items-center gap-1">{[...Array(8)].map((_, i) => (<button key={i} onClick={i < waterCount ? handleRemoveWater : handleAddWater} className="p-1 active:scale-90 transition-transform"><Droplet size={24} className={i < waterCount ? "text-blue-400 fill-blue-400 drop-shadow-md" : "text-white/20"} /></button>))}</div></div>
      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2">
        <button onClick={() => setShowHabits(!showHabits)} className="w-full flex justify-between items-center text-sm font-bold text-white transition-colors"><div className="flex items-center gap-2"><Activity size={16} className="text-emerald-400" /> Streaks & Habits</div>{showHabits ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}</button>
        {showHabits && (
          <div className="mt-4 space-y-5 animate-in slide-in-from-top-2">
            {habits.length === 0 && <p className="text-xs text-white/50 text-center italic">No habits added yet.</p>}
            {habits.map(habit => (
              <div key={habit.id} className="space-y-2">
                <div className="flex justify-between items-center px-1"><span className="text-sm font-bold text-white/90">{habit.name}</span><button onClick={() => handleDeleteHabit(habit.id)} className="text-white/30 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button></div>
                <div className="flex justify-between gap-1.5">
                  {last7Days.map(({ dateStr, dayName, dayNum }) => {
                    const isCompleted = (habit.completedDates || []).includes(dateStr); const isToday = dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                    return (<button key={dateStr} onClick={() => toggleHabitDate(habit, dateStr)} className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl border transition-all active:scale-95 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : isToday ? 'bg-white/10 border-emerald-400/50 text-white/70 border-dashed' : 'bg-black/20 border-transparent text-white/30 hover:bg-white/10'}`}><span className="text-[10px] font-bold uppercase">{dayName}</span><span className={`text-sm font-black ${isCompleted ? 'text-white' : 'text-white/80'}`}>{dayNum}</span></button>);
                  })}
                </div>
              </div>
            ))}
            <form onSubmit={handleAddHabit} className="flex gap-2 pt-2"><input type="text" placeholder="e.g. No Energy Drinks" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className="flex-1 bg-black/20 border-none rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-400" /><button type="submit" disabled={!newHabitName.trim()} className="bg-emerald-500 disabled:bg-white/10 disabled:text-white/30 text-white px-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center"><Plus size={18} /></button></form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DadBodTracker({ user, showToast, askConfirm }) {
  const [sliderCals, setSliderCals] = useState(300); const [foodNote, setFoodNote] = useState(""); const [todayCalories, setTodayCalories] = useState(0);
  const [calorieLogs, setCalorieLogs] = useState([]); const [currentWeight, setCurrentWeight] = useState(""); const [latestWeight, setLatestWeight] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]); const [eatStart, setEatStart] = useState("12:00"); const [eatEnd, setEatEnd] = useState("20:00");
  const [calorieGoal, setCalorieGoal] = useState(2000); const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!user) return; const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const unsubCals = onSnapshot(query(collection(db, `users/${user.uid}/calories`), orderBy("timestamp", "desc")), (snapshot) => { const logs = []; let todayTotal = 0; snapshot.forEach((doc) => { const data = doc.data(); logs.push({ id: doc.id, ...data }); if (data.timestamp && data.timestamp.toDate() >= startOfToday) todayTotal += Number(data.amount) || 0; }); setCalorieLogs(logs); setTodayCalories(todayTotal); });
    const unsubWeight = onSnapshot(query(collection(db, `users/${user.uid}/weights`), orderBy("timestamp", "desc")), (snapshot) => { const logs = []; snapshot.forEach((doc) => logs.push({ id: doc.id, ...doc.data() })); setWeightLogs(logs); if (logs.length > 0) setLatestWeight(logs[0].weight); });
    const unsubSettings = onSnapshot(doc(db, `users/${user.uid}/settings/dadbod`), (docSnap) => { if (docSnap.exists()) { if (docSnap.data().eatStart) setEatStart(docSnap.data().eatStart); if (docSnap.data().eatEnd) setEatEnd(docSnap.data().eatEnd); if (docSnap.data().calorieGoal) setCalorieGoal(docSnap.data().calorieGoal); } });
    return () => { unsubCals(); unsubWeight(); unsubSettings(); };
  }, [user]);

  const handleLogCalories = async (e) => { e.preventDefault(); if (!user) return; await addDoc(collection(db, `users/${user.uid}/calories`), { amount: Number(sliderCals), note: foodNote || "Quick Add", timestamp: Timestamp.now() }); setSliderCals(300); setFoodNote(""); showToast("Calories logged!", "success"); };
  const handleLogWeight = async (e) => { e.preventDefault(); if (!user || !currentWeight) return; await addDoc(collection(db, `users/${user.uid}/weights`), { weight: Number(currentWeight), timestamp: Timestamp.now() }); setCurrentWeight(""); showToast("Weight logged!", "success"); };
  const handleDeleteCalorie = (id) => { askConfirm("Delete Log", "Are you sure you want to remove this calorie log?", async () => { await deleteDoc(doc(db, `users/${user.uid}/calories`, id)); showToast("Log deleted", "success"); }); };
  const handleDeleteWeight = (id) => { askConfirm("Delete Weigh-in", "Are you sure you want to remove this weight record?", async () => { await deleteDoc(doc(db, `users/${user.uid}/weights`, id)); showToast("Record deleted", "success"); }); };
  const saveDadBodSettings = async (start, end, goal) => { setEatStart(start); setEatEnd(end); setCalorieGoal(goal); if (user) await setDoc(doc(db, `users/${user.uid}/settings/dadbod`), { eatStart: start, eatEnd: end, calorieGoal: goal }, { merge: true }); };

  const checkCompliance = (timestamp) => {
    if (!timestamp) return true; const date = timestamp.toDate(); const logTime = date.getHours() + date.getMinutes() / 60; const [sH, sM] = eatStart.split(':').map(Number); const [eH, eM] = eatEnd.split(':').map(Number);
    const startTime = sH + sM / 60; const endTime = eH + eM / 60; if (startTime < endTime) return logTime >= startTime && logTime <= endTime; return logTime >= startTime || logTime <= endTime;
  };

  const weightChartData = [...weightLogs].reverse().map(l => ({ date: l.timestamp?.toDate().toISOString() || new Date().toISOString(), value: l.weight }));
  const formatTime = (timestamp) => timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (timestamp) => timestamp?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' });
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0); const todaysCalorieLogs = calorieLogs.filter(log => log.timestamp?.toDate() >= startOfToday);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] shadow-lg space-y-4">
        <div className="flex justify-between items-start">
          <div><p className="text-slate-400 text-sm font-medium mb-1">Today's Intake</p><h2 className="text-4xl font-black text-white tracking-tight">{todayCalories} <span className="text-lg text-slate-500 font-medium">/ {calorieGoal}</span></h2></div>
          <div className="text-right"><p className="text-slate-400 text-sm font-medium mb-1">Weight</p><div className="text-2xl font-bold text-white">{latestWeight || "--"} <span className="text-sm text-slate-500 font-medium">lbs</span></div></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] shadow-lg space-y-6">
        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 text-blue-400 rounded-full"><Utensils size={18} /></div><h2 className="text-lg font-bold text-white">Food Log</h2></div><button type="button" onClick={() => setShowSettings(!showSettings)} className="text-xs font-bold text-blue-400 flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-full transition-all active:scale-95"><Settings size={14}/> Goals</button></div>
        {showSettings && (
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-3xl grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
              <div className="col-span-2"><label className="text-xs font-bold text-slate-400 ml-2">Daily Calorie Goal</label><input type="number" step="50" value={calorieGoal} onChange={(e) => saveDadBodSettings(eatStart, eatEnd, Number(e.target.value))} className="w-full bg-slate-800 rounded-full px-4 py-3 text-base font-bold text-white outline-none mt-1 shadow-inner focus:ring-2 focus:ring-blue-500/50 border border-slate-700" /></div>
              <div><label className="text-xs font-bold text-slate-400 ml-2">Window Start</label><input type="time" value={eatStart} onChange={(e) => saveDadBodSettings(e.target.value, eatEnd, calorieGoal)} className="w-full bg-slate-800 rounded-full px-4 py-3 text-sm font-bold text-white outline-none mt-1 shadow-inner focus:ring-2 focus:ring-blue-500/50 border border-slate-700" /></div>
              <div><label className="text-xs font-bold text-slate-400 ml-2">Window End</label><input type="time" value={eatEnd} onChange={(e) => saveDadBodSettings(eatStart, e.target.value, calorieGoal)} className="w-full bg-slate-800 rounded-full px-4 py-3 text-sm font-bold text-white outline-none mt-1 shadow-inner focus:ring-2 focus:ring-blue-500/50 border border-slate-700" /></div>
          </div>
        )}
        <form onSubmit={handleLogCalories} className="space-y-6">
          <div className="space-y-4 bg-slate-800/30 border border-slate-800 p-6 rounded-3xl"><div className="flex justify-center items-end"><span className="text-6xl font-black text-blue-500 tracking-tighter">{sliderCals}</span></div><input type="range" min="50" max="2500" step="50" value={sliderCals} onChange={(e) => setSliderCals(e.target.value)} className="w-full h-3 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500" /></div>
          <input type="text" placeholder="What did you eat? (Optional)" value={foodNote} onChange={(e) => setFoodNote(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-full px-5 py-4 text-white placeholder:text-slate-500 focus:bg-slate-700 transition-colors outline-none" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-4 rounded-full shadow-lg shadow-blue-900/20 flex justify-center gap-2 transition-all active:scale-95"><Plus className="w-6 h-6" /> Log Calories</button>
        </form>
        {todaysCalorieLogs.length > 0 && (
          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 ml-2">Today's Logs</h3>
            <div className="space-y-2">
              {todaysCalorieLogs.map(log => {
                const isCompliant = checkCompliance(log.timestamp);
                return (
                  <div key={log.id} className={`flex justify-between items-center p-4 rounded-[20px] transition-colors border ${isCompliant ? 'bg-slate-800/50 border-slate-700' : 'bg-red-950/30 border-red-900/50'}`}>
                    <div><div className="font-bold text-slate-200 flex items-center gap-2">{log.note}{!isCompliant && <span className="text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Fasting</span>}</div><div className={`text-sm ${isCompliant ? 'text-slate-500' : 'text-red-400/80 font-medium'}`}>{formatTime(log.timestamp)}</div></div>
                    <div className="flex items-center gap-4"><span className={`font-black text-lg ${isCompliant ? 'text-blue-400' : 'text-red-400'}`}>{log.amount} <span className="text-xs font-bold opacity-60">kcal</span></span><button onClick={() => handleDeleteCalorie(log.id)} className={`p-2 rounded-full transition-colors ${isCompliant ? 'text-slate-500 hover:bg-slate-700 hover:text-red-400' : 'text-red-500 hover:bg-red-900/50'}`}><Trash2 size={16} /></button></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] shadow-lg space-y-6">
        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-full"><Weight size={18} /></div><h2 className="text-lg font-bold text-white">Weigh-In</h2></div>
        <form onSubmit={handleLogWeight} className="flex gap-3"><input type="number" step="0.1" placeholder="e.g. 185.5" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-full px-5 py-4 text-white placeholder:text-slate-500 text-lg font-bold outline-none focus:bg-slate-700 transition-colors" /><button type="submit" disabled={!currentWeight} className="w-16 shrink-0 bg-indigo-600 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-full font-bold flex items-center justify-center transition-all active:scale-95"><Check className="w-6 h-6" /></button></form>
        {weightChartData.length > 0 && (
          <div className="pt-2">
             <div className="opacity-90"><SimpleLineChart data={weightChartData} title="Weight Trend" unit=" lbs" colorHex="#818cf8" /></div>
             <div className="mt-4 max-h-32 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {weightLogs.map(log => (
                  <div key={log.id} className="flex justify-between items-center text-sm p-3 hover:bg-slate-800 rounded-2xl transition-colors border border-transparent hover:border-slate-700"><span className="text-slate-400 font-medium">{formatDate(log.timestamp)}</span><div className="flex items-center gap-4"><span className="font-bold text-slate-200 text-base">{log.weight} lbs</span><button onClick={() => handleDeleteWeight(log.id)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-colors"><Trash2 size={16} /></button></div></div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
