import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Pencil, Activity, ExternalLink, ListTodo, 
  ShoppingCart, CheckSquare, Square, Trash2, Plus 
} from 'lucide-react';
import { doc, onSnapshot, setDoc, addDoc, collection, Timestamp, query, orderBy, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Modal, Button } from "./SharedUI";

export default function MealPlanner({ user, showToast, askConfirm }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [plan, setPlan] = useState({});
  const [groceries, setGroceries] = useState([]);
  
  // UI States
  const [editingDay, setEditingDay] = useState(null);
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [newGrocery, setNewGrocery] = useState("");

  // Edit States
  const [editName, setEditName] = useState("");
  const [editCals, setEditCals] = useState("");
  const [editIngredients, setEditIngredients] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Fetch Meals and Groceries
  useEffect(() => {
    if (!user) return;
    
    // Listen to the current week's meal plan
    const unsubMeals = onSnapshot(doc(db, `users/${user.uid}/mealPlan/current`), (docSnap) => {
      if (docSnap.exists()) setPlan(docSnap.data());
      else setPlan({});
    });
    
    // Listen to the live grocery list
    const unsubGroceries = onSnapshot(query(collection(db, `users/${user.uid}/groceries`), orderBy("createdAt", "desc")), (snap) => {
      setGroceries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubMeals(); unsubGroceries(); };
  }, [user]);

  // Save Meal
  const handleSaveDay = async (e) => {
    e.preventDefault();
    if (!user || !editingDay) return;
    await setDoc(doc(db, `users/${user.uid}/mealPlan/current`), {
      [editingDay]: { 
        name: editName, 
        cals: editCals,
        ingredients: editIngredients,
        notes: editNotes
      }
    }, { merge: true });
    setEditingDay(null);
    showToast(`${editingDay} meal updated!`, "success");
  };

  const openEdit = (day) => { 
    setEditingDay(day); 
    setEditName(plan[day]?.name || ""); 
    setEditCals(plan[day]?.cals || ""); 
    setEditIngredients(plan[day]?.ingredients || "");
    setEditNotes(plan[day]?.notes || "");
  };

  const handleLogToDadBod = async (mealName, cals) => {
    if(!user || !cals) return;
    await addDoc(collection(db, `users/${user.uid}/calories`), { 
      amount: Number(cals), 
      note: mealName || "Planned Meal", 
      timestamp: Timestamp.now() 
    });
    showToast("Logged to Dad-Bod!", "success");
  };

  // Grocery Functions
  const handleAddGrocery = async (e) => {
    e.preventDefault();
    if (!newGrocery.trim() || !user) return;
    await addDoc(collection(db, `users/${user.uid}/groceries`), { text: newGrocery, checked: false, createdAt: Timestamp.now() });
    setNewGrocery("");
  };

  const toggleGrocery = async (id, currentStatus) => {
    await updateDoc(doc(db, `users/${user.uid}/groceries`, id), { checked: !currentStatus });
  };

  const pushToCart = async (ingredientsStr) => {
    if (!ingredientsStr || !user) return;
    // Split by commas or newlines and clean up empty spaces
    const items = ingredientsStr.split(/,|\n/).map(i => i.trim()).filter(i => i);
    if (items.length === 0) return;
    
    // Batch write so we don't spam Firebase with 20 individual requests
    const batch = writeBatch(db);
    items.forEach(item => {
      const ref = doc(collection(db, `users/${user.uid}/groceries`));
      batch.set(ref, { text: item, checked: false, createdAt: Timestamp.now() });
    });
    await batch.commit();
    showToast(`Pushed ${items.length} items to Grocery List!`, "success");
  };

  const clearCheckedGroceries = async () => {
    askConfirm("Clear List", "Remove all checked items from your grocery list?", async () => {
      const batch = writeBatch(db);
      groceries.filter(g => g.checked).forEach(g => {
        batch.delete(doc(db, `users/${user.uid}/groceries`, g.id));
      });
      await batch.commit();
      showToast("List cleared", "success");
    });
  };

  const uncheckedCount = groceries.filter(g => !g.checked).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12">
      
      {/* HEADER & GROCERY CART BUTTON */}
      <div className="bg-white border border-orange-100 p-6 rounded-[28px] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-orange-100 text-orange-600 rounded-full"><ChefHat size={32} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Family Meals</h2>
            <p className="text-slate-500 font-medium text-sm">Plan ahead, eat well.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsGroceryOpen(true)} 
          className="relative p-3 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 rounded-2xl transition-colors active:scale-95"
        >
          <ShoppingCart size={24} />
          {uncheckedCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
              {uncheckedCount}
            </span>
          )}
        </button>
      </div>

      {/* WEEKLY GRID */}
      <div className="space-y-3">
        {daysOfWeek.map(day => {
          const isToday = day === todayName; 
          const dayPlan = plan[day] || { name: "", cals: "", ingredients: "", notes: "" }; 
          const hasMeal = dayPlan.name.trim() !== "";

          return (
            <div key={day} className={`bg-white rounded-3xl overflow-hidden transition-all ${isToday ? 'ring-2 ring-orange-500 shadow-md' : 'border border-slate-100 shadow-sm'}`}>
              
              {/* Day Header */}
              <div className={`px-5 py-3 flex justify-between items-center cursor-pointer ${isToday ? 'bg-orange-50' : 'bg-slate-50 hover:bg-slate-100'}`} onClick={() => openEdit(day)}>
                <div className="flex items-center gap-2">
                  <span className={`font-black uppercase tracking-widest text-xs ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>{day}</span>
                  {isToday && <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Today</span>}
                </div>
                <button className="text-slate-400 hover:text-orange-500 p-1 transition-colors"><Pencil size={14}/></button>
              </div>

              {/* Edit Mode */}
              {editingDay === day ? (
                <form onSubmit={handleSaveDay} className="p-4 space-y-3 border-t border-slate-100 bg-white animate-in slide-in-from-top-2">
                  <input type="text" placeholder="What's for dinner?" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 focus:bg-white transition-colors outline-none font-bold" autoFocus />
                  
                  <div className="flex gap-2">
                    <input type="number" placeholder="Est. Calories" value={editCals} onChange={(e) => setEditCals(e.target.value)} className="w-1/3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 focus:bg-white transition-colors outline-none font-medium" />
                    <input type="text" placeholder="Recipe Link / Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-2/3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 focus:bg-white transition-colors outline-none font-medium" />
                  </div>
                  
                  <textarea placeholder="Ingredients needed (comma separated)" value={editIngredients} onChange={(e) => setEditIngredients(e.target.value)} rows="2" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-800 focus:bg-white transition-colors outline-none font-medium text-sm" />
                  
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setEditingDay(null)} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Cancel</button>
                    <button type="submit" className="w-2/3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl py-3 transition-colors">Save Meal</button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="p-5 flex flex-col gap-3 bg-white cursor-pointer" onClick={() => openEdit(day)}>
                  <div className="flex justify-between items-start">
                    {hasMeal ? (
                      <div>
                        <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {dayPlan.name} 
                          {dayPlan.notes && dayPlan.notes.includes('http') && (
                            <a href={dayPlan.notes} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-lg">
                              <ExternalLink size={14}/>
                            </a>
                          )}
                        </div>
                        {dayPlan.cals && <div className="text-sm text-slate-500 font-medium mt-1">{dayPlan.cals} kcal</div>}
                      </div>
                    ) : (<div className="text-slate-400 font-medium italic text-sm">No meal planned</div>)}
                    
                    {isToday && hasMeal && dayPlan.cals && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLogToDadBod(dayPlan.name, dayPlan.cals); }} 
                        className="shrink-0 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                      >
                        <Activity size={14} className="text-blue-400"/> Dad-Bod
                      </button>
                    )}
                  </div>

                  {hasMeal && dayPlan.ingredients && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); pushToCart(dayPlan.ingredients); }} 
                       className="mt-2 w-full bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-100 text-slate-600 hover:text-orange-600 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                     >
                       <ListTodo size={14} /> Push ingredients to Grocery List
                     </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* GROCERY LIST MODAL */}
      <Modal isOpen={isGroceryOpen} onClose={() => setIsGroceryOpen(false)} title="Grocery List">
        <div className="flex flex-col h-full min-h-[50vh]">
          
          <form onSubmit={handleAddGrocery} className="flex gap-2 mb-6">
            <input type="text" placeholder="Add an item..." value={newGrocery} onChange={(e) => setNewGrocery(e.target.value)} className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-slate-200 transition-colors" />
            <button type="submit" disabled={!newGrocery.trim()} className="bg-slate-900 disabled:bg-slate-300 text-white px-4 rounded-xl transition-colors active:scale-95"><Plus size={20}/></button>
          </form>

          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {groceries.length === 0 && <div className="text-center text-slate-400 italic mt-10 text-sm">Your cart is empty.</div>}
            {groceries.map(g => (
              <div key={g.id} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${g.checked ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                <button onClick={() => toggleGrocery(g.id, g.checked)} className="flex flex-1 items-center gap-3 text-left">
                  {g.checked ? <CheckSquare className="text-emerald-500 shrink-0"/> : <Square className="text-slate-300 shrink-0"/>}
                  <span className={`font-bold text-sm ${g.checked ? "line-through text-slate-400" : "text-slate-800"}`}>{g.text}</span>
                </button>
                <button onClick={() => { deleteDoc(doc(db, `users/${user.uid}/groceries`, g.id)); }} className="text-slate-300 hover:text-red-500 p-2 shrink-0 transition-colors">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>

          {groceries.some(g => g.checked) && (
            <Button onClick={clearCheckedGroceries} variant="danger" className="w-full !rounded-xl py-3">Clear Checked Items</Button>
          )}
        </div>
      </Modal>

    </div>
  );
}
