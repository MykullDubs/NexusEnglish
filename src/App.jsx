import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Thermometer, Pill, Clock, Baby, PawPrint, Ruler, Weight,
  ChevronRight, Trash2, Activity, StickyNote, Calendar, UserPlus,
  X, TrendingUp, List, LogOut, LogIn, Mail, Lock
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query 
} from "firebase/firestore";

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
    google: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 w-full"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
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

export default function App() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  
  // Loading States
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // UI States
  const [viewMode, setViewMode] = useState('timeline');
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isMedicineOpen, setIsMedicineOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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
  const [logForm, setLogForm] = useState({ temp: '', symptoms: [], note: '', medicineName: '', dosage: '', weight: '', height: '' });
  
  const commonSymptoms = ['Cough', 'Runny Nose', 'Vomiting', 'Diarrhea', 'Rash', 'Fatigue', 'Headache', 'Sore Throat', 'Lethargy', 'No Appetite'];

  // 1. Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) setDataLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching Effect (Children)
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const q = query(collection(db, 'users', user.uid, 'children'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChildren(data);
      setDataLoading(false);
    }, (error) => {
      console.error("Error fetching children:", error);
      setDataLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Selection Logic Effect
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    } else if (selectedChild && !children.find(c => c.id === selectedChild.id)) {
      setSelectedChild(children.length > 0 ? children[0] : null);
    }
  }, [children, selectedChild]);

  // 4. Logs Fetching Effect
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'logs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, (error) => console.error("Error fetching logs:", error));
    return () => unsubscribe();
  }, [user]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError("Google sign in failed.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) return;
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      // Basic error formatting
      let msg = "Authentication failed.";
      if (err.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 chars.";
      setAuthError(msg);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setChildren([]);
    setLogs([]);
    setSelectedChild(null);
    setEmail('');
    setPassword('');
  };

  const currentChildLogs = logs.filter(l => l.childId === selectedChild?.id);
  const temperatureData = useMemo(() => currentChildLogs.filter(l => l.type === 'symptom' && l.temperature).map(l => ({ date: l.timestamp, value: l.temperature })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);
  const weightData = useMemo(() => currentChildLogs.filter(l => l.type === 'measurement' && l.weight).map(l => ({ date: l.timestamp, value: l.weight })).sort((a, b) => new Date(a.date) - new Date(b.date)), [currentChildLogs]);

  // --- Action Handlers (Same as before) ---
  const handleAddChild = async (e) => {
    e.preventDefault();
    if (!newChildName.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'children'), {
        name: newChildName, type: newProfileType, height: newHeight, weight: newWeight, createdAt: new Date().toISOString()
      });
      if (newWeight || newHeight) {
        await addDoc(collection(db, 'users', user.uid, 'logs'), {
          childId: docRef.id, type: 'measurement', timestamp: new Date().toISOString(), height: newHeight, weight: newWeight, note: 'Initial Profile Creation'
        });
      }
      setNewChildName(''); setNewProfileType('child'); setNewHeight(''); setNewWeight(''); setIsAddChildOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleAddSymptom = async (e) => {
    e.preventDefault();
    if (!user || !selectedChild) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'logs'), {
        childId: selectedChild.id, type: 'symptom', timestamp: new Date().toISOString(), temperature: logForm.temp, symptoms: logForm.symptoms, note: logForm.note
      });
      setLogForm({ ...logForm, temp: '', symptoms: [], note: '' }); setIsSymptomOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!user || !selectedChild) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'logs'), {
        childId: selectedChild.id, type: 'medicine', timestamp: new Date().toISOString(), medicineName: logForm.medicineName, dosage: logForm.dosage, note: logForm.note
      });
      setLogForm({ ...logForm, medicineName: '', dosage: '', note: '' }); setIsMedicineOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleAddStats = async (e) => {
    e.preventDefault();
    if (!user || !selectedChild) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'logs'), {
        childId: selectedChild.id, type: 'measurement', timestamp: new Date().toISOString(), weight: logForm.weight, height: logForm.height, note: logForm.note
      });
      const updates = {};
      if (logForm.weight) updates.weight = logForm.weight;
      if (logForm.height) updates.height = logForm.height;
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', user.uid, 'children', selectedChild.id), updates);
      }
      setLogForm({ ...logForm, weight: '', height: '', note: '' }); setIsStatsOpen(false);
    } catch (err) { console.error(err); }
  };

  const deleteLog = async (logId) => {
    if (!user || !window.confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, 'users', user.uid, 'logs', logId));
  };

  const toggleSymptom = (sym) => {
    if (logForm.symptoms.includes(sym)) setLogForm({ ...logForm, symptoms: logForm.symptoms.filter(s => s !== sym) });
    else setLogForm({ ...logForm, symptoms: [...logForm.symptoms, sym] });
  };

  const isPet = selectedChild?.type === 'pet';
  const themeBg = isPet ? 'bg-amber-600' : 'bg-indigo-600';
  const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // --- Views ---

  // 1. Loading Screen
  if (authLoading || (user && dataLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Activity className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 font-medium">Loading your family data...</p>
      </div>
    );
  }

  // 2. Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={32} className="text-indigo-600" /></div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Family Health Status</h1>
          <p className="text-slate-500 mb-8">Log in to track fevers, meds, and growth for your kids and pets across all your devices.</p>
          
          <Button onClick={handleGoogleLogin} variant="google" className="mb-6 py-3 border-slate-200 border shadow-sm">
            <LogIn size={20} /> Sign in with Google
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-slate-400 text-sm">OR</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            {authError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{authError}</div>}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email" 
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white">
              {isSignUp ? "Create Account" : "Log In"}
            </Button>
          </form>

          <button 
            onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
            className="mt-6 text-indigo-600 text-sm font-medium hover:text-indigo-800"
          >
            {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  // 3. Onboarding (No Data Found)
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Activity size={32} className="text-emerald-600" /></div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome!</h1>
          <p className="text-slate-500 mb-8">Let's create your first profile.</p>
          <Button onClick={() => setIsAddChildOpen(true)} className="w-full mb-4">Create First Profile</Button>
          <button onClick={handleLogout} className="text-slate-400 text-sm hover:text-slate-600">Sign Out</button>
        </div>
        <Modal isOpen={isAddChildOpen} onClose={() => setIsAddChildOpen(false)} title="Add Profile">
          <form onSubmit={handleAddChild} className="space-y-4">
             <div className="grid grid-cols-2 gap-4 mb-4">
               <button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newProfileType === 'child' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Baby size={24} /> <span className="font-medium">Child</span></button>
               <button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newProfileType === 'pet' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><PawPrint size={24} /> <span className="font-medium">Pet</span></button>
             </div>
             <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" /></div>
             <Button type="submit" className="w-full" disabled={!newChildName.trim()}>Save Profile</Button>
          </form>
        </Modal>
      </div>
    );
  }

  // 4. Dashboard
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-0">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden flex flex-col relative">
        <div className={`${themeBg} p-6 pb-8 text-white rounded-b-[2.5rem] shadow-lg z-10 transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-lg font-bold flex items-center gap-2 opacity-90"><Activity size={20} /> Family Health Status</h1>
            <div className="flex gap-2">
              <button onClick={() => setIsAddChildOpen(true)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><UserPlus size={18} /></button>
              <button onClick={handleLogout} className="p-2 bg-white/20 hover:bg-red-500/50 rounded-full transition-colors"><LogOut size={18} /></button>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {children.map(child => {
              const isActive = selectedChild?.id === child.id;
              return (
                <button key={child.id} onClick={() => setSelectedChild(child)} className={`flex-shrink-0 snap-start px-4 py-2 rounded-full flex items-center gap-2 transition-all border ${isActive ? `bg-white ${child.type === 'pet' ? 'text-amber-600' : 'text-indigo-600'} font-bold shadow-md border-transparent` : 'bg-black/10 text-white/70 border-transparent hover:bg-black/20'}`}>{child.type === 'pet' ? <PawPrint size={14} /> : <Baby size={14} />}{child.name}</button>
              );
            })}
          </div>
          {selectedChild && (
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-4 text-sm text-white/90 bg-black/10 px-4 py-2 rounded-xl backdrop-blur-md">
                {(selectedChild.height || selectedChild.weight) ? (
                  <>
                    {selectedChild.height && <div className="flex items-center gap-1.5"><Ruler size={14} /><span>{selectedChild.height}</span></div>}
                    {selectedChild.height && selectedChild.weight && <div className="w-px h-3 bg-white/30"></div>}
                    {selectedChild.weight && <div className="flex items-center gap-1.5"><Weight size={14} /><span>{selectedChild.weight}</span></div>}
                  </>
                ) : <span className="text-xs opacity-70 italic">No stats recorded</span>}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 -mt-8 z-20 grid grid-cols-3 gap-3">
          <button onClick={() => setIsSymptomOpen(true)} className="bg-white p-3 rounded-2xl shadow-lg shadow-slate-200 border border-slate-50 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform"><div className="p-2.5 bg-red-50 text-red-500 rounded-full"><Thermometer size={20} /></div><span className="text-xs font-bold text-slate-600">Symptom</span></button>
          <button onClick={() => setIsMedicineOpen(true)} className="bg-white p-3 rounded-2xl shadow-lg shadow-slate-200 border border-slate-50 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform"><div className="p-2.5 bg-blue-50 text-blue-500 rounded-full"><Pill size={20} /></div><span className="text-xs font-bold text-slate-600">Meds</span></button>
          <button onClick={() => setIsStatsOpen(true)} className="bg-white p-3 rounded-2xl shadow-lg shadow-slate-200 border border-slate-50 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform"><div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-full"><Weight size={20} /></div><span className="text-xs font-bold text-slate-600">Log Stats</span></button>
        </div>
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
                  <div className={`absolute -left-[7px] top-4 w-3 h-3 rounded-full border-2 border-slate-50 shadow-sm ${log.type === 'medicine' ? 'bg-blue-500' : log.type === 'measurement' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{log.type} &bull; {formatDate(log.timestamp)} {formatTime(log.timestamp)}</span><button onClick={() => deleteLog(log.id)} className="text-slate-300 hover:text-red-400"><Trash2 size={14} /></button></div>
                    {log.type === 'symptom' && <div className="flex items-start gap-3">{log.temperature && <div className="text-2xl font-bold text-slate-700">{log.temperature}°</div>}<div className="flex flex-wrap gap-1">{log.symptoms?.map(s => <span key={s} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-md font-medium">{s}</span>)}</div></div>}
                    {log.type === 'medicine' && <div><div className="font-bold text-slate-700 text-lg">{log.medicineName}</div><div className="text-slate-500 text-sm">{log.dosage}</div></div>}
                    {log.type === 'measurement' && <div className="flex gap-4">{log.weight && <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">Weight: {log.weight}</div>}{log.height && <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">Height: {log.height}</div>}</div>}
                    {log.note && <div className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-2 rounded-lg">"{log.note}"</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6"><SimpleLineChart data={weightData} title="Weight History" unit="kg" colorHex="#059669" /><SimpleLineChart data={temperatureData} title="Temperature History" unit="°" colorHex="#dc2626" /></div>
          )}
        </div>
      </div>
      <Modal isOpen={isAddChildOpen} onClose={() => setIsAddChildOpen(false)} title="Add Profile">
         <form onSubmit={handleAddChild} className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><button type="button" onClick={() => setNewProfileType('child')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newProfileType === 'child' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Baby size={24} /> <span className="font-medium">Child</span></button><button type="button" onClick={() => setNewProfileType('pet')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newProfileType === 'pet' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><PawPrint size={24} /> <span className="font-medium">Pet</span></button></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder={newProfileType === 'child' ? "e.g. Sarah" : "e.g. Buddy"} /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-700">Height</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newHeight} onChange={(e) => setNewHeight(e.target.value)} placeholder="e.g. 100cm" /></div><div><label className="text-sm font-medium text-slate-700">Weight</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="e.g. 18kg" /></div></div>
            <Button type="submit" className="w-full" disabled={!newChildName.trim()} variant={newProfileType}>Save Profile</Button>
         </form>
      </Modal>
      <Modal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} title="Log Growth & Stats"><form onSubmit={handleAddStats} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Current Weight</label><input autoFocus type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={logForm.weight} onChange={(e) => setLogForm({...logForm, weight: e.target.value})} placeholder="e.g. 20.5" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Current Height</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={logForm.height} onChange={(e) => setLogForm({...logForm, height: e.target.value})} placeholder="e.g. 110 cm" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Note</label><textarea rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none" value={logForm.note} onChange={(e) => setLogForm({...logForm, note: e.target.value})} placeholder="Optional note..." /></div><Button type="submit" className="w-full bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700">Save Measurement</Button></form></Modal>
      <Modal isOpen={isSymptomOpen} onClose={() => setIsSymptomOpen(false)} title="Log Symptoms"><form onSubmit={handleAddSymptom} className="space-y-6"><div><label className="block text-sm font-medium text-slate-700 mb-2">Temperature</label><div className="flex gap-2"><input type="number" step="0.1" placeholder="0.0" className="flex-1 p-4 text-2xl font-bold text-center bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={logForm.temp} onChange={(e) => setLogForm({ ...logForm, temp: e.target.value })} /><div className="flex items-center justify-center bg-slate-100 w-16 rounded-xl text-slate-500 font-bold">°</div></div></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Symptoms</label><div className="flex flex-wrap gap-2">{commonSymptoms.map(sym => (<button key={sym} type="button" onClick={() => toggleSymptom(sym)} className={`px-3 py-2 rounded-lg text-sm transition-colors border ${logForm.symptoms.includes(sym) ? 'bg-red-50 border-red-200 text-red-600 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{sym}</button>))}</div></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Notes</label><textarea rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Any specific details..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /></div><Button type="submit" className="w-full" variant={selectedChild?.type === 'pet' ? 'pet' : 'child'}>Save Entry</Button></form></Modal>
      <Modal isOpen={isMedicineOpen} onClose={() => setIsMedicineOpen(false)} title="Log Medicine"><form onSubmit={handleAddMedicine} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name</label><input type="text" autoFocus className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Ibuprofen" value={logForm.medicineName} onChange={(e) => setLogForm({ ...logForm, medicineName: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Dosage</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 5ml" value={logForm.dosage} onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label><textarea rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Instructions..." value={logForm.note} onChange={(e) => setLogForm({ ...logForm, note: e.target.value })} /></div><Button type="submit" className="w-full bg-blue-600 shadow-blue-200 hover:bg-blue-700" disabled={!logForm.medicineName}>Log Medicine</Button></form></Modal>
    </div>
  );
}
