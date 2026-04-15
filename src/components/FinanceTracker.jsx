import React, { useState, useEffect } from 'react';
import { Wallet, Coffee, Car, Home, ShoppingBag, Tag, ArrowDownRight, ArrowUpRight, Briefcase, GraduationCap, Globe, Plus, Trash2, QrCode } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Modal } from "./SharedUI";

export default function FinanceTracker({ user, showToast, askConfirm }) {
  const [transactionType, setTransactionType] = useState('expense'); 
  const [viewCurrency, setViewCurrency] = useState("MXN"); 
  const [amount, setAmount] = useState(""); 
  const [note, setNote] = useState(""); 
  const [exchangeRate, setExchangeRate] = useState(""); 
  const [isQrOpen, setIsQrOpen] = useState(false); 

  const expenseCategories = [{ name: "Food", icon: <Coffee size={16} />, color: "bg-orange-100 text-orange-700" }, { name: "Transport", icon: <Car size={16} />, color: "bg-blue-100 text-blue-700" }, { name: "Bills", icon: <Home size={16} />, color: "bg-purple-100 text-purple-700" }, { name: "Shopping", icon: <ShoppingBag size={16} />, color: "bg-pink-100 text-pink-700" }, { name: "Other", icon: <Tag size={16} />, color: "bg-slate-100 text-slate-700" }];
  const incomeCategories = [{ name: "TeachCast", icon: <Briefcase size={16} />, color: "bg-emerald-100 text-emerald-700" }, { name: "Carrot English", icon: <Globe size={16} />, color: "bg-orange-100 text-orange-700" }, { name: "Harmony School", icon: <GraduationCap size={16} />, color: "bg-indigo-100 text-indigo-700" }, { name: "Other", icon: <Plus size={16} />, color: "bg-slate-100 text-slate-700" }];

  const currentCategories = transactionType === 'expense' ? expenseCategories : incomeCategories;
  const [category, setCategory] = useState(expenseCategories[0].name);

  useEffect(() => { setCategory(currentCategories[0].name); }, [transactionType]);
  const [totals, setTotals] = useState({ expense: { USD: { today: 0, month: 0 }, MXN: { today: 0, month: 0 } }, income: { USD: { today: 0, month: 0 }, MXN: { today: 0, month: 0 } } });
  const [spendLogs, setSpendLogs] = useState([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const unsubSpend = onSnapshot(query(collection(db, `users/${user.uid}/finance`), orderBy("timestamp", "desc")), (snapshot) => {
      const logs = []; const newTotals = { expense: { USD: { today: 0, month: 0 }, MXN: { today: 0, month: 0 } }, income: { USD: { today: 0, month: 0 }, MXN: { today: 0, month: 0 } } };
      snapshot.forEach((doc) => {
        const data = doc.data(); const curr = data.currency || "USD"; const tType = data.type || "expense";
        logs.push({ id: doc.id, ...data, currency: curr, type: tType });
        if (data.timestamp && newTotals[tType] && newTotals[tType][curr]) {
          const logDate = data.timestamp.toDate();
          if (logDate >= startOfToday) newTotals[tType][curr].today += Number(data.amount) || 0;
          if (logDate >= startOfMonth) newTotals[tType][curr].month += Number(data.amount) || 0;
        }
      });
      setSpendLogs(logs); setTotals(newTotals);
    });
    return () => unsubSpend();
  }, [user]);

  const handleLogSpend = async (e) => {
    e.preventDefault(); if (!user || !amount || isNaN(amount)) return;
    const expenseData = { amount: parseFloat(amount), note: note || category, category: category, currency: viewCurrency, type: transactionType, exchangeRate: parseFloat(exchangeRate) || "", date: new Date().toLocaleString() };
    const docRef = await addDoc(collection(db, `users/${user.uid}/finance`), { ...expenseData, timestamp: Timestamp.now() });
    
    try {
      await fetch("https://script.google.com/macros/s/AKfycbxSPTYefuWTRS2hOLdTG1xFaFyeR89giyxbBdUAM6rPJOGJY37ZIZWcKDvKu6EptU3lpg/exec", {
        method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...expenseData, action: "add", id: docRef.id })
      });
    } catch (err) { console.error(err); showToast("Error syncing to Google Sheets", "error"); }
    
    setAmount(""); setNote(""); setExchangeRate(""); showToast(`${viewCurrency} ${transactionType === 'income' ? 'Income' : 'Expense'} logged!`, "success");
  };

  const handleDeleteSpend = (id) => {
    askConfirm("Delete Transaction", "Remove this transaction from your timeline and spreadsheet?", async () => {
      await deleteDoc(doc(db, `users/${user.uid}/finance`, id));
      try {
        await fetch("https://script.google.com/macros/s/AKfycbxSPTYefuWTRS2hOLdTG1xFaFyeR89giyxbBdUAM6rPJOGJY37ZIZWcKDvKu6EptU3lpg/exec", { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: id }) });
      } catch (err) { console.error("Failed to delete from Sheets", err); }
      showToast("Transaction deleted", "success");
    });
  };

  const formatTime = (timestamp) => timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const activeLogs = spendLogs.filter(log => log.type === transactionType && log.currency === viewCurrency && log.timestamp?.toDate() >= startOfToday);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12">
      <div className="bg-white border border-emerald-100 p-6 rounded-[28px] shadow-sm space-y-4">
        <div className="flex flex-col gap-3 mb-2 pb-4 border-b border-emerald-50">
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-slate-900">Wallet Overview</h2><button onClick={() => setIsQrOpen(true)} className="p-1.5 bg-slate-100 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors active:scale-95"><QrCode size={18} /></button></div><div className="flex bg-slate-100 rounded-full p-1"><button onClick={() => setViewCurrency('MXN')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewCurrency === 'MXN' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MXN</button><button onClick={() => setViewCurrency('USD')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewCurrency === 'USD' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>USD</button></div></div>
          <div className="flex bg-slate-100 rounded-full p-1 w-full"><button onClick={() => setTransactionType('expense')} className={`flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${transactionType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ArrowDownRight size={16}/> Expense</button><button onClick={() => setTransactionType('income')} className={`flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${transactionType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ArrowUpRight size={16}/> Income</button></div>
        </div>
        <div className="flex justify-between items-start">
          <div><p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-wider">{transactionType === 'income' ? "Today's Income" : "Today's Spend"}</p><h2 className={`text-4xl font-black tracking-tight ${transactionType === 'income' ? 'text-emerald-600' : 'text-emerald-950'}`}><span className="text-2xl opacity-60 mr-1">$</span>{totals[transactionType][viewCurrency].today.toFixed(2)}</h2></div>
          <div className="text-right"><p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-wider">This Month</p><div className="text-xl font-bold text-slate-800">${totals[transactionType][viewCurrency].month.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="bg-white border border-emerald-100 p-6 rounded-[28px] shadow-sm space-y-6">
        <div className="flex items-center gap-3"><div className={`p-2 rounded-full ${transactionType === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}><Wallet size={18} /></div><h2 className="text-lg font-bold text-slate-900">Quick {transactionType === 'income' ? 'Income' : 'Expense'}</h2></div>
        <form onSubmit={handleLogSpend} className="space-y-6">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex items-center justify-center relative"><span className="absolute left-6 text-xl font-black text-emerald-400">{viewCurrency} $</span><input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-transparent text-center text-5xl font-black text-emerald-950 outline-none placeholder:text-slate-300 ml-12" /></div>
          <div className="flex gap-4">
            <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-2xl"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate (MXN/USD)</label><div className="flex items-center mt-1"><span className="text-slate-400 font-bold mr-1">$</span><input type="number" step="0.01" placeholder="e.g. 17.30" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="w-full bg-transparent font-bold text-slate-800 outline-none placeholder:text-slate-300" /></div></div>
            <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col justify-center"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Converted</label><div className="font-bold text-emerald-600 mt-1">{amount && exchangeRate && !isNaN(amount) && !isNaN(exchangeRate) ? (viewCurrency === 'MXN' ? `$${(amount / exchangeRate).toFixed(2)} USD` : `$${(amount * exchangeRate).toFixed(2)} MXN`) : "--"}</div></div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{currentCategories.map(cat => (<button key={cat.name} type="button" onClick={() => setCategory(cat.name)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all shrink-0 border-2 ${category === cat.name ? `border-emerald-500 ${cat.color} shadow-sm` : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{cat.icon} {cat.name}</button>))}</div>
          <input type="text" placeholder="What was it for? (Optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-full px-5 py-4 text-slate-800 focus:bg-slate-100 transition-colors outline-none" />
          <button type="submit" disabled={!amount} className={`w-full text-white text-lg font-bold py-4 rounded-full shadow-md flex justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${transactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-900/20'}`}><Plus className="w-6 h-6" /> Add {viewCurrency} {transactionType === 'income' ? 'Income' : 'Expense'}</button>
        </form>
        {activeLogs.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2">Today's Transactions ({viewCurrency})</h3>
            <div className="space-y-2">
              {activeLogs.map(log => {
                const catInfo = currentCategories.find(c => c.name === log.category) || currentCategories[currentCategories.length - 1];
                return (
                  <div key={log.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3"><div className={`p-2 rounded-full ${catInfo.color}`}>{catInfo.icon}</div><div><div className="font-bold text-slate-800">{log.note}</div><div className="text-xs text-slate-400 font-medium">{formatTime(log.timestamp)} {log.exchangeRate && `• Rate: $${log.exchangeRate}`}</div></div></div>
                    <div className="flex items-center gap-4"><span className={`font-black text-lg ${transactionType === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>${Number(log.amount).toFixed(2)}</span><button onClick={() => handleDeleteSpend(log.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 size={16} /></button></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} title="School Pass">
        <div className="flex flex-col items-center justify-center pb-4">
          <div className="bg-slate-50 p-6 rounded-3xl w-full flex flex-col items-center border border-slate-100"><div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 w-full flex justify-center"><img src="/school-qr.png" alt="School QR" className="w-full max-w-[250px] aspect-square object-contain" onError={(e) => { e.target.onerror = null; e.target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Missing+Image+File'; }} /></div><p className="text-sm font-bold text-slate-500 text-center uppercase tracking-widest">Ready to scan</p></div>
        </div>
      </Modal>
    </div>
  );
}
