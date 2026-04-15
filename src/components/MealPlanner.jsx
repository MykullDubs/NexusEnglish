import React, { useState, useEffect } from 'react';
import { ChefHat, Pencil, Activity } from 'lucide-react';
import { doc, onSnapshot, setDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function MealPlanner({ user, showToast }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [plan, setPlan] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCals, setEditCals] = useState("");

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, `users/${user.uid}/mealPlan/current`), (docSnap) => {
      if (docSnap.exists()) setPlan(docSnap.data());
      else setPlan({});
    });
    return () => unsub();
  }, [user]);

  const handleSaveDay = async (e) => {
    e.preventDefault();
    if (!user || !editingDay) return;
    await setDoc(doc(db, `users/${user.uid}/mealPlan/current`), {
      [editingDay]: { name: editName, cals: editCals }
    }, { merge: true });
    setEditingDay(null);
    showToast(`${editingDay} meal saved!`, "success");
  };

  const openEdit = (day) => { setEditingDay(day); setEditName(plan[day]?.name || ""); setEditCals(plan[day]?.cals || ""); };

  const handleLogToDadBod = async (mealName, cals) => {
    if(!user || !cals) return;
    await addDoc(collection(db, `users/${user.uid}/calories`), { amount: Number(cals), note: mealName || "Planned Meal", timestamp: Timestamp.now() });
    showToast("Logged to Dad-Bod!", "success");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12">
      <div className="bg-white border border-orange-100 p-6 rounded-[28px] shadow-sm flex items-center gap-4">
        <div className="p-4 bg-orange-100 text-orange-600 rounded-full"><ChefHat size={32} /></div>
        <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Weekly Meals</h2><p className="text-slate-500 font-medium text-sm">Plan ahead, stay on track.</p></div>
      </div>
      <div className="space-y-3">
        {daysOfWeek.map(day => {
          const isToday = day === todayName; const dayPlan = plan[day] || { name: "", cals: "" }; const hasMeal = dayPlan.name.trim() !== "";
          return (
            <div key={day} className={`bg-white rounded-3xl overflow-hidden transition-all ${isToday ? 'ring-2 ring-orange-500 shadow-md' : 'border border-slate-100 shadow-sm'}`}>
              <div className={`px-5 py-3 flex justify-between items-center cursor-pointer ${isToday ? 'bg-orange-50' : 'bg-slate-50'}`} onClick={() => openEdit(day)}>
                <div className="flex items-center gap-2"><span className={`font-black uppercase tracking-widest text-xs ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>{day}</span>{isToday && <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Today</span>}</div>
                <button className="text-slate-400 hover:text-orange-500 p-1 transition-colors"><Pencil size={14}/></button>
              </div>
              {editingDay === day ? (
                <form onSubmit={handleSaveDay} className="p-4 space-y-3 border-t border-slate-100 bg-white animate-in slide-in-from-top-2">
                  <input type="text" placeholder="What's for dinner?" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 focus:bg-white transition-colors outline-none font-bold" autoFocus />
                  <div className="flex gap-2"><input type="number" placeholder="Est. Calories" value={editCals} onChange={(e) => setEditCals(e.target.value)} className="w-1/2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 focus:bg-white transition-colors outline-none font-medium" /><button type="submit" className="w-1/2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all active:scale-95">Save</button></div>
                </form>
              ) : (
                <div className="p-5 flex justify-between items-center bg-white" onClick={() => openEdit(day)}>
                  {hasMeal ? (<div><div className="font-bold text-slate-800 text-lg">{dayPlan.name}</div>{dayPlan.cals && <div className="text-sm text-slate-500 font-medium mt-1">{dayPlan.cals} kcal</div>}</div>) : (<div className="text-slate-400 font-medium italic text-sm">No meal planned</div>)}
                  {isToday && hasMeal && dayPlan.cals && (<button onClick={(e) => { e.stopPropagation(); handleLogToDadBod(dayPlan.name, dayPlan.cals); }} className="shrink-0 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition-all active:scale-95 shadow-sm"><Activity size={14} className="text-blue-400"/> Dad-Bod</button>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
