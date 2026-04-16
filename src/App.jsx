import React, { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, Pill, Baby, PawPrint, Ruler, Weight,
  Trash2, Activity, StickyNote, Calendar, UserPlus,
  TrendingUp, List, LogOut, LogIn, Mail, Lock, Unlock, AlertCircle, 
  Utensils, Droplets, Bone, Settings, ArrowUp, ArrowDown, 
  Eye, EyeOff, Download, Stethoscope, Check, User, Home, Wallet, ChefHat,
  Pencil, Droplet, Repeat, Bell, Briefcase
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, deleteDoc, updateDoc, setDoc, getDoc, doc, onSnapshot, query, orderBy, writeBatch } from "firebase/firestore";
import { Reorder, motion, useAnimation, AnimatePresence } from "framer-motion";

// IMPORT OUR NEW SEPARATED COMPONENTS
import { auth, db } from "./firebase";
import { Button, RollerInput, Modal, SimpleLineChart } from "./components/SharedUI";
import MealPlanner from "./components/MealPlanner";
import FinanceTracker from "./components/FinanceTracker";
import DadBodTracker, { DadBodBanner } from "./components/DadBodTracker";
import JobCRM from "./components/JobCRM";

// --- Helpers ---
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob); const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear(); let months = today.getMonth() - birthDate.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) { years--; months += 12; }
  if (years === 0) return `${months}m`; return `${years}y`;
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null); const [children, setChildren] = useState([]); const [logs, setLogs] = useState([]); const [selectedChild, setSelectedChild] = useState(null);
  
  const [settings, setSettings] = useState({
    tempUnit: 'C', weightUnit: 'kg', heightUnit: 'cm', 
    dashboardOrder: [
      { id: 'symptom', visible: true, label: 'Symptom' },
      { id: 'medicine', visible: true, label: 'Medicine' },
      { id: 'nutrition', visible: true, label: 'Nutrition' },
      { id: 'growth', visible: true, label: 'Growth' },
      { id: 'doctor', visible: true, label: 'Doctor Visit' }
    ],
    tabOrder: ['family', 'dadbod', 'finance', 'meals', 'jobs']
  });
  
  const [authLoading, setAuthLoading] = useState(true); const [dataLoading, setDataLoading] = useState(true); const [fetchError, setFetchError] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); const [isAddChildOpen, setIsAddChildOpen] = useState(false); const [isSymptomOpen, setIsSymptomOpen] = useState(false); const [isMedicineOpen, setIsMedicineOpen] = useState(false); const [isStatsOpen, setIsStatsOpen] = useState(false); const [isNutritionOpen, setIsNutritionOpen] = useState(false); const [isDoctorOpen, setIsDoctorOpen] = useState(false); const [isSettingsOpen, setIsSettingsOpen] = useState(false); const [isReorderLocked, setIsReorderLocked] = useState(true);
  const [activeTab, setActiveTab] = useState(null); const controls = useAnimation();
  
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isSignUp, setIsSignUp] = useState(false); const [authError, setAuthError] = useState('');
  const [newChildName, setNewChildName] = useState(''); const [newProfileType, setNewProfileType] = useState('child'); const [newHeight, setNewHeight] = useState(''); const [newWeight, setNewWeight] = useState(''); const [newDob, setNewDob] = useState(''); const [newBloodType, setNewBloodType] = useState(''); const [editingId, setEditingId] = useState(null);
  const [logForm, setLogForm] = useState({ temp: '', symptoms: [], note: '', medicineName: '', dosage: '', weight: '', height: '', nutritionType: 'food', item: '', amount: '', doctorName: '', visitReason: '', prescriptions: '', reminderHours: 0, hasReminder: false, isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5 });

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', text: '', action: null });

  const showToast = (message, type = 'success') => { setToast({ visible: true, message, type }); setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000); };
  const askConfirm = (title, text, action) => { setConfirmModal({ visible: true, title, text, action }); };

  const commonSymptoms = ['Cough', 'Runny Nose', 'Vomiting', 'Diarrhea', 'Rash', 'Fatigue', 'Headache', 'Sore Throat', 'Lethargy', 'No Appetite']; const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

  const handleDragEnd = (event, info) => { const tabs = settings.tabOrder || ['family', 'dadbod', 'finance', 'meals', 'jobs']; const currentIndex = tabs.indexOf(activeTab); if (info.offset.x > 80 && currentIndex > 0) { setActiveTab(tabs[currentIndex - 1]); } else if (info.offset.x < -80 && currentIndex < tabs.length - 1) { setActiveTab(tabs[currentIndex + 1]); } controls.start({ x: 0 }); };

  useEffect(() => { if ("Notification" in window && Notification.permission !== 'granted') Notification.requestPermission(); }, []);

  const scheduleBatchNotifications = (medicineName, frequencyHours, days) => { if (!("Notification" in window)) return; if (Notification.permission === "granted") { const totalDoses = (days * 24) / frequencyHours; for (let i = 1; i <= totalDoses; i++) { const ms = frequencyHours * i * 60 * 60 * 1000; if (frequencyHours * i <= 24) setTimeout(() => new Notification("Medicine Reminder", { body: `Time for dose #${i} of ${medicineName}`, icon: '/pwa-512x512.png' }), ms); } showToast(`Reminders set for every ${frequencyHours} hours.`, "success"); } else { Notification.requestPermission().then(p => { if (p === "granted") scheduleBatchNotifications(medicineName, frequencyHours, days); }); } };

  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); if (!u) { setDataLoading(false); setFetchError(null); setActiveTab(null); } }); return () => unsubscribe(); }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'config'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => {
            const merged = { ...prev, ...data };
            const defaults = [{ id: 'symptom', visible: true, label: 'Symptom' }, { id: 'medicine', visible: true, label: 'Medicine' }, { id: 'nutrition', visible: true, label: 'Nutrition' }, { id: 'growth', visible: true, label: 'Growth' }, { id: 'doctor', visible: true, label: 'Doctor Visit' }];
            const finalOrder = merged.dashboardOrder || []; defaults.forEach(def => { if (!finalOrder.find(item => item.id === def.id)) finalOrder.push(def); }); merged.dashboardOrder = finalOrder;
            let finalTabOrder = merged.tabOrder || ['family', 'dadbod', 'finance', 'meals', 'jobs']; const defaultTabs = ['family', 'dadbod', 'finance', 'meals', 'jobs']; finalTabOrder = finalTabOrder.filter(t => defaultTabs.includes(t)); defaultTabs.forEach(t => { if (!finalTabOrder.includes(t)) finalTabOrder.push(t); }); merged.tabOrder = finalTabOrder;
            return merged;
          });
          let initialTabOrder = data.tabOrder || ['family', 'dadbod', 'finance', 'meals', 'jobs']; setActiveTab(prev => prev ? prev : initialTabOrder[0]);
        } else { setActiveTab(prev => prev ? prev : 'family'); }
      } catch (e) { console.error("Settings fetch error", e); setActiveTab(prev => prev ? prev : 'family'); }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (!user) return; setDataLoading(true); setFetchError(null);
    const unsubscribe = onSnapshot(query(collection(db, 'users', user.uid, 'children'), orderBy('order', 'asc')), (snapshot) => { setChildren(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setDataLoading(false); }, (error) => { if (error.message.includes("requires an index")) { onSnapshot(query(collection(db, 'users', user.uid, 'children')), (snap) => { const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); d.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || '')); setChildren(d); setDataLoading(false); }); } else { setFetchError(error.message); setDataLoading(false); } });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => { if (children.length > 0 && !selectedChild) setSelectedChild(children[0]); else if (selectedChild && !children.find(c => c.id === selectedChild.id)) setSelectedChild(children.length > 0 ? children[0] : null); }, [children, selectedChild]);

  useEffect(() => { if (!user) return; const unsubscribe = onSnapshot(query(collection(db, 'users', user.uid, 'logs')), (snapshot) => { const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setLogs(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))); }, (error) => console.error("Error fetching logs:", error)); return () => unsubscribe(); }, [user]);

  const handleReorder = async (newOrder) => { setChildren(newOrder); if (!user) return; try { const batch = writeBatch(db); newOrder.forEach((child, index) => batch.update(doc(db, 'users', user.uid, 'children', child.id), { order: index })); await batch.commit(); } catch (e) { console.error("Reorder failed", e); } };
  const handleSaveSettings = async (newSettings) => { setSettings(newSettings); if (user) try { await setDoc(doc(db, 'users', user.uid, 'settings', 'config'), newSettings); showToast("Settings saved", "success"); } catch (e) { console.error("Error saving settings", e); } };

  const handleSaveProfile = async (e) => { e.preventDefault(); if (!newChildName.trim() || !user) return; try { const profileData = { name: newChildName, type: newProfileType, height: newHeight, weight: newWeight, dob: newDob, bloodType: newBloodType }; if (editingId) { await updateDoc(doc(db, 'users', user.uid, 'children', editingId), profileData); showToast("Profile updated!", "success"); } else { const docRef = await addDoc(collection(db, 'users', user.uid, 'children'), { ...profileData, order: children.length, createdAt: new Date().toISOString() }); if (newWeight || newHeight) { await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: docRef.id, type: 'measurement', timestamp: new Date().toISOString(), height: newHeight, weight: newWeight, note: 'Initial Profile Creation' }); } showToast("Profile created!", "success"); } closeProfileModal(); } catch (err) { showToast("Save Failed: " + err.message, "error"); } };
  const openAddProfile = () => { setEditingId(null); setNewChildName(''); setNewProfileType('child'); setNewHeight(''); setNewWeight(''); setNewDob(''); setNewBloodType(''); setIsAddChildOpen(true); };
  const openEditProfile = (child) => { setEditingId(child.id); setNewChildName(child.name); setNewProfileType(child.type); setNewHeight(child.height || ''); setNewWeight(child.weight || ''); setNewDob(child.dob || ''); setNewBloodType(child.bloodType || ''); setIsAddChildOpen(true); };
  const closeProfileModal = () => { setIsAddChildOpen(false); setEditingId(null); };

  const toggleWidgetVisibility = (id) => { const newOrder = settings.dashboardOrder.map(w => w.id === id ? { ...w, visible: !w.visible } : w); handleSaveSettings({ ...settings, dashboardOrder: newOrder }); };
  const moveWidget = (index, direction) => { const newOrder = [...settings.dashboardOrder]; const item = newOrder[index]; newOrder.splice(index, 1); if (direction === 'up') newOrder.splice(Math.max(0, index - 1), 0, item); else newOrder.splice(Math.min(newOrder.length, index + 1), 0, item); handleSaveSettings({ ...settings, dashboardOrder: newOrder }); };
  const moveTab = (index, direction) => { const newOrder = [...settings.tabOrder]; const item = newOrder[index]; newOrder.splice(index, 1); if (direction === 'up') newOrder.splice(Math.max(0, index - 1), 0, item); else newOrder.splice(Math.min(newOrder.length, index + 1), 0, item); handleSaveSettings({ ...settings, tabOrder: newOrder }); };

  const handleExportData = () => { const dataStr = JSON.stringify({ children, logs, settings }, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `health-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { setAuthError("Google sign in failed."); } };
  const handleEmailAuth = async (e) => { e.preventDefault(); setAuthError(''); if (!email || !password) return; try { if (isSignUp) await createUserWithEmailAndPassword(auth, email, password); else await signInWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError("Authentication failed."); } };
  const handleLogout = async () => { await signOut(auth); setChildren([]); setLogs([]); setSelectedChild(null); setEmail(''); setPassword(''); setActiveTab(null); };
  
  const handleAddSymptom = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'symptom', timestamp: new Date().toISOString(), temperature: logForm.temp, symptoms: logForm.symptoms, note: logForm.note }); setLogForm({...logForm, temp: '', symptoms: [], note: ''}); setIsSymptomOpen(false); showToast("Symptom logged!", "success"); };
  const handleAddMedicine = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'medicine', timestamp: new Date().toISOString(), medicineName: logForm.medicineName, dosage: logForm.dosage, note: logForm.note, isRecurring: logForm.isRecurring, scheduleFrequency: logForm.isRecurring ? logForm.scheduleFrequency : 0, scheduleDuration: logForm.isRecurring ? logForm.scheduleDuration : 0 }); if (logForm.isRecurring && logForm.scheduleFrequency > 0 && logForm.scheduleDuration > 0) scheduleBatchNotifications(logForm.medicineName, logForm.scheduleFrequency, logForm.scheduleDuration); setLogForm({...logForm, medicineName: '', dosage: '', note: '', isRecurring: false, scheduleFrequency: 8, scheduleDuration: 5}); setIsMedicineOpen(false); showToast("Medicine logged!", "success"); };
  const handleAddStats = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'measurement', timestamp: new Date().toISOString(), weight: logForm.weight, height: logForm.height, note: logForm.note }); const updates = {}; if(logForm.weight) updates.weight = logForm.weight; if(logForm.height) updates.height = logForm.height; if(Object.keys(updates).length>0) await updateDoc(doc(db, 'users', user.uid, 'children', selectedChild.id), updates); setLogForm({...logForm, weight: '', height: '', note: ''}); setIsStatsOpen(false); showToast("Growth logged!", "success"); };
  const handleAddNutrition = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'nutrition', timestamp: new Date().toISOString(), nutritionType: logForm.nutritionType, item: logForm.item, amount: logForm.amount, note: logForm.note }); setLogForm({...logForm, item: '', amount: '', note: '', nutritionType: 'food'}); setIsNutritionOpen(false); showToast("Nutrition logged!", "success"); };
  const handleAddDoctorVisit = async (e) => { e.preventDefault(); if(!user) return; await addDoc(collection(db, 'users', user.uid, 'logs'), { childId: selectedChild.id, type: 'doctor_visit', timestamp: new Date().toISOString(), doctorName: logForm.doctorName, visitReason: logForm.visitReason, prescriptions: logForm.prescriptions, note: logForm.note }); setLogForm({...logForm, doctorName: '', visitReason: '', prescriptions: '', note: ''}); setIsDoctorOpen(false); showToast("Visit recorded!", "success"); };
  
  const deleteLog = (id) => { askConfirm("Delete Log", "Are you sure you want to remove this log entry?", async () => { await deleteDoc(doc(db, 'users', user.uid, 'logs', id)); showToast("Log entry deleted", "success"); }); };
  const toggleSymptom = (s) => { if(logForm.symptoms.includes(s)) setLogForm({...logForm, symptoms: logForm.symptoms.filter(x=>x!==s)}); else setLogForm({...logForm, symptoms: [...logForm.symptoms, s]}); };

  const isPet = selectedChild?.type === 'pet'; const isAdult = selectedChild?.type === 'adult';
  
  let themeBg = 'bg-indigo-600'; 
  if (activeTab === 'family') { if (isPet) themeBg = 'bg-amber-600'; if (isAdult) themeBg = 'bg-emerald-600'; } 
  else if (activeTab === 'dadbod') { themeBg = 'bg-slate-900'; } 
  else if (activeTab === 'finance') { themeBg = 'bg-emerald-600'; } 
  else if (activeTab === 'meals') { themeBg = 'bg-orange-500'; }
  else if (activeTab === 'jobs') { themeBg = 'bg-indigo-600'; }

  const appBg = activeTab === 'dadbod' ? 'bg-slate-950' : 'bg-slate-100';
  const currentChildLogs = logs.filter(l => l.childId === selectedChild?.id);
  const temperatureData = useMemo(() => currentChildLogs.filter(l => l.type === 'symptom' && l.temperature).map(l => ({ date: l.timestamp, value: l.temperature })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const weightData = useMemo(() => currentChildLogs.filter(l => l.type === 'measurement' && l.weight).map(l => ({ date: l.timestamp, value: l.weight })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (authLoading || (user && dataLoading) || (user && !activeTab)) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4"><Activity className="animate-spin text-indigo-600" size={40} /><p className="text-slate-500 font-medium">Loading...</p></div>;
  if (!user) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6"><div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-sm text-center"><div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={40} className="text-indigo-600" /></div><h1 className="text-2xl font-black text-slate-900 mb-8">Life OS</h1><Button onClick={handleGoogleLogin} variant="google" className="mb-6"><LogIn size={20} /> Sign in with Google</Button><form onSubmit={handleEmailAuth} className="space-y-4 text-left">{authError && <div className="p-3 bg-red-100 text-red-900 text-sm rounded-2xl text-center font-medium">{authError}</div>}<div><label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Email</label><div className="relative"><Mail className="absolute left-4 top-4 text-slate-400" size={20} /><input type="email" className="w-full pl-12 p-4 bg-slate-100 rounded-full outline-none focus:bg-slate-200 transition-colors" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div><div><label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Password</label><div className="relative"><Lock className="absolute left-4 top-4 text-slate-400" size={20} /><input type="password" className="w-full pl-12 p-4 bg-slate-100 rounded-full outline-none focus:bg-slate-200 transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div><Button type="submit" className="w-full mt-2">{isSignUp ? "Create Account" : "Log In"}</Button></form><button onClick={() => setIsSignUp(!isSignUp)} className="mt-8 text-indigo-600 text-sm font-bold hover:text-indigo-800">{isSignUp ? "Log In Instead" : "Create an Account"}</button></div></div>;
  if (fetchError) return <div className="p-6 text-center"><h1 className="text-red-600 font-bold">Error</h1><p>{fetchError}</p><Button onClick={() => window.location.reload()}>Retry</Button></div>;
  if (children.length === 0 && activeTab === 'family') return (<div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6"><div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-sm text-center"><div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><UserPlus size={40} className="text-indigo-600"/></div><h1 className="text-2xl font-black text-slate-900 mb-2">Welcome!</h1><p className="text-slate-500 mb-8 font-medium">Create a profile to get started.</p><Button onClick={openAddProfile} className="w-full">Create First Profile</Button><button onClick={handleLogout} className="mt-8 text-slate-400 font-bold text-sm">Sign Out</button></div></div>);

  return (
    <div className={`min-h-screen font-sans pb-24 selection:bg-indigo-500 selection:text-white transition-colors duration-500 ${appBg}`}>
      <AnimatePresence>
        {toast.visible && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-[100] text-sm font-bold text-white whitespace-nowrap ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={confirmModal.visible} onClose={() => setConfirmModal({ ...confirmModal, visible: false })} title={confirmModal.title}>
        <p className="text-slate-600 font-medium mb-6">{confirmModal.text}</p>
        <div className="flex gap-3"><Button variant="outline" className="flex-1 !border-slate-200" onClick={() => setConfirmModal({ ...confirmModal, visible: false })}>Cancel</Button><Button variant="danger" className="flex-1" onClick={() => { confirmModal.action(); setConfirmModal({ ...confirmModal, visible: false }); }}>Delete</Button></div>
      </Modal>

      <div className={`max-w-md mx-auto min-h-screen overflow-hidden flex flex-col relative transition-colors duration-500 ${appBg}`}>        
        <div className={`${themeBg} p-6 pb-10 text-white rounded-b-[40px] shadow-sm z-10 transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-6">
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd} animate={controls} className="cursor-grab active:cursor-grabbing inline-block select-none touch-pan-y">
              <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
                {activeTab === 'dadbod' && "Dad-bod Mode"}
                {activeTab === 'finance' && "Wallet"}
                {activeTab === 'meals' && "Meal Planner"}
                {activeTab === 'jobs' && "Job Pipeline"}
                {activeTab === 'family' && <><Activity size={24} /> Family Health</>}
              </h1>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 animate-pulse">&larr; Swipe to switch &rarr;</p>
            </motion.div>
            <div className="flex gap-2">
              {activeTab === 'family' && (
                <>
                  <button onClick={openAddProfile} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><UserPlus size={20} /></button>
                  <button onClick={() => setIsReorderLocked(!isReorderLocked)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">{isReorderLocked ? <Lock size={20} /> : <Unlock size={20} />}</button>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><Settings size={20} /></button>
                </>
              )}
            </div>
          </div>
  
          {activeTab === 'dadbod' && <DadBodBanner user={user} showToast={showToast} askConfirm={askConfirm} />}

          {activeTab === 'family' && children.length > 0 && (
            <>
              <Reorder.Group axis="x" values={children} onReorder={handleReorder} className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {children.map(child => (
                  <Reorder.Item key={child.id} value={child} className="flex-shrink-0 snap-start" dragListener={!isReorderLocked}>
                    <button onClick={() => setSelectedChild(child)} className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all select-none font-bold ${selectedChild?.id === child.id ? `bg-white ${child.type === 'pet' ? 'text-amber-700' : child.type === 'adult' ? 'text-emerald-700' : 'text-indigo-700'} shadow-sm` : 'bg-black/10 text-white/90 hover:bg-black/20'} ${!isReorderLocked ? 'border-2 border-dashed border-white/50' : ''}`}>
                      {child.type === 'pet' ? <PawPrint size={16} /> : child.type === 'adult' ? <User size={16} /> : <Baby size={16} />} {child.name}
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
                  </div>
                  <button onClick={() => openEditProfile(selectedChild)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors shrink-0 ml-2"><Pencil size={16} /></button>
                </div>
              )}
            </>
          )}
        </div>

        {activeTab === 'dadbod' && <div className="flex-1 p-6 overflow-y-auto -mt-6 z-20"><DadBodTracker user={user} showToast={showToast} askConfirm={askConfirm} /></div>}
        {activeTab === 'finance' && <div className="flex-1 p-6 overflow-y-auto -mt-6 z-20"><FinanceTracker user={user} showToast={showToast} askConfirm={askConfirm} /></div>}
        {activeTab === 'meals' && <div className="flex-1 p-6 overflow-y-auto -mt-6 z-20"><MealPlanner user={user} showToast={showToast} askConfirm={askConfirm} /></div>}
        {activeTab === 'jobs' && <div className="flex-1 p-6 overflow-y-auto -mt-6 z-20"><JobCRM user={user} showToast={showToast} askConfirm={askConfirm} /></div>}

        {activeTab === 'family' && (
          <>
            <div className="px-6 -mt-6 z-20 grid grid-cols-2 gap-4">
              {settings.dashboardOrder.filter(w => w.visible).map((widget) => {
                const style = "bg-white p-5 rounded-[28px] shadow-sm flex flex-col items-start gap-3 hover:-translate-y-0.5 transition-transform cursor-pointer";
                if (widget.id === 'symptom') return <button key={widget.id} onClick={() => setIsSymptomOpen(true)} className={style}><div className="p-3 bg-red-100 text-red-700 rounded-full"><Thermometer size={24} /></div><span className="text-sm font-bold text-slate-800">Symptom</span></button>;
                if (widget.id === 'medicine') return <button key={widget.id} onClick={() => setIsMedicineOpen(true)} className={style}><div className="p-3 bg-blue-100 text-blue-700 rounded-full"><Pill size={24} /></div><span className="text-sm font-bold text-slate-800">Medicine</span></button>;
                if (widget.id === 'nutrition') return <button key={widget.id} onClick={() => setIsNutritionOpen(true)} className={style}><div className="p-3 bg-orange-100 text-orange-700 rounded-full">{isPet ? <Bone size={24} /> : <Utensils size={24} />}</div><span className="text-sm font-bold text-slate-800">Nutrition</span></button>;
                if (widget.id === 'growth') return <button key={widget.id} onClick={() => setIsStatsOpen(true)} className={style}><div className="p-3 bg-emerald-100 text-emerald-700 rounded-full"><Weight size={24} /></div><span className="text-sm font-bold text-slate-800">Growth</span></button>;
                if (widget.id === 'doctor') return <button key={widget.id} onClick={() => setIsDoctorOpen(true)} className={style}><div className="p-3 bg-purple-100 text-purple-700 rounded-full"><Stethoscope size={24} /></div><span className="text-sm font-bold text-slate-800">Doctor</span></button>;
                return null;
              })}
            </div>
            <div className="px-6 mt-6 mb-2">
              <div className="bg-slate-200/50 p-1 rounded-full flex">
                <button onClick={() => setViewMode('timeline')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><List size={18} /> Timeline</button>
                <button onClick={() => setViewMode('trends')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'trends' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={18} /> Trends</button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {viewMode === 'timeline' ? (
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
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6"><SimpleLineChart data={weightData} title={`Weight History (${settings.weightUnit})`} unit={settings.weightUnit} colorHex="#10b981" /><SimpleLineChart data={temperatureData} title={`Temp History (°${settings.tempUnit})`} unit={`°${settings.tempUnit}`} colorHex="#ef4444" /></div>
              )}
            </div>
          </>
        )}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-colors duration-500 ${activeTab === 'dadbod' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-xl border-t`}>
        <div className="max-w-md mx-auto flex justify-around p-2 pb-safe">
          {settings.tabOrder.map(tab => {
            if (tab === 'family') return (<button key="family" onClick={() => setActiveTab('family')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'family' ? 'text-indigo-600' : (activeTab === 'dadbod' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400')}`}><Home size={24} className={activeTab === 'family' ? 'fill-indigo-100' : ''} /><span className="text-[10px] font-bold mt-1">Family</span></button>);
            if (tab === 'dadbod') return (<button key="dadbod" onClick={() => setActiveTab('dadbod')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'dadbod' ? 'text-white' : 'text-slate-400'}`}><Activity size={24} className={activeTab === 'dadbod' ? 'fill-slate-700' : ''} /><span className="text-[10px] font-bold mt-1">DadBod</span></button>);
            if (tab === 'finance') return (<button key="finance" onClick={() => setActiveTab('finance')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'finance' ? 'text-emerald-600' : (activeTab === 'dadbod' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400')}`}><Wallet size={24} className={activeTab === 'finance' ? 'fill-emerald-100' : ''} /><span className="text-[10px] font-bold mt-1">Wallet</span></button>);
            if (tab === 'meals') return (<button key="meals" onClick={() => setActiveTab('meals')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'meals' ? 'text-orange-600' : (activeTab === 'dadbod' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400')}`}><ChefHat size={24} className={activeTab === 'meals' ? 'fill-orange-100' : ''} /><span className="text-[10px] font-bold mt-1">Meals</span></button>);
            if (tab === 'jobs') return (<button key="jobs" onClick={() => setActiveTab('jobs')} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'jobs' ? 'text-indigo-600' : (activeTab === 'dadbod' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400')}`}><Briefcase size={24} className={activeTab === 'jobs' ? 'fill-indigo-100' : ''} /><span className="text-[10px] font-bold mt-1">Jobs</span></button>);
            return null;
          })}
        </div>
      </div>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App Settings">
        <div className="space-y-8">
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Units</h4><div className="bg-slate-50 p-5 rounded-[28px] space-y-5"><div className="flex justify-between items-center"><span className="font-bold text-slate-700">Temperature</span><div className="flex bg-slate-200/50 rounded-full p-1"><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'C' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.tempUnit === 'C' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>°C</button><button onClick={() => handleSaveSettings({ ...settings, tempUnit: 'F' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.tempUnit === 'F' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>°F</button></div></div><div className="flex justify-between items-center"><span className="font-bold text-slate-700">Weight</span><div className="flex bg-slate-200/50 rounded-full p-1"><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'kg' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.weightUnit === 'kg' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>kg</button><button onClick={() => handleSaveSettings({ ...settings, weightUnit: 'lbs' })} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${settings.weightUnit === 'lbs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>lbs</button></div></div></div></div>
          
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Widgets</h4><div className="bg-slate-50 p-3 rounded-[28px] space-y-2">{settings.dashboardOrder.map((widget, idx) => (<div key={widget.id} className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><button onClick={() => toggleWidgetVisibility(widget.id)} className={`p-2 rounded-full transition-colors ${widget.visible ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>{widget.visible ? <Eye size={20} /> : <EyeOff size={20} />}</button><span className={`font-bold ${widget.visible ? 'text-slate-800' : 'text-slate-400'}`}>{widget.label}</span></div><div className="flex gap-1"><button disabled={idx === 0} onClick={() => moveWidget(idx, 'up')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowUp size={20} /></button><button disabled={idx === settings.dashboardOrder.length - 1} onClick={() => moveWidget(idx, 'down')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowDown size={20} /></button></div></div>))}</div></div>
          
          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Navigation Tabs</h4><div className="bg-slate-50 p-3 rounded-[28px] space-y-2">{settings.tabOrder.map((tab, idx) => (<div key={tab} className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><span className="font-bold text-slate-800">{tab === 'family' ? 'Family Health' : tab === 'dadbod' ? 'Dad-Bod Mode' : tab === 'finance' ? 'Wallet' : tab === 'meals' ? 'Meals' : 'Jobs'}</span></div><div className="flex gap-1"><button disabled={idx === 0} onClick={() => moveTab(idx, 'up')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowUp size={20} /></button><button disabled={idx === settings.tabOrder.length - 1} onClick={() => moveTab(idx, 'down')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full disabled:opacity-30"><ArrowDown size={20} /></button></div></div>))}</div></div>

          <div><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Account</h4><Button variant="outline" onClick={handleExportData} className="w-full mb-3 !rounded-full"><Download size={18} /> Export Data (JSON)</Button><Button variant="danger" onClick={handleLogout} className="w-full !rounded-full"><LogOut size={18} /> Sign Out</Button></div>
        </div>
      </Modal>

      <Modal isOpen={isAddChildOpen} onClose={closeProfileModal} title={editingId ? "Edit Profile" : "Add Profile"}>
        <form onSubmit={handleSaveProfile} className="space-y-4">
           <div className="grid grid-cols-3 gap-3 mb-6"><button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'child' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Baby size={28} />Child</button><button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'pet' ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><PawPrint size={28} />Pet</button><button type="button" onClick={() => setNewProfileType('adult')} className={`p-4 rounded-3xl flex flex-col items-center gap-2 transition-colors ${newProfileType === 'adult' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><User size={28} />Adult</button></div>
           <div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Name</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" /></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Height</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100cm" /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Weight</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 18kg" /></div></div>
           <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">DOB</label><input type="date" className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newDob} onChange={(e) => setNewDob(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Blood Type</label><select className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:bg-slate-200 font-bold text-slate-800" value={newBloodType} onChange={(e) => setNewBloodType(e.target.value)}><option value="">Select</option>{bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
           <Button type="submit" className="w-full mt-4" disabled={!newChildName.trim()}>{editingId ? "Update Profile" : "Save Profile"}</Button>
        </form>
      </Modal>

      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title="Log Growth"><form onSubmit={handleAddStats} className="space-y-6"><RollerInput label={`Weight (${settings.weightUnit})`} value={logForm.weight} onChange={(val) => setLogForm({...logForm, weight: val})} step={0.1} min={0} max={500} unit={settings.weightUnit} /><RollerInput label={`Height (${settings.heightUnit})`} value={logForm.height} onChange={(val) => setLogForm({...logForm, height: val})} step={1} min={0} max={300} unit={settings.heightUnit} /><Button type="submit" className="w-full !mt-8">Save</Button></form></Modal>
      <Modal isOpen={isSymptomOpen} onClose={() => setIsSymptomOpen(false)} title="Log Symptoms"><form onSubmit={handleAddSymptom} className="space-y-6"><RollerInput label={`Temperature (°${settings.tempUnit})`} value={logForm.temp} onChange={(val) => setLogForm({...logForm, temp: val})} step={0.1} min={30} max={45} unit={`°${settings.tempUnit}`} /><div className="flex flex-wrap gap-2">{commonSymptoms.map(sym => (<button key={sym} type="button" onClick={() => toggleSymptom(sym)} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${logForm.symptoms.includes(sym) ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{sym}</button>))}</div><textarea className="w-full p-4 bg-slate-100 rounded-3xl outline-none focus:bg-slate-200 font-medium text-slate-800" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full">Save</Button></form></Modal>
      
      <Modal isOpen={isMedicineOpen} onClose={() => setIsMedicineOpen(false)} title="Log Medicine">
        <form onSubmit={handleAddMedicine} className="space-y-4"><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Medicine Name" value={logForm.medicineName} onChange={(e) => setLogForm({ ...logForm, medicineName: e.target.value })} /><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Dosage" value={logForm.dosage} onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })} />
          <div className="bg-blue-50 p-5 rounded-3xl"><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2 text-blue-900 font-bold"><Bell size={20} /> Schedule Course</div><div onClick={() => setLogForm({...logForm, isRecurring: !logForm.isRecurring})} className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors ${logForm.isRecurring ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${logForm.isRecurring ? 'left-7 shadow-sm' : 'left-1 shadow-sm'}`}></div></div></div>
            {logForm.isRecurring && (<div className="space-y-5 pt-4 animate-in fade-in slide-in-from-top-2"><RollerInput label="Every (Hours):" value={logForm.scheduleFrequency} onChange={(val) => setLogForm({...logForm, scheduleFrequency: val})} step={1} min={1} max={24} unit="hrs" /><RollerInput label="For (Days):" value={logForm.scheduleDuration} onChange={(val) => setLogForm({...logForm, scheduleDuration: val})} step={1} min={1} max={30} unit="days" /><div className="text-xs font-medium text-blue-700 bg-white/60 p-3 rounded-2xl text-center">Note: Notifications require app open or backgrounded.</div></div>)}
          </div>
          <input type="text" className="w-full p-4 bg-slate-100 rounded-full font-medium text-slate-800 outline-none focus:bg-slate-200 transition-colors" placeholder="Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} />
          <Button type="submit" className="w-full !mt-6">Log Medicine</Button>
        </form>
      </Modal>

      <Modal isOpen={isNutritionOpen} onClose={() => setIsNutritionOpen(false)} title="Log Nutrition"><form onSubmit={handleAddNutrition} className="space-y-4"><div className="flex gap-3 mb-2"><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'food'})} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-colors ${logForm.nutritionType === 'food' ? 'bg-orange-100 text-orange-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{isPet ? <Bone size={28}/> : <Utensils size={28}/>} Food</button><button type="button" onClick={() => setLogForm({...logForm, nutritionType: 'liquid'})} className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-colors ${logForm.nutritionType === 'liquid' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Droplets size={28}/> Drink</button></div><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="Item / Type" value={logForm.item} onChange={(e) => setLogForm({...logForm, item: e.target.value})} /><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="Amount" value={logForm.amount} onChange={(e) => setLogForm({...logForm, amount: e.target.value})} /><Button type="submit" className="w-full !bg-orange-600 !mt-6">Log Nutrition</Button></form></Modal>
      <Modal isOpen={isDoctorOpen} onClose={() => setIsDoctorOpen(false)} title="Record Doctor Visit"><form onSubmit={handleAddDoctorVisit} className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Doctor / Clinic Name</label><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Dr. Smith" value={logForm.doctorName} onChange={(e) => setLogForm({...logForm, doctorName: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Reason for Visit</label><input type="text" className="w-full p-4 bg-slate-100 rounded-full font-bold text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Checkup" value={logForm.visitReason} onChange={(e) => setLogForm({...logForm, visitReason: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1.5 ml-1">Prescriptions & Schedule</label><textarea rows="3" className="w-full p-4 bg-slate-100 rounded-3xl font-medium text-slate-800 outline-none focus:bg-slate-200" placeholder="e.g. Amoxicillin 500mg" value={logForm.prescriptions} onChange={(e) => setLogForm({...logForm, prescriptions: e.target.value})} /></div><textarea className="w-full p-4 bg-slate-100 rounded-3xl font-medium text-slate-800 outline-none focus:bg-slate-200" placeholder="Additional Notes..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /><Button type="submit" className="w-full !bg-purple-600 !mt-6">Save Visit</Button></form></Modal>

    </div>
  );
}
