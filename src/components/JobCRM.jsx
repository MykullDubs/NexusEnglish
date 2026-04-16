import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, Clock, Globe, Building, ArrowRight, 
  Trash2, ExternalLink, CheckCircle, Pencil
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Modal, Button } from "./SharedUI";

const STAGES = [
  { id: 'saved', label: 'Saved', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  { id: 'interview', label: 'Interviewing', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  { id: 'offer', label: 'Offer / Hired', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' }
];

export default function JobCRM({ user, showToast, askConfirm }) {
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ptTime, setPtTime] = useState("");
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ company: "", role: "", url: "", stage: "saved", notes: "", salary: "" });

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

  // Fetch Jobs
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, `users/${user.uid}/jobs`), orderBy("createdAt", "desc")), (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

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
    } catch (err) {
      showToast("Error saving job.", "error");
    }
  };

  const moveJob = async (id, currentStageIndex) => {
    if (currentStageIndex >= STAGES.length - 1) return;
    const nextStage = STAGES[currentStageIndex + 1].id;
    await updateDoc(doc(db, `users/${user.uid}/jobs`, id), { stage: nextStage, updatedAt: Timestamp.now() });
  };

  const deleteJob = (id) => {
    askConfirm("Delete Job", "Remove this application from your pipeline?", async () => {
      await deleteDoc(doc(db, `users/${user.uid}/jobs`, id));
      showToast("Job deleted.", "success");
    });
  };

  const openAdd = () => { setForm({ company: "", role: "", url: "", stage: "saved", notes: "", salary: "" }); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (job) => { setForm({ company: job.company, role: job.role, url: job.url || "", stage: job.stage, notes: job.notes || "", salary: job.salary || "" }); setEditingId(job.id); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12 h-full flex flex-col">
      
      {/* Header */}
      <div className="bg-white border border-indigo-100 p-6 rounded-[28px] shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full"><Briefcase size={32} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Job Pipeline</h2>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs mt-0.5">
              <Clock size={12} className="text-indigo-400" /> Pacific Time: <span className="font-bold text-indigo-600">{ptTime}</span>
            </div>
          </div>
        </div>
        <button onClick={openAdd} className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-colors active:scale-95 shadow-sm">
          <Plus size={24} />
        </button>
      </div>

      {/* Kanban Board (Horizontal Scroll) */}
      <div className="flex-1 overflow-x-auto flex gap-4 pb-4 snap-x snap-mandatory scrollbar-hide">
        {STAGES.map((stage, index) => {
          const stageJobs = jobs.filter(j => j.stage === stage.id);
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
                
                {stageJobs.map(job => (
                  <div key={job.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group relative">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">{job.company}</h3>
                      <button onClick={() => openEdit(job)} className="text-slate-300 hover:text-indigo-600 p-1"><Pencil size={14}/></button>
                    </div>
                    
                    <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mb-3">
                      <Globe size={14} className="text-slate-400"/> {job.role || "Role not specified"}
                    </div>

                    {job.salary && <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-lg mb-3">{job.salary}</div>}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex gap-2">
                        {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"><ExternalLink size={14}/></a>}
                        <button onClick={() => deleteJob(job.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
                      </div>
                      
                      {index < STAGES.length - 1 ? (
                        <button onClick={() => moveJob(job.id, index)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-all">
                          Advance <ArrowRight size={14}/>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-xl"><CheckCircle size={14}/> Complete</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Job Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Job" : "Add Job"}>
        <form onSubmit={handleSaveJob} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-600 ml-1">Company</label>
            <input type="text" placeholder="e.g. Coursera, Duolingo" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 ml-1">Role</label>
            <input type="text" placeholder="e.g. Instructional Designer, ESL Teacher" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-slate-600 ml-1">Salary Range</label>
              <input type="text" placeholder="e.g. $70k - $90k" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-600 ml-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({...form, stage: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1">
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 ml-1">Job Post URL</label>
            <input type="url" placeholder="https://..." value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-indigo-600 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 ml-1">Notes</label>
            <textarea rows="2" placeholder="Remote requirements, contacts, etc." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all mt-1 resize-none" />
          </div>
          <Button type="submit" className="w-full !mt-6 !bg-indigo-600" disabled={!form.company.trim()}>
            {editingId ? "Update Job" : "Save Job"}
          </Button>
        </form>
      </Modal>

    </div>
  );
}
