import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, Clock, Globe, ExternalLink, Trash2, CheckCircle, Pencil, Download, Loader2, X, Check, ArrowRight, FileText, Circle
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Modal, Button } from "./SharedUI";
import { motion } from "framer-motion";

const STAGES = [
  { id: 'inbox', label: 'Inbox', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  { id: 'saved', label: 'Saved', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  { id: 'interview', label: 'Interviewing', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  { id: 'offer', label: 'Offer / Hired', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' }
];

const INITIAL_RESUME_BLOCKS = [
  { id: 'skills', type: 'Skills', title: 'Technical Stack & Languages', date: '', bullets: ['Bilingual: Native English & Fluent Spanish', 'Web Development: React, Next.js, JavaScript, HTML, CSS, Firebase', 'Instructional Design: Curriculum Development, Storyboarding, e-Learning Modules'], active: true },
  { id: 'exp1', type: 'Experience', title: 'English Teacher | TeachCast', date: 'Oct 2025 - Present', bullets: ['Deliver dynamic, high-engagement ESL instruction to remote students.', 'Utilize digital classroom tools and phonetic mechanics to improve pronunciation.'], active: true },
  { id: 'exp2', type: 'Experience', title: 'English Instructor | Carrot Global', date: 'Sept 2024 - Present', bullets: ['Facilitate adult language acquisition through tailored remote learning sessions.', 'Assess student proficiency and adapt curriculum to meet specific career objectives.'], active: true },
  { id: 'proj1', type: 'Project', title: 'KitchenComm | Lead Developer & Instructional Designer', date: '2025 - 2026', bullets: ['Engineered a bilingual (English/Spanish) e-learning platform for quick-service restaurant environments using React and Firebase.', 'Designed full curriculum storyboards and UI mockups focused on health, safety, and sanitation.'], active: true },
  { id: 'proj2', type: 'Project', title: 'Phonetic Mechanics Lab | Creator', date: '2026', bullets: ['Developed web-based simulators to visualize and animate IPA mouth movements, assisting ESL learners with difficult phonemes like the English /ɹ/.'], active: true },
  { id: 'edu1', type: 'Education', title: 'M.Ed. Instructional Technology and Design | Western Governors University', date: 'Expected July 2026', bullets: [], active: true },
  { id: 'edu2', type: 'Education', title: 'B.A. Spanish Language and Literature | Valdosta State University', date: 'May 2024', bullets: [], active: true },
  { id: 'cert1', type: 'Certification', title: '120-Hour TESOL Certificate', date: '2015', bullets: [], active: true }
];

export default function JobCRM({ user, showToast, askConfirm }) {
  // --- View State ---
  const [activeView, setActiveView] = useState('kanban'); // 'kanban' | 'remixer'

  // --- Pipeline State ---
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ptTime, setPtTime] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ company: "", role: "", url: "", stage: "saved", notes: "", salary: "" });

  // --- Remixer State ---
  const [blocks, setBlocks] = useState(INITIAL_RESUME_BLOCKS);

  // Live Pacific Time Clock
  useEffect(() => {
    const updateTime = () => {
      const time = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
      setPtTime(time);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Jobs from Firebase
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, `users/${user.uid}/jobs`), orderBy("createdAt", "desc")), (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Vercel Serverless Function Call
  const fetchLeads = async () => {
    if (!user) return;
    setIsFetching(true);
    try {
      const res = await fetch('/api/fetchJobs');
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, "error");
        setIsFetching(false); return;
      }

      if (data.jobs && data.jobs.length > 0) {
        const batch = writeBatch(db);
        data.jobs.forEach(job => {
          const ref = doc(collection(db, `users/${user.uid}/jobs`));
          batch.set(ref, { ...job, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        });
        await batch.commit();
        showToast(`Fetched ${data.jobs.length} new leads!`, "success");
      } else {
        showToast("No new leads found right now.", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error fetching leads.", "error");
    }
    setIsFetching(false);
  };

  // Pipeline Actions
  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !user) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, `users/${user.uid}/jobs`, editingId), { ...form, updatedAt: Timestamp.now() });
        showToast("Job updated!", "success");
      } else {
        await addDoc(collection(db, `users/${user.uid}/jobs`), { ...form, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        showToast("Job added to pipeline!", "success");
      }
      closeModal();
    } catch (err) { showToast("Error saving job.", "error"); }
  };

  const moveJob = async (id, currentStageIndex) => {
    if (currentStageIndex >= STAGES.length - 1) return;
    const nextStage = STAGES[currentStageIndex + 1].id;
    await updateDoc(doc(db, `users/${user.uid}/jobs`, id), { stage: nextStage, updatedAt: Timestamp.now() });
  };

  const fastDiscardLead = async (id) => { await deleteDoc(doc(db, `users/${user.uid}/jobs`, id)); };

  const deleteJob = (id) => {
    askConfirm("Delete Job", "Remove this application from your pipeline?", async () => {
      await deleteDoc(doc(db, `users/${user.uid}/jobs`, id));
      showToast("Job deleted.", "success");
    });
  };

  const openAdd = () => { setForm({ company: "", role: "", url: "", stage: "saved", notes: "", salary: "" }); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (job) => { setForm({ company: job.company, role: job.role, url: job.url || "", stage: job.stage, notes: job.notes || "", salary: job.salary || "" }); setEditingId(job.id); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  // Remixer Actions
  const toggleBlock = (id) => { setBlocks(blocks.map(b => b.id === id ? { ...b, active: !b.active } : b)); };
  
  const handleExportPDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #resume-print-area, #resume-print-area * { visibility: visible; }
        #resume-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; font-family: ui-sans-serif, system-ui, sans-serif; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const activeBlocks = blocks.filter(b => b.active);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12 h-full flex flex-col">
      
      {/* Top Header Row (Scrollable Cards) */}
      <div className="flex gap-4 overflow-x-auto snap-x scrollbar-hide pb-2 shrink-0 w-full no-print">
        
        {/* Card 1: Job Pipeline */}
        <div 
          onClick={() => setActiveView('kanban')}
          className={`w-[85%] snap-center shrink-0 border p-6 rounded-[28px] shadow-sm flex flex-col justify-between transition-colors cursor-pointer ${activeView === 'kanban' ? 'bg-white border-indigo-200' : 'bg-slate-50/50 border-slate-200 opacity-60 grayscale'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><Briefcase size={28} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Pipeline</h2>
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-0.5">
                  <Clock size={12} className="text-indigo-400" /> <span className="font-bold text-indigo-600">{ptTime}</span> PT
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); fetchLeads(); }} disabled={isFetching} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors active:scale-95 shadow-sm disabled:opacity-50 flex justify-center items-center">
              {isFetching ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); openAdd(); }} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors active:scale-95 shadow-sm flex justify-center items-center">
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Card 2: Resume Remixer */}
        <div 
          onClick={() => setActiveView('remixer')}
          className={`w-[85%] snap-center shrink-0 border p-6 rounded-[28px] shadow-sm flex flex-col justify-between transition-colors cursor-pointer ${activeView === 'remixer' ? 'bg-white border-emerald-200' : 'bg-slate-50/50 border-slate-200 opacity-60 grayscale'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><FileText size={28} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Remixer</h2>
                <div className="text-slate-500 font-medium text-xs mt-0.5">Tailor & Export CV</div>
              </div>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleExportPDF(); }} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors active:scale-95 shadow-sm flex justify-center items-center gap-2">
            <Download size={20} /> <span className="text-xs font-bold uppercase tracking-wider">Export PDF</span>
          </button>
        </div>

      </div>

      {/* --- CONTENT AREA: KANBAN BOARD --- */}
      {activeView === 'kanban' && (
        <div className="flex-1 overflow-x-auto flex gap-4 pb-4 snap-x snap-mandatory scrollbar-hide no-print">
          {STAGES.map((stage, index) => {
            const stageJobs = jobs.filter(j => j.stage === stage.id);
            const isInbox = stage.id === 'inbox';

            return (
              <div key={stage.id} className={`w-[85%] shrink-0 snap-center bg-slate-50/50 border ${stage.border} rounded-[28px] flex flex-col max-h-[65vh]`}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 rounded-t-[28px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${stage.color}`}>{stage.label}</span>
                    <span className="text-sm font-bold text-slate-400">{stageJobs.length}</span>
                  </div>
                </div>
                
                <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
                  {stageJobs.length === 0 && <div className="text-center text-sm font-medium text-slate-400 italic mt-6">No jobs here</div>}
                  {isInbox && stageJobs.length > 0 && <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">&larr; Swipe Left to Trash | Swipe Right to Keep &rarr;</div>}

                  {stageJobs.map(job => {
                    const cardContent = (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">{job.company}</h3>
                          <button onClick={() => openEdit(job)} className="text-slate-300 hover:text-indigo-600 p-1"><Pencil size={14}/></button>
                        </div>
                        <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mb-3">
                          <Globe size={14} className="text-slate-400"/> {job.role || "Role not specified"}
                        </div>
                        {job.salary && <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-lg mb-3">{job.salary}</div>}
                        
                        {isInbox ? (
                          <div className="flex w-full gap-2 mt-3 pt-3 border-t border-slate-50">
                            <button onClick={() => fastDiscardLead(job.id)} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><X size={16}/> Discard</button>
                            <button onClick={() => moveJob(job.id, 0)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><Check size={16}/> Keep</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                            <div className="flex gap-2">
                              {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"><ExternalLink size={14}/></a>}
                              <button onClick={() => deleteJob(job.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                            </div>
                            {index < STAGES.length - 1 ? (
                              <button onClick={() => moveJob(job.id, index)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-all">Advance <ArrowRight size={14} /></button>
                            ) : (
                              <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-xl"><CheckCircle size={14}/> Complete</div>
                            )}
                          </div>
                        )}
                      </>
                    );

                    if (isInbox) {
                      return (
                        <motion.div key={job.id} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8} onDragEnd={(e, info) => { if (info.offset.x < -100) fastDiscardLead(job.id); else if (info.offset.x > 100) moveJob(job.id, 0); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors group relative cursor-grab active:cursor-grabbing touch-pan-y">
                          {cardContent}
                        </motion.div>
                      );
                    }
                    return <div key={job.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group relative">{cardContent}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- CONTENT AREA: RESUME REMIXER --- */}
      {activeView === 'remixer' && (
        <div className="flex-1 overflow-y-auto space-y-3 no-print scrollbar-hide pb-12 animate-in fade-in slide-in-from-bottom-4">
          {['Skills', 'Experience', 'Project', 'Education', 'Certification'].map(type => {
            const typeBlocks = blocks.filter(b => b.type === type);
            if (typeBlocks.length === 0) return null;
            
            return (
              <div key={type} className="bg-slate-50/50 p-4 rounded-[28px] border border-slate-200">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">{type}</h3>
                <div className="space-y-2">
                  {typeBlocks.map(block => (
                    <div key={block.id} onClick={() => toggleBlock(block.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${block.active ? 'bg-white border-emerald-200 shadow-sm' : 'bg-transparent border-slate-200 opacity-60 grayscale'}`}>
                      <div className={`mt-0.5 ${block.active ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {block.active ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </div>
                      <div>
                        <div className={`font-bold ${block.active ? 'text-slate-900' : 'text-slate-500'}`}>{block.title}</div>
                        {block.date && <div className="text-xs text-slate-400 font-medium mt-0.5">{block.date}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- HIDDEN PRINT AREA FOR PDF GENERATION --- */}
      <div id="resume-print-area" className="hidden print:block bg-white text-black p-8">
        <h1 className="text-3xl font-black border-b-2 border-slate-900 pb-2 mb-4">Your Name</h1>
        <p className="text-sm font-medium mb-6">Metepec, Mexico • your.email@example.com • github.com/yourusername</p>
        
        {['Skills', 'Experience', 'Project', 'Education', 'Certification'].map(type => {
          const printableBlocks = activeBlocks.filter(b => b.type === type);
          if (printableBlocks.length === 0) return null;

          return (
            <div key={type} className="mb-6">
              <h2 className="text-lg font-bold uppercase tracking-wider border-b border-slate-300 mb-3 pb-1">{type}</h2>
              {printableBlocks.map(block => (
                <div key={block.id} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-slate-900">{block.title}</h3>
                    <span className="text-sm text-slate-600 font-medium">{block.date}</span>
                  </div>
                  {block.bullets && block.bullets.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {block.bullets.map((bullet, i) => (
                        <li key={i} className="text-sm text-slate-800">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Job Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Job" : "Add Job"}>
        <form onSubmit={handleSaveJob} className="space-y-4">
          <div><label className="text-sm font-bold text-slate-600 ml-1">Company</label><input type="text" placeholder="e.g. Coursera, Duolingo" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" /></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Role</label><input type="text" placeholder="e.g. Instructional Designer, ESL Teacher" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-bold text-slate-600 ml-1">Salary Range</label><input type="text" placeholder="e.g. $70k - $90k" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" /></div><div><label className="text-sm font-bold text-slate-600 ml-1">Stage</label><select value={form.stage} onChange={(e) => setForm({...form, stage: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1">{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Job Post URL</label><input type="url" placeholder="https://..." value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-indigo-600 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" /></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Notes</label><textarea rows="2" placeholder="Remote requirements, contacts, etc." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1 resize-none" /></div>
          <Button type="submit" className="w-full !mt-6 !bg-indigo-600" disabled={!form.company.trim()}>{editingId ? "Update Job" : "Save Job"}</Button>
        </form>
      </Modal>

    </div>
  );
}
