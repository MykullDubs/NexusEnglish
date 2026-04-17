import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, Clock, Globe, ExternalLink, Trash2, CheckCircle,
  Pencil, Download, Loader2, X, Check, ArrowRight, FileText, Circle,
  GripVertical, Copy, UserCircle, Palette, Eye, EyeOff, PlusCircle, Edit3
} from 'lucide-react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query,
  orderBy, Timestamp, updateDoc, writeBatch, setDoc, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Modal, Button } from "./SharedUI";
import { motion, Reorder } from "framer-motion";

// ---------------------------------------------------------------------------
// Constants & Defaults
// ---------------------------------------------------------------------------

const STAGES = [
  { id: 'inbox',     label: 'Inbox',         color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  { id: 'saved',     label: 'Saved',         color: 'bg-slate-100 text-slate-700',   border: 'border-slate-200' },
  { id: 'applied',   label: 'Applied',       color: 'bg-blue-100 text-blue-700',     border: 'border-blue-200' },
  { id: 'interview', label: 'Interviewing',  color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  { id: 'offer',     label: 'Offer / Hired', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' }
];

const INITIAL_HEADER = {
  name: "Your Name",
  email: "email@example.com",
  location: "Metepec, Mexico",
  links: "github.com/yourusername • linkedin.com/in/you"
};

const INITIAL_RESUME_BLOCKS = [
  { id: 'skills', type: 'Skills', title: 'Technical Stack & Languages', date: '', bullets: ['Bilingual: Native English & Fluent Spanish', 'Web Development: React, Next.js, JavaScript, HTML, CSS, Firebase', 'Instructional Design: Curriculum Development, Storyboarding, e-Learning Modules'], active: true },
  { id: 'exp1',   type: 'Experience', title: 'English Teacher | TeachCast', date: 'Oct 2025 - Present', bullets: ['Deliver dynamic, high-engagement ESL instruction to remote students.', 'Utilize digital classroom tools and phonetic mechanics to improve pronunciation.'], active: true },
  { id: 'exp2',   type: 'Experience', title: 'English Instructor | Carrot Global', date: 'Sept 2024 - Present', bullets: ['Facilitate adult language acquisition through tailored remote learning sessions.', 'Assess student proficiency and adapt curriculum to meet specific career objectives.'], active: true },
  { id: 'proj1',  type: 'Project', title: 'KitchenComm | Lead Developer & Instructional Designer', date: '2025 - 2026', bullets: ['Engineered a bilingual (English/Spanish) e-learning platform for quick-service restaurant environments using React and Firebase.', 'Designed full curriculum storyboards and UI mockups focused on health, safety, and sanitation.'], active: true },
  { id: 'proj2',  type: 'Project', title: 'Phonetic Mechanics Lab | Creator', date: '2026', bullets: ['Developed web-based simulators to visualize and animate IPA mouth movements, assisting ESL learners with difficult phonemes like the English /ɹ/.'], active: true },
  { id: 'edu1',   type: 'Education', title: 'M.Ed. Instructional Technology and Design | Western Governors University', date: 'Expected July 2026', bullets: [], active: true },
  { id: 'edu2',   type: 'Education', title: 'B.A. Spanish Language and Literature | Valdosta State University', date: 'May 2024', bullets: [], active: true },
  { id: 'cert1',  type: 'Certification', title: '120-Hour TESOL Certificate', date: '2015', bullets: [], active: true }
];

const RESUME_DOC = (uid) => `users/${uid}/settings/resumeEngine`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function CardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-pulse space-y-3">
      <div className="h-4 bg-slate-100 rounded w-2/3" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="h-8 bg-slate-50 rounded-xl w-full mt-2" />
    </div>
  );
}

function StageDots({ total, active }) {
  return (
    <div className="flex justify-center gap-1.5 pt-1 pb-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${ i === active ? 'w-4 h-1.5 bg-indigo-500' : 'w-1.5 h-1.5 bg-slate-300' }`} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function JobCRM({ user, showToast, askConfirm }) {

  // --- View State ---
  const [activeView, setActiveView]       = useState('kanban'); // 'kanban' | 'remixer'
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  // --- Pipeline State ---
  const [jobs, setJobs]           = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [ptTime, setPtTime]               = useState("");
  const [isFetching, setIsFetching]       = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState({ company: "", role: "", url: "", stage: "saved", notes: "", salary: "" });

  // --- Resume Engine State ---
  const [header, setHeader]             = useState(INITIAL_HEADER);
  const [blocks, setBlocks]             = useState(INITIAL_RESUME_BLOCKS);
  const [theme, setTheme]               = useState('modern'); // 'modern' | 'classic'
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  
  // Modals for Resume Engine
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [blockForm, setBlockForm]                 = useState(null);

  // ── Live Pacific Time ──────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setPtTime(new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }));
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  // ── Firestore Listeners (Jobs) ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setIsLoadingJobs(true);
    const unsub = onSnapshot(query(collection(db, `users/${user.uid}/jobs`), orderBy("createdAt", "desc")),
      (snap) => { setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoadingJobs(false); },
      () => setIsLoadingJobs(false)
    );
    return () => unsub();
  }, [user]);

  // ── Firestore Load (Resume Engine) ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, RESUME_DOC(user.uid)));
        if (snap.exists()) {
          const data = snap.data();
          if (data.header) setHeader(data.header);
          if (data.blocks) setBlocks(data.blocks);
          if (data.theme) setTheme(data.theme);
        } else {
          // Fallback check for old data structure
          const oldSnap = await getDoc(doc(db, `users/${user.uid}/settings/resumeBlocks`));
          if (oldSnap.exists()) setBlocks(oldSnap.data().blocks ?? INITIAL_RESUME_BLOCKS);
        }
      } catch (e) {} finally { setIsLoadingBlocks(false); }
    })();
  }, [user]);

  const persistResume = useCallback(async (newHeader, newBlocks, newTheme) => {
    if (!user) return;
    try { await setDoc(doc(db, RESUME_DOC(user.uid)), { header: newHeader, blocks: newBlocks, theme: newTheme }); } 
    catch (e) { showToast("Couldn't save resume state.", "error"); }
  }, [user, showToast]);

  // ── Job Pipeline Actions ───────────────────────────────────────────────────
  const fetchLeads = async () => {
    if (!user) return;
    setIsFetching(true);
    try {
      const res  = await fetch('/api/fetchJobs');
      const data = await res.json();
      if (data.error) { showToast(data.error, "error"); setIsFetching(false); return; }

      if (data.jobs && data.jobs.length > 0) {
        const existingUrls = new Set(jobs.map(j => j.url).filter(Boolean));
        const newJobs = data.jobs.filter(j => j.url && !existingUrls.has(j.url));
        if (newJobs.length === 0) { showToast("No new leads — you're all caught up!", "success"); setIsFetching(false); return; }

        const batch = writeBatch(db);
        newJobs.forEach(job => {
          const ref = doc(collection(db, `users/${user.uid}/jobs`));
          batch.set(ref, { ...job, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        });
        await batch.commit();
        showToast(`Fetched ${newJobs.length} new leads!`, "success");
      } else { showToast("No new leads found right now.", "success"); }
    } catch (e) { showToast("Network error fetching leads.", "error"); }
    setIsFetching(false);
  };

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
    } catch { showToast("Error saving job.", "error"); }
  };

  const moveJob = async (id, jobStageId) => {
    const currentIdx = STAGES.findIndex(s => s.id === jobStageId);
    if (currentIdx < 0 || currentIdx >= STAGES.length - 1) return;
    await updateDoc(doc(db, `users/${user.uid}/jobs`, id), { stage: STAGES[currentIdx + 1].id, updatedAt: Timestamp.now() });
  };
  const fastDiscardLead = async (id) => { await deleteDoc(doc(db, `users/${user.uid}/jobs`, id)); };
  const deleteJob = (id) => { askConfirm("Delete Job", "Remove this application from your pipeline?", async () => { await deleteDoc(doc(db, `users/${user.uid}/jobs`, id)); showToast("Job deleted.", "success"); }); };

  const openAdd   = () => { setForm({ company: "", role: "", url: "", stage: "saved", notes: "", salary: "" }); setEditingId(null); setIsModalOpen(true); };
  const openEdit  = (job) => { setForm({ company: job.company, role: job.role, url: job.url || "", stage: job.stage, notes: job.notes || "", salary: job.salary || "" }); setEditingId(job.id); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  // ── Resume Engine Actions ──────────────────────────────────────────────────
  const toggleBlockVisibility = (id) => {
    const updated = blocks.map(b => b.id === id ? { ...b, active: !b.active } : b);
    setBlocks(updated); persistResume(header, updated, theme);
  };

  const handleReorderBlocks = (reorderedBlocks) => {
    setBlocks(reorderedBlocks); persistResume(header, reorderedBlocks, theme);
  };

  const deleteBlock = (id) => {
    askConfirm("Delete Block", "Remove this section from your resume builder?", () => {
      const updated = blocks.filter(b => b.id !== id);
      setBlocks(updated); persistResume(header, updated, theme);
    });
  };

  const saveBlockForm = (e) => {
    e.preventDefault();
    let updated;
    if (blockForm.id) {
      updated = blocks.map(b => b.id === blockForm.id ? blockForm : b);
    } else {
      updated = [...blocks, { ...blockForm, id: `block_${Date.now()}`, active: true }];
    }
    setBlocks(updated); persistResume(header, updated, theme);
    setBlockForm(null);
  };

  const saveHeader = (e) => {
    e.preventDefault();
    persistResume(header, blocks, theme);
    setIsHeaderModalOpen(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'modern' ? 'classic' : 'modern';
    setTheme(newTheme); persistResume(header, blocks, newTheme);
  };

  const copyToATS = () => {
    const activeBlocks = blocks.filter(b => b.active);
    let text = `${header.name}\n${header.email} | ${header.location}\n${header.links}\n\n`;
    
    ['Skills', 'Experience', 'Project', 'Education', 'Certification'].forEach(type => {
      const typeBlocks = activeBlocks.filter(b => b.type === type);
      if (typeBlocks.length === 0) return;
      text += `--- ${type.toUpperCase()} ---\n\n`;
      typeBlocks.forEach(b => {
        text += `${b.title} ${b.date ? `(${b.date})` : ''}\n`;
        if (b.bullets && b.bullets.length > 0) { b.bullets.forEach(bullet => text += `• ${bullet}\n`); }
        text += `\n`;
      });
    });
    navigator.clipboard.writeText(text);
    showToast("Plain-text resume copied to clipboard!", "success");
  };

  const handleExportPDF = () => {
    const activeBlocks = blocks.filter(b => b.active);
    const fontFamily = theme === 'modern' ? 'ui-sans-serif, system-ui, sans-serif' : '"Georgia", serif';
    const headerColor = theme === 'modern' ? '#3730a3' : '#1a1a1a'; // Indigo vs Black

    const sections = ['Skills', 'Experience', 'Project', 'Education', 'Certification'].map(type => {
        const typeBlocks = activeBlocks.filter(b => b.type === type);
        if (!typeBlocks.length) return '';
        return `
          <section>
            <h2>${type}</h2>
            ${typeBlocks.map(block => `
              <div class="block">
                <div class="block-header">
                  <span class="block-title">${block.title}</span>
                  <span class="block-date">${block.date}</span>
                </div>
                ${block.bullets?.length ? `<ul>${block.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
              </div>
            `).join('')}
          </section>`;
      }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${header.name} - Resume</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${fontFamily}; color: #1a1a1a; padding: 48px; font-size: 13px; line-height: 1.6; }
  h1 { font-size: 28px; font-weight: 900; color: ${headerColor}; padding-bottom: 2px; margin-bottom: 4px; letter-spacing: -0.5px; }
  .contact { font-size: 12px; color: #555; margin-bottom: 28px; border-bottom: 2px solid ${headerColor}; padding-bottom: 12px; }
  section { margin-bottom: 22px; }
  h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${headerColor}; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px; }
  .block { margin-bottom: 12px; }
  .block-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .block-title { font-weight: 700; font-size: 14px; }
  .block-date { font-size: 11px; color: #666; font-style: italic; }
  ul { padding-left: 18px; margin-top: 4px; }
  li { margin-bottom: 3px; font-size: 12.5px; color: #333; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
  <h1>${header.name}</h1>
  <p class="contact">${header.location} &bull; ${header.email} &bull; ${header.links}</p>
  ${sections}
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.addEventListener('load', () => URL.revokeObjectURL(url));
  };

  const handleKanbanScroll = (e) => {
    const el    = e.currentTarget;
    const idx   = Math.round(el.scrollLeft / (el.scrollWidth / STAGES.length));
    setActiveStageIdx(Math.min(idx, STAGES.length - 1));
  };

  const totalJobs = jobs.length;
  const showEmptyState = !isLoadingJobs && totalJobs === 0 && activeView === 'kanban';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12 h-full flex flex-col">

      {/* ── Top Header Row ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 overflow-x-auto snap-x scrollbar-hide pb-2 shrink-0 w-full no-print">

        {/* Card 1: Job Pipeline */}
        <div onClick={() => setActiveView('kanban')} className={`w-[85%] snap-center shrink-0 border p-6 rounded-[28px] shadow-sm flex flex-col justify-between transition-colors cursor-pointer ${activeView === 'kanban' ? 'bg-white border-indigo-200' : 'bg-slate-50/50 border-slate-200 opacity-60 grayscale'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><Briefcase size={28} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Pipeline</h2>
                <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-0.5"><Clock size={12} className="text-indigo-400" /><span className="font-bold text-indigo-600">{ptTime}</span> PT</div>
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

        {/* Card 2: Resume Engine */}
        <div onClick={() => setActiveView('remixer')} className={`w-[85%] snap-center shrink-0 border p-6 rounded-[28px] shadow-sm flex flex-col justify-between transition-colors cursor-pointer ${activeView === 'remixer' ? 'bg-white border-emerald-200' : 'bg-slate-50/50 border-slate-200 opacity-60 grayscale'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><FileText size={28} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Engine</h2>
                <div className="text-slate-500 font-medium text-xs mt-0.5">Tailor & Export CV</div>
              </div>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleExportPDF(); }} className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors active:scale-95 shadow-sm flex justify-center items-center gap-2">
            <Download size={20} /><span className="text-xs font-bold uppercase tracking-wider">Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── KANBAN VIEW ───────────────────────────────────────────────────── */}
      {activeView === 'kanban' && (
        <>
          {showEmptyState && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-[28px]">
              <div className="p-4 bg-indigo-50 text-indigo-400 rounded-full"><Briefcase size={32} /></div>
              <div><p className="font-black text-slate-800 text-lg">Your pipeline is empty</p><p className="text-slate-400 text-sm font-medium mt-1">Hit <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-xs"><Download size={11}/> fetch</span> to pull fresh leads, or <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 text-white rounded-md font-bold text-xs"><Plus size={11}/> add</span> one manually.</p></div>
            </motion.div>
          )}

          {!showEmptyState && <StageDots total={STAGES.length} active={activeStageIdx} />}

          <div className="flex-1 overflow-x-auto flex gap-4 pb-4 snap-x snap-mandatory scrollbar-hide no-print" onScroll={handleKanbanScroll}>
            {STAGES.map((stage) => {
              const stageJobs = jobs.filter(j => j.stage === stage.id);
              const isInbox   = stage.id === 'inbox';

              return (
                <div key={stage.id} className={`w-[85%] shrink-0 snap-center snap-always bg-slate-50/50 border ${stage.border} rounded-[28px] flex flex-col max-h-[65vh]`}>
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 rounded-t-[28px]">
                    <div className="flex items-center gap-2"><span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${stage.color}`}>{stage.label}</span><span className="text-sm font-bold text-slate-400">{stageJobs.length}</span></div>
                  </div>

                  <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
                    {isLoadingJobs && <><CardSkeleton /><CardSkeleton /></>}
                    {!isLoadingJobs && stageJobs.length === 0 && <div className="text-center text-sm font-medium text-slate-400 italic mt-6">No jobs here</div>}
                    {!isLoadingJobs && isInbox && stageJobs.length > 0 && <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">← Swipe Left to Trash &nbsp;|&nbsp; Swipe Right to Keep →</div>}

                    {!isLoadingJobs && stageJobs.map(job => {
                      const cardContent = (
                        <>
                          <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-slate-900 flex items-center gap-2">{job.company}</h3><button onClick={() => openEdit(job)} className="text-slate-300 hover:text-indigo-600 p-1"><Pencil size={14} /></button></div>
                          <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mb-3"><Globe size={14} className="text-slate-400" /> {job.role || "Role not specified"}</div>
                          {job.salary && <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-lg mb-3">{job.salary}</div>}

                          {isInbox ? (
                            <div className="flex w-full gap-2 mt-3 pt-3 border-t border-slate-50">
                              <button onClick={() => fastDiscardLead(job.id)} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><X size={16} /> Discard</button>
                              <button onClick={() => moveJob(job.id, job.stage)} className="flex-1 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><Check size={16} /> Keep</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div className="flex gap-2">{job.url && <a href={job.url} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"><ExternalLink size={14} /></a>}<button onClick={() => deleteJob(job.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14} /></button></div>
                              {STAGES.findIndex(s => s.id === job.stage) < STAGES.length - 1 ? <button onClick={() => moveJob(job.id, job.stage)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-all">Advance <ArrowRight size={14} /></button> : <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-xl"><CheckCircle size={14} /> Complete</div>}
                            </div>
                          )}
                        </>
                      );

                      if (isInbox) return <motion.div key={job.id} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8} onDragEnd={(e, info) => { if (info.offset.x < -100) fastDiscardLead(job.id); else if (info.offset.x > 100) moveJob(job.id, job.stage); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors group relative cursor-grab active:cursor-grabbing touch-pan-y">{cardContent}</motion.div>;
                      return <div key={job.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group relative">{cardContent}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── RESUME ENGINE VIEW ──────────────────────────────────────────────── */}
      {activeView === 'remixer' && (
        <div className="flex-1 overflow-y-auto space-y-4 no-print scrollbar-hide pb-12 animate-in fade-in slide-in-from-bottom-4">
          
          {/* Quick Actions Bar */}
          <div className="grid grid-cols-4 gap-2 bg-white p-2 rounded-[24px] shadow-sm border border-slate-100">
            <button onClick={() => setIsHeaderModalOpen(true)} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-slate-50 text-slate-600"><UserCircle size={20}/><span className="text-[10px] font-bold">Header</span></button>
            <button onClick={() => setBlockForm({ type: 'Experience', title: '', date: '', bullets: [''] })} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-slate-50 text-emerald-600"><PlusCircle size={20}/><span className="text-[10px] font-bold">Add</span></button>
            <button onClick={toggleTheme} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-slate-50 text-indigo-600"><Palette size={20}/><span className="text-[10px] font-bold">{theme === 'modern' ? 'Sans' : 'Serif'}</span></button>
            <button onClick={copyToATS} className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-slate-50 text-slate-600"><Copy size={20}/><span className="text-[10px] font-bold">Copy TXT</span></button>
          </div>

          {isLoadingBlocks ? (
            <div className="flex justify-center items-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
          ) : (
            <Reorder.Group axis="y" values={blocks} onReorder={handleReorderBlocks} className="space-y-3">
              {blocks.map(block => (
                <Reorder.Item key={block.id} value={block} className={`bg-white p-4 rounded-[24px] border shadow-sm flex items-start gap-3 transition-colors ${block.active ? 'border-emerald-200' : 'border-slate-200 opacity-60 grayscale'}`}>
                  
                  {/* Drag Handle */}
                  <div className="pt-1 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 touch-none"><GripVertical size={20} /></div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{block.type}</div>
                        <div className={`font-bold ${block.active ? 'text-slate-900' : 'text-slate-500'}`}>{block.title}</div>
                        {block.date && <div className="text-xs text-slate-400 font-medium mt-0.5">{block.date}</div>}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 bg-slate-50 rounded-full p-1 border border-slate-100">
                        <button onClick={() => toggleBlockVisibility(block.id)} className={`p-1.5 rounded-full ${block.active ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-200'}`}>
                          {block.active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={() => setBlockForm(block)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-indigo-600"><Edit3 size={16} /></button>
                        <button onClick={() => deleteBlock(block.id)} className="p-1.5 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Job" : "Add Job"}>
        <form onSubmit={handleSaveJob} className="space-y-4">
          <div><label className="text-sm font-bold text-slate-600 ml-1">Company</label><input type="text" placeholder="e.g. Coursera" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Role</label><input type="text" placeholder="e.g. Instructional Designer" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-bold text-slate-600 ml-1">Salary Range</label><input type="text" placeholder="e.g. $70k - $90k" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div><div><label className="text-sm font-bold text-slate-600 ml-1">Stage</label><select value={form.stage} onChange={(e) => setForm({...form, stage: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20">{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Job Post URL</label><input type="url" placeholder="https://..." value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-indigo-600 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Notes</label><textarea rows="2" placeholder="Remote requirements, contacts, etc." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 resize-none" /></div>
          <Button type="submit" className="w-full !mt-6 !bg-indigo-600" disabled={!form.company.trim()}>{editingId ? "Update Job" : "Save Job"}</Button>
        </form>
      </Modal>

      {/* Resume Header Modal */}
      <Modal isOpen={isHeaderModalOpen} onClose={() => setIsHeaderModalOpen(false)} title="Edit Header">
        <form onSubmit={saveHeader} className="space-y-4">
          <div><label className="text-sm font-bold text-slate-600 ml-1">Full Name</label><input type="text" value={header.name} onChange={(e) => setHeader({...header, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-bold text-slate-600 ml-1">Email</label><input type="email" value={header.email} onChange={(e) => setHeader({...header, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none" /></div>
            <div><label className="text-sm font-bold text-slate-600 ml-1">Location</label><input type="text" value={header.location} onChange={(e) => setHeader({...header, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none" /></div>
          </div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Links (Github, Portfolio)</label><input type="text" value={header.links} onChange={(e) => setHeader({...header, links: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none" /></div>
          <Button type="submit" className="w-full !bg-slate-900 !mt-6">Save Header</Button>
        </form>
      </Modal>

      {/* Block Editor Modal */}
      {blockForm && (
        <Modal isOpen={!!blockForm} onClose={() => setBlockForm(null)} title={blockForm.id ? "Edit Block" : "New Block"}>
          <form onSubmit={saveBlockForm} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-slate-600 ml-1">Category</label>
                <select value={blockForm.type} onChange={(e) => setBlockForm({...blockForm, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none">
                  {['Experience', 'Project', 'Education', 'Skills', 'Certification'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600 ml-1">Date / Duration</label>
                <input type="text" placeholder="e.g. 2024 - Present" value={blockForm.date} onChange={(e) => setBlockForm({...blockForm, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600 ml-1">Title & Company</label>
              <input type="text" placeholder="e.g. Instructional Designer | Acme Corp" value={blockForm.title} onChange={(e) => setBlockForm({...blockForm, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none" required />
            </div>
            
            {/* Dynamic Bullets */}
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="text-sm font-bold text-slate-600">Bullet Points</label>
                <button type="button" onClick={() => setBlockForm({...blockForm, bullets: [...(blockForm.bullets||[]), '']})} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg">+ Add Bullet</button>
              </div>
              <div className="space-y-2">
                {(blockForm.bullets || []).map((bullet, i) => (
                  <div key={i} className="flex gap-2">
                    <textarea rows="2" value={bullet} onChange={(e) => { const newB = [...blockForm.bullets]; newB[i] = e.target.value; setBlockForm({...blockForm, bullets: newB}); }} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium outline-none resize-none" />
                    <button type="button" onClick={() => { const newB = blockForm.bullets.filter((_, idx) => idx !== i); setBlockForm({...blockForm, bullets: newB}); }} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl"><X size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full !bg-emerald-600 !mt-6">Save Block</Button>
          </form>
        </Modal>
      )}

    </div>
  );
}
