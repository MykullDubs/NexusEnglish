import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Thermometer, Pill, Clock, Baby, PawPrint, Ruler, Weight,
  ChevronRight, Trash2, Activity, StickyNote, Calendar, UserPlus,
  X, TrendingUp, List, LogOut, LogIn, Mail, Lock, AlertCircle, RefreshCw,
  Utensils, Droplets, Bone, Coffee, Settings, ArrowUp, ArrowDown, 
  Eye, EyeOff, Download, Save, GripHorizontal, Droplet, Pencil
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, deleteDoc, updateDoc, setDoc, getDoc,
  doc, onSnapshot, query, orderBy, writeBatch
} from "firebase/firestore";
import { Reorder, useDragControls } from "framer-motion";

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

const ProfileItem = ({ child, isSelected, onClick, onEdit }) => {
  const controls = useDragControls();
  const isPet = child.type === 'pet';
  
  // Long press logic
  const timerRef = useRef(null);
  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onEdit(child);
    }, 800); // 800ms hold to edit
  };
  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <Reorder.Item 
      value={child} 
      dragListener={false} 
      dragControls={controls} 
      className="flex-shrink-0 snap-start"
    >
      <div 
        className={`flex items-center pl-4 pr-2 py-2 rounded-full transition-all border select-none ${isSelected ? `bg-white ${isPet ? 'text-amber-600' : 'text-indigo-600'} font-bold shadow-md border-transparent` : 'bg-black/10 text-white/70 border-transparent hover:bg-black/20'}`}
      >
        <button 
          onClick={onClick} 
          onContextMenu={(e) => { e.preventDefault(); onEdit(child); }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          className="flex items-center gap-2 mr-2"
        >
          {isPet ? <PawPrint size={14} /> : <Baby size={14} />}
          {child.name}
        </button>
        <div onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none pl-2 border-l border-current/20 opacity-60 hover:opacity-100 active:cursor-grabbing py-1">
          <GripHorizontal size={14} />
        </div>
      </div>
    </Reorder.Item>
  );
};

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
      { id: 'growth', visible: true, label: 'Growth' }
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Profile Form States
  const [editingChild, setEditingChild] = useState(null); // null = adding, object = editing
  const [newChildName, setNewChildName] = useState('');
  const [newProfileType, setNewProfileType] = useState('child');
  const [newHeight, setNewHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDOB, setNewDOB] = useState('');
  const [newBloodType, setNewBloodType] = useState('');
  
  const [logForm, setLogForm] = useState({ temp: '', symptoms: [], note: '', medicineName: '', dosage: '', weight: '', height: '', nutritionType: 'food', item: '', amount: '' });
  
  const commonSymptoms = ['Cough', 'Runny Nose', 'Vomiting', 'Diarrhea', 'Rash', 'Fatigue', 'Headache', 'Sore Throat', 'Lethargy', 'No Appetite'];

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
        if (docSnap.exists()) setSettings(prev => ({ ...prev, ...docSnap.data() }));
      } catch (e) { console.error("Settings fetch error", e); }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    setFetchError(null);
    const q = query(collection(db, 'users', user.uid, 'children'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        const orderA = a.order ?? 9999; 
        const orderB = b.order ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      setChildren(data);
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching children:", error);
      setFetchError(error.message);
      setDataLoading(false);
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
    if (user) { try { await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), newSettings); } catch (e) { console.error("Error saving settings", e); } }
  };

  // Prepare modal for adding new child
  const openAddProfile = () => {
    setEditingChild(null);
    setNewChildName('');
    setNewProfileType('child');
    setNewHeight('');
    setNewWeight('');
    setNewDOB('');
    setNewBloodType('');
    setIsAddChildOpen(true);
  };

  // Prepare modal for editing existing child
  const openEditProfile = (child) => {
    setEditingChild(child);
    setNewChildName(child.name || '');
    setNewProfileType(child.type || 'child');
    setNewHeight(child.height || '');
    setNewWeight(child.weight || '');
    setNewDOB(child.dob || '');
    setNewBloodType(child.bloodType || '');
    setIsAddChildOpen(true);
  };

  const handleProfileSubmit = async (e) => { 
    e.preventDefault(); 
    if(!newChildName.trim()||!user) return; 
    
    try {
      const profileData = {
        name: newChildName, 
        type: newProfileType, 
        height: newHeight, 
        weight: newWeight, 
        dob: newDOB, 
        bloodType: newBloodType
      };

      if (editingChild) {
        // Update existing
        await updateDoc(doc(db, 'users', user.uid, 'children', editingChild.id), profileData);
      } else {
        // Create new
        const order = children.length; 
        const docRef = await addDoc(collection(db,'users',user.uid,'children'), {
          ...profileData,
          order, 
          createdAt: new Date().toISOString()
        });
        // Log initial stats
        if(newWeight||newHeight) await addDoc(collection(db,'users',user.uid,'logs'),{
          childId:docRef.id, type:'measurement', timestamp:new Date().toISOString(), height:newHeight, weight:newWeight, note:'Initial Profile'
        });
      }
      setIsAddChildOpen(false); 
    } catch(err){alert("Save Failed: "+err.message);} 
  };

  const handleDeleteProfile = async () => {
    if (!editingChild || !user) return;
    if (window.confirm(`Are you sure you want to delete ${editingChild.name}? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'children', editingChild.id));
        setIsAddChildOpen(false);
      } catch (err) {
        alert("Error deleting profile: " + err.message);
      }
    }
  };

  const toggleWidgetVisibility = (id) => { const newOrder = settings.dashboardOrder.map(w => w.id === id ? { ...w, visible: !w.visible } : w); handleSaveSettings({ ...settings, dashboardOrder: newOrder }); };
  const moveWidget = (index, direction) => { const newOrder = [...settings.dashboardOrder]; const item = newOrder[index]; newOrder.splice(index, 1); if (direction === 'up') newOrder.splice(Math.max(0, index - 1), 0, item); else newOrder.splice(Math.min(newOrder.length, index + 1), 0, item); handleSaveSettings({ ...settings, dashboardOrder: newOrder }); };
  const handleExportData = () => { const dataStr = JSON.stringify({ children, logs, settings }, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `family-health-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  const handleGoogleLogin = async () => { const provider = new GoogleAuthProvider(); try { await signInWithPopup(auth, provider); } catch (error) { setAuthError("Google sign in failed."); } };
  const handleEmailAuth = async (e) => { e.preventDefault(); setAuthError(''); if (!email || !password) return; try { if (isSignUp) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError("Authentication failed. Check email/password."); } };
  const handleLogout = async () => { await signOut(auth); setChildren([]); setLogs([]); setSelectedChild(null); setEmail(''); setPassword(''); };
  
  const handleAddSymptom = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'symptom', timestamp: new Date().toISOString(), temperature: logForm.temp, symptoms: logForm.symptoms, note: logForm.note }); setLogForm({...logForm, temp: '', symptoms: [], note: ''}); setIsSymptomOpen(false); };
  const handleAddMedicine = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'medicine', timestamp: new Date().toISOString(), medicineName: logForm.medicineName, dosage: logForm.dosage, note: logForm.note }); setLogForm({...logForm, medicineName: '', dosage: '', note: ''}); setIsMedicineOpen(false); };
  const handleAddStats = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'measurement', timestamp: new Date().toISOString(), weight: logForm.weight, height: logForm.height, note: logForm.note }); const updates = {}; if(logForm.weight) updates.weight = logForm.weight; if(logForm.height) updates.height = logForm.height; if(Object.keys(updates).length>0) await updateDoc(doc(db, 'users', user.uid, 'children', selectedChild.id), updates); setLogForm({...logForm, weight: '', height: '', note: ''}); setIsStatsOpen(false); };
  const handleAddNutrition = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'nutrition', timestamp: new Date().toISOString(), nutritionType: logForm.nutritionType, item: logForm.item, amount: logForm.amount, note: logForm.note }); setLogForm({...logForm, item: '', amount: '', note: '', nutritionType: 'food'}); setIsNutritionOpen(false); };
  const deleteLog = async (id) => { if(window.confirm("Delete?")) await deleteDoc(doc(db, 'users', user.uid, 'logs', id)); };
  const toggleSymptom = (s) => { if(logForm.symptoms.includes(s)) setLogForm({...logForm, symptoms: logForm.symptoms.filter(x=>x!==s)}); else setLogForm({...logForm, symptoms: [...logForm.symptoms, s]}); };

  const isPet = selectedChild?.type === 'pet';
  const themeBg = isPet ? 'bg-amber-600' : 'bg-indigo-600';
  const currentChildLogs = logs.filter(l => l.childId === selectedChild?.id);
  const temperatureData = useMemo(() => currentChildLogs.filter(l => l.type === 'symptom' && l.temperature).map(l => ({ date: l.timestamp, value: l.temperature })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const weightData = useMemo(() => currentChildLogs.filter(l => l.type === 'measurement' && l.weight).map(l => ({ date: l.timestamp, value: l.weight })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const getAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }
    return years > 0 ? `${years}y ${months}m` : `${months}m`;
  };

  // --- Views ---
  if (authLoading || (user && dataLoading)) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4"><Activity className="animate-spin text-indigo-600" size={40} /><p className="text-slate-400 font-medium">Loading...</p></div>;
  if (!user) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center"><div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={32} className="text-indigo-600" /></div><h1 className="text-2xl font-bold text-slate-800 mb-2">Family Health Status</h1><Button onClick={handleGoogleLogin} variant="google" className="mb-6 py-3 border-slate-200 border shadow-sm"><LogIn size={20} /> Sign in with Google</Button><form onSubmit={handleEmailAuth} className="space-y-4 text-left">{authError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{authError}</div>}<div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18} /><input type="email" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Password</label><div className="relative"><Lock className="absolute left-3 top-3 text-slate-400" size={18} /><input type="password" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div><Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white">{isSignUp ? "Create Account" : "Log In"}</Button></form><button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-indigo-600 text-sm font-medium hover:text-indigo-800">{isSignUp ? "Log In" : "Sign Up"}</button></div></div>;
  if (fetchError) return <div className="p-6 text-center"><h1 className="text-red-600 font-bold">Error</h1><p>{fetchError}</p><Button onClick={() => window.location.reload()}>Retry</Button></div>;

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome!</h1>
          <p className="text-slate-500 mb-8">Create a profile to get started.</p>
          <Button onClick={openAddProfile} className="w-full">Create First Profile</Button>
          <button onClick={handleLogout} className="mt-6 text-slate-400 text-sm">Sign Out</button>
        </div>
        <Modal isOpen={isAddChildOpen} onClose={() => setIsAddChildOpen(false)} title="Add Profile">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4 mb-4"><button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'child' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200'}`}><Baby size={24} />Child</button><button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-xl border flex flex-col items-center ${newProfileType === 'pet' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200'}`}><PawPrint size={24} />Pet</button></div>
             <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" />
             <Button type="submit" className="w-full" disabled={!newChildName.trim()}>Save Profile</Button>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-0">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className={`${themeBg} p-6 pb-8 text-white rounded-b-[2.5rem] shadow-lg z-10 transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-lg font-bold flex items-center gap-2 opacity-90"><Activity size={20} /> Family Health</h1>
            <div className="flex gap-2">
              <button onClick={openAddProfile} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><UserPlus size={18} /></button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Settings size={18} /></button>
            </div>
          </div>
          
          <Reorder.Group axis="x" values={children} onReorder={handleReorder} className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {children.map(child => (
              <ProfileItem 
                key={child.id} 
                child={child} 
                isSelected={selectedChild?.id === child.id} 
                onClick={() => setSelectedChild(child)} 
                onEdit={openEditProfile} 
              />
            ))}
          </Reorder.Group>

          {selectedChild && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
              {(selectedChild.height || selectedChild.weight) && (
                <div className="flex items-center gap-3 bg-black/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                  {selectedChild.height && <div className="flex items-center gap-1"><Ruler size={14} /><span>{selectedChild.height} {settings.heightUnit}</span></div>}
                  {selectedChild.weight && <div className="flex items-center gap-1"><Weight size={14} /><span>{selectedChild.weight} {settings.weightUnit}</span></div>}
                </div>
              )}
              {(selectedChild.dob || selectedChild.bloodType) && (
                <div className="flex items-center gap-3 bg-black/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                  {selectedChild.dob && <div className="flex items-center gap-1"><Calendar size={14} /><span>{getAge(selectedChild.dob)}</span></div>}
                  {selectedChild.bloodType && <div className="flex items-center gap-1"><Droplet size={14} /><span>{selectedChild.bloodType}</span></div>}
                </div>
              )}
              <button onClick={() => openEditProfile(selectedChild)} className="p-1.5 bg-black/10 hover:bg-black/20 rounded-lg transition-colors ml-auto">
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Customizable Grid */}
        <div className="px-6 -mt-8 z-20 grid grid-cols-2 gap-3">
          {settings.dashboardOrder.filter(w => w.visible).map((widget) => {
            const style = "bg-white p-4 rounded-2xl shadow-lg shadow-slate-200 border border-slate-50 flex items-center justify-center gap-3 hover:-translate-y-1 transition-transform";
            if (widget.id === 'symptom') return <button key={widget.id} onClick={() => setIsSymptomOpen(true)} className={style}><div className="p-2 bg-red-50 text-red-500 rounded-full"><Thermometer size={20} /></div><span className="text-sm font-bold text-slate-600">Symptom</span></button>;
            if (widget.id === 'medicine') return <button key={widget.id} onClick={() => setIsMedicineOpen(true)} className={style}><div className="p-2 bg-blue-50 text-blue-500 rounded-full"><Pill size={20} /></div><span className="text-sm font-bold text-slate-600">Meds</span></button>;
            if (widget.id === 'nutrition') return <button key={widget.id} onClick={() => setIsNutritionOpen(true)} className={style}><div className="p-2 bg-orange-50 text-orange-500 rounded-full">{isPet ? <Bone size={20} /> : <Utensils size={20} />}</div><span className="text-sm font-bold text-slate-600">Nutrition</span></button>;
            if (widget.id === 'growth') return <button key={widget.id} onClick={() => setIsStatsOpen(true)} className={style}><div className="p-2 bg-emerald-50 text-emerald-500 rounded-full"><Weight size={20} /></div><span className="text-sm font-bold text-slate-600">Growth</span></button>;
            return null;
          })}
        </div>

        {/* View Toggles & Charts / Timeline */}
        <div className="px-6 mt-6 mb-2">
           <div className="bg-slate-100 p-1 rounded-xl flex">
             <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><List size={16} /> Timeline</button>
             <button onClick={() => setViewMode('trends')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'trends' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><TrendingUp size={16} /> Trends</button>
           </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          {viewMode === 'timeline' ? (
            <div className="space-y-4">
              {currentChildLogs.length === 0 && <div className="text-center py-10 opacity-40"><StickyNote size={40} className="mx-auto mb-2 text-slate-300" /><p className="text-sm">No logs yet for {selectedChild?.name}</p></div>}
              {currentChildLogs.map((log) => (
                <div key={log.id} className="relative pl-4 border-l-2 border-slate-200/60 pb-1">
                  <div className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full border-2 border-slate-50 shadow-sm ${log.type === 'medicine' ? 'bg-blue-500' : log.type === 'measurement' ? 'bg-emerald-500' : log.type === 'nutrition' ? 'bg-orange-500' : 'bg-red-500'}`} />
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{log.type} &bull; {formatDate(log.timestamp)} {formatTime(log.timestamp)}</span><button onClick={() => deleteLog(log.id)} className="text-slate-300 hover:text-red-400"><Trash2 size={14} /></button></div>
                    {log.type === 'symptom' && <div className="flex items-start gap-3">{log.temperature && <div className="text-2xl font-bold text-slate-700">{log.temperature}°{settings.tempUnit}</div>}<div className="flex flex-wrap gap-1">{log.symptoms?.map(s => <span key={s} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-md font-medium">{s}</span>)}</div></div>}
                    {log.type === 'medicine' && <div><div className="font-bold text-slate-700 text-lg">{log.medicineName}</div><div className="text-slate-500 text-sm">{log.dosage}</div></div>}
                    {log.type === 'nutrition' && <div className="flex items-center gap-3"><div className="p-2 bg-orange-50 text-orange-600 rounded-full">{log.nutritionType === 'liquid' || log.nutritionType === 'water' ? <Droplets size={20} /> : isPet ? <Bone size={20} /> : <Utensils size={20} />}</div><div><div className="font-bold text-slate-700">{log.item || (log.nutritionType === 'water' ? 'Water Refill' : 'Meal')}</div>{log.amount && <div className="text-slate-500 text-sm">{log.amount}</div>}</div></div>}
                    {log.type === 'measurement' && <div className="flex gap-4">{log.weight && <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">Weight: {log.weight} {settings.weightUnit}</div>}{log.height && <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">Height: {log.height} {settings.heightUnit}</div>}</div>}
                    {log.note && <div className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-2 rounded-lg">"{log.note}"</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <SimpleLineChart data={weightData} title={`Weight History (${settings.weightUnit})`} unit={settings.weightUnit} colorHex="#059669" />
              <SimpleLineChart data={temperatureData} title={`Temp History (°${settings.tempUnit})`} unit={`°${settings.tempUnit}`} colorHex="#dc2626" />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App Settings">
        <div className="space-y-8">
          <div><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Units</h4><div className="bg-slate-50 p-4 rounded-2xl space-y-4"><div className="flex justify-between items-center"><span className="font-medium text-slate-700">Temperature</span><div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm"><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'C' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.tempUnit === 'C' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>°C</button><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'F' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.tempUnit === 'F' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>°F</button></div></div><div className="flex justify-between items-center"><span className="font-medium text-slate-700">Weight</span><div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm"><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'kg' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.weightUnit === 'kg' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>kg</button><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'lbs' })} className={`px-4 py-1 rounded-md text-sm transition-all ${settings.weightUnit === 'lbs' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>lbs</button></div></div></div></div>
          <div><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Dashboard Widgets</h4><div className="bg-slate-50 p-2 rounded-2xl space-y-2">{settings.dashboardOrder.map((widget, idx) => (<div key={widget.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><button onClick={() => toggleWidgetVisibility(widget.id)} className={`p-2 rounded-lg transition-colors ${widget.visible ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{widget.visible ? <Eye size={18} /> : <EyeOff size={18} />}</button><span className={`font-medium ${widget.visible ? 'text-slate-700' : 'text-slate-400'}`}>{widget.label}</span></div><div className="flex gap-1"><button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={18} /></button><button disabled={idx === settings.dashboardOrder.length - 1} onClick={() => moveWidget(idx, 'down')} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={18} /></button></div></div>))}</div></div>
          <div><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Data & Account</h4><Button variant="outline" onClick={handleExportData} className="w-full mb-3 justify-start"><Download size={18} /> Export Data (JSON)</Button><Button variant="danger" onClick={handleLogout} className="w-full justify-start"><LogOut size={18} /> Sign Out</Button></div>
        </div>
      </Modal>

      {/* Add/Edit Profile Modal */}
      <Modal isOpen={isAddChildOpen} onClose={() => setIsAddChildOpen(false)} title={editingChild ? "Edit Profile" : "Add Profile"}>
         <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${newProfileType === 'child' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200'}`}><Baby size={24} />Child</button><button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${newProfileType === 'pet' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200'}`}><PawPrint size={24} />Pet</button></div>
            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" />
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Height ({settings.heightUnit})</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Weight ({settings.weightUnit})</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 20" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Birthday</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={newDOB} onChange={(e) => setNewDOB(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Blood Type</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={newBloodType} onChange={(e) => setNewBloodType(e.target.value)} placeholder="e.g. O+" /></div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="w-full" disabled={!newChildName.trim()}>Save Profile</Button>
              {editingChild && <Button type="button" variant="danger" className="w-auto px-3" onClick={handleDeleteProfile}><Trash2 size={20} /></Button>}
            </div>
         </form>
      </Modal>

      {/* Other Modals (Stats, Symptom, Medicine, Nutrition - same as previous) */}
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title="Log Growth"><form onSubmit={handleAddStats} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700">Weight ({settings.weightUnit})</label><input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={logForm.weight} onChange={(e) => setLogForm({...logForm, weight: e.target.value})} placeholder={`e.g. 20.5 ${settings.weightUnit}`} /></div><div><label className="block text-sm font-medium text-slate-700">Height ({settings.heightUnit})</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" value={logForm.height} onChange={(e) => setLogForm({...logForm, height: e.target.value})} placeholder={`e.g. 110 ${settings.heightUnit}`} /></div><Button type="submit" className="w-full">Save</Button></form></Modal>
      <Modal isOpen={isSymptomOpen} onClose={() => setIsSymptomOpen(false)} title="Log Symptoms"><form onSubmit={handleAddSymptom} className="space-y-6"><div><label className="block text-sm font-medium text-slate-700 mb-2">Temperature (°{settings.tempUnit})</label><div className="flex gap-2"><input type="number" step="0.1" className="flex-1 p-4 text-2xl font-bold text-center bg-slate-50 border border-slate-200 rounded-xl" value={logForm.temp} onChange={(e) => setLogForm({ ...logForm, temp: e.target.value })} /><div className="flex items-center justify-center bg-slate-100 w-16 rounded-xl font-bold">°{settings.tempUnit}</div></div></div><div className="flex flex-wrap gap-2">{commonSymptoms.map(sym => (<button key={sym} type="button" onClick={() => toggleSymptom(sym)} className={`px-3 py-2 rounded-lg text-sm border ${logForm.symptoms.includes(sym) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200'}`}>{sym}</button>))}</div><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full">Save</Button></form></Modal>
      <Modal isOpen={isMedicineOpen} onClose={() => setIsMedicineOpen(false)} title="Log Medicine"><form onSubmit={handleAddMedicine} className="space-y-4"><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Medicine Name" value={logForm.medicineName} onChange={(e) => setLogForm({ ...logForm, medicineName: e.target.value })} /><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Dosage" value={logForm.dosage} onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })} /><Button type="submit" className="w-full">Log Medicine</Button></form></Modal>
      <Modal isOpen={isNutritionOpen} onClose={() => setIsNutritionOpen(false)} title="Log Nutrition"><form onSubmit={handleAddNutrition} className="space-y-4"><div className="flex gap-4 mb-2"><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'food'})} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${logForm.nutritionType === 'food' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200'}`}>{isPet ? <Bone /> : <Utensils />} Food</button><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'liquid'})} className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 ${logForm.nutritionType === 'liquid' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}><Droplets /> Drink</button></div><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Item / Type" value={logForm.item} onChange={(e) => setLogForm({...logForm, item: e.target.value})} /><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Amount" value={logForm.amount} onChange={(e) => setLogForm({...logForm, amount: e.target.value})} /><Button type="submit" className="w-full bg-orange-600 shadow-orange-200 hover:bg-orange-700">Log</Button></form></Modal>

    </div>
  );
}
