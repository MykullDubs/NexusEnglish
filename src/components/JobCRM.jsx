// ─────────────────────────────────────────────────────────────────────────────
// JobCRM.jsx  —  relevant excerpt showing only the changed sections.
//
// WHAT CHANGED vs the previous version:
//   1. fetchLeads() now accepts a `pageNum` arg and sends it to the API.
//   2. New state: `pagination` and `failedSources`.
//   3. "Load More" button appears below the Inbox column when hasNextPage=true.
//   4. A collapsible FailedSourcesBadge shows broken boards after each fetch.
//   5. The fetch button on the Pipeline card now resets to page 1 on fresh
//      fetches and appends on "Load More" calls — so duplicate-URL dedup
//      still works across pages.
//
// All other sections (Kanban cards, Resume Engine, Bouncer, Modals) are
// unchanged — keep them exactly as they are in your current file.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, Clock, Globe, ExternalLink, Trash2, CheckCircle,
  Pencil, Download, Loader2, X, Check, ArrowRight, FileText, Circle,
  GripVertical, Copy, UserCircle, Palette, Eye, EyeOff, PlusCircle, Edit3,
  AlignLeft, Shield, Settings, AlertTriangle, ChevronDown, ChevronUp,
  RefreshCw
} from 'lucide-react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query,
  orderBy, Timestamp, updateDoc, writeBatch, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Modal, Button } from './SharedUI';
import { motion, Reorder } from 'framer-motion';

// ── (Keep your existing STAGES, INITIAL_HEADER, INITIAL_BOUNCER,
//    INITIAL_RESUME_BLOCKS, RESUME_DOC, BOUNCER_DOC constants here) ──

// ---------------------------------------------------------------------------
// New helper: collapsible failed-sources badge
// ---------------------------------------------------------------------------
function FailedSourcesBadge({ failedSources }) {
  const [open, setOpen] = useState(false);
  if (!failedSources || failedSources.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold">
          <AlertTriangle size={14} className="text-amber-500" />
          {failedSources.length} source{failedSources.length > 1 ? 's' : ''} unreachable this run
        </div>
        {open
          ? <ChevronUp  size={14} className="text-amber-500" />
          : <ChevronDown size={14} className="text-amber-500" />
        }
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-amber-100">
          {failedSources.map((fs, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-[11px]">
              <span className="font-bold text-amber-900">{fs.source}</span>
              <span className="text-amber-600 font-mono text-right truncate max-w-[55%]">{fs.reason}</span>
            </div>
          ))}
          <p className="text-[10px] text-amber-500 font-medium pt-1">
            These boards may have changed their API or the company slug may be wrong.
            Check the server logs for details.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function JobCRM({ user, showToast, askConfirm }) {

  // ── (Keep all your existing state declarations) ──

  // NEW pagination & diagnostics state
  const [pagination,    setPagination]    = useState(null);   // { page, totalMatches, totalPages, hasNextPage }
  const [failedSources, setFailedSources] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── (Keep all your existing useEffects for clock, Firestore, resume/bouncer load) ──

  // ── UPDATED: fetchLeads now handles both fresh fetch and "Load More" ──────
  const fetchLeads = useCallback(async (pageNum = 1) => {
    if (!user) return;
    const isFirstPage = pageNum === 1;
    if (isFirstPage) setIsFetching(true);
    else             setIsLoadingMore(true);

    try {
      const res = await fetch('/api/fetchJobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIX: body must be a JSON string, NOT passing raw object
        body: JSON.stringify({
          days:      fetchDays,
          page:      pageNum,
          vip:       bouncer.vip,
          banned:    bouncer.banned,
          locations: bouncer.locations,
        }),
      });

      const data = await res.json();

      if (data.error) {
        showToast(data.error, 'error');
        return;
      }

      // Store pagination metadata and failed sources for UI display
      if (data.pagination) setPagination(data.pagination);
      if (data.failedSources) setFailedSources(data.failedSources);

      if (data.jobs && data.jobs.length > 0) {
        // Dedup against everything already in the pipeline
        const existingUrls = new Set(jobs.map(j => j.url).filter(Boolean));
        const newJobs = data.jobs.filter(j => j.url && !existingUrls.has(j.url));

        if (newJobs.length === 0) {
          showToast(
            isFirstPage
              ? "No new leads — you're all caught up!"
              : 'All jobs on this page are already in your pipeline.',
            'success'
          );
          return;
        }

        const batch = writeBatch(db);
        newJobs.forEach(job => {
          const ref = doc(collection(db, `users/${user.uid}/jobs`));
          batch.set(ref, { ...job, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        });
        await batch.commit();

        showToast(
          `${isFirstPage ? 'Fetched' : 'Loaded'} ${newJobs.length} new lead${newJobs.length > 1 ? 's' : ''}!`,
          'success'
        );
      } else {
        showToast('No leads found for this page.', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error fetching leads.', 'error');
    } finally {
      if (isFirstPage) setIsFetching(false);
      else             setIsLoadingMore(false);
    }
  }, [user, jobs, fetchDays, bouncer, showToast]);

  // ── (Keep all your other handlers: handleSaveJob, moveJob, deleteJob, etc.) ──

  // ── UPDATED: Kanban view — add FailedSourcesBadge + Load More button ──────
  //
  // In your existing JSX where you render {activeView === 'kanban' && (...)},
  // add these two blocks:
  //
  // (A) Just BELOW the <StageDots> component and ABOVE the kanban scroll div:
  //
  //   <FailedSourcesBadge failedSources={failedSources} />
  //
  // (B) Just AFTER the closing </div> of the kanban scroll container:
  //
  //   {pagination?.hasNextPage && (
  //     <div className="flex flex-col items-center gap-1 pt-2 pb-4">
  //       <button
  //         onClick={() => fetchLeads(pagination.page + 1)}
  //         disabled={isLoadingMore}
  //         className="flex items-center gap-2 px-6 py-3 bg-white border border-indigo-200 text-indigo-600 font-bold text-sm rounded-2xl shadow-sm hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50"
  //       >
  //         {isLoadingMore
  //           ? <><Loader2 size={16} className="animate-spin" /> Loading page {pagination.page + 1}…</>
  //           : <><RefreshCw size={16} /> Load More  ({pagination.totalMatches - (pagination.page * pagination.pageSize)} remaining)</>
  //         }
  //       </button>
  //       <p className="text-[10px] font-medium text-slate-400">
  //         Page {pagination.page} of {pagination.totalPages} · {pagination.totalMatches} total matches
  //       </p>
  //     </div>
  //   )}

  // ── The full JSX below is a self-contained drop-in for the kanban section ──

  const showEmptyState = !isLoadingJobs && jobs.length === 0 && activeView === 'kanban';

  // Return the full component JSX — only the kanban section shown here for brevity.
  // Replace your existing kanban section with this block:
  const KanbanSection = (
    <>
      {showEmptyState && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-[28px]"
        >
          <div className="p-4 bg-indigo-50 text-indigo-400 rounded-full">
            <Briefcase size={32} />
          </div>
          <div>
            <p className="font-black text-slate-800 text-lg">Your pipeline is empty</p>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Hit{' '}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-xs">
                <Download size={11} /> fetch
              </span>{' '}
              to pull fresh leads, or{' '}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 text-white rounded-md font-bold text-xs">
                <Plus size={11} /> add
              </span>{' '}
              one manually.
            </p>
          </div>
        </motion.div>
      )}

      {!showEmptyState && <StageDots total={STAGES.length} active={activeStageIdx} />}

      {/* Failed sources diagnostic — collapsible, non-intrusive */}
      <FailedSourcesBadge failedSources={failedSources} />

      {/* Kanban scroll container */}
      <div
        className="flex-1 overflow-x-auto flex gap-4 pb-4 snap-x snap-mandatory scrollbar-hide no-print"
        onScroll={handleKanbanScroll}
      >
        {STAGES.map((stage) => {
          const stageJobs = jobs.filter(j => j.stage === stage.id);
          const isInbox   = stage.id === 'inbox';

          return (
            <div
              key={stage.id}
              className={`w-[85%] shrink-0 snap-center snap-always bg-slate-50/50 border ${stage.border} rounded-[28px] flex flex-col max-h-[65vh]`}
            >
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 rounded-t-[28px]">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className="text-sm font-bold text-slate-400">{stageJobs.length}</span>
                </div>
              </div>

              <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
                {isLoadingJobs && <><CardSkeleton /><CardSkeleton /></>}

                {!isLoadingJobs && stageJobs.length === 0 && (
                  <div className="text-center text-sm font-medium text-slate-400 italic mt-6">No jobs here</div>
                )}

                {!isLoadingJobs && isInbox && stageJobs.length > 0 && (
                  <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    ← Swipe Left to Trash &nbsp;|&nbsp; Swipe Right to Keep →
                  </div>
                )}

                {/* ── Render job cards here exactly as in your current code ── */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More — only shown when more pages exist */}
      {pagination?.hasNextPage && (
        <div className="flex flex-col items-center gap-1.5 pt-1 pb-4">
          <button
            onClick={() => fetchLeads(pagination.page + 1)}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-indigo-200 text-indigo-600 font-bold text-sm rounded-2xl shadow-sm hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoadingMore ? (
              <><Loader2 size={16} className="animate-spin" /> Loading page {pagination.page + 1}…</>
            ) : (
              <>
                <RefreshCw size={16} />
                Load More
                <span className="font-normal text-indigo-400 text-xs">
                  ({pagination.totalMatches - pagination.page * pagination.pageSize} remaining)
                </span>
              </>
            )}
          </button>
          <p className="text-[10px] font-medium text-slate-400">
            Page {pagination.page} of {pagination.totalPages} · {pagination.totalMatches} total matches
          </p>
        </div>
      )}
    </>
  );


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
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">{job.company}</h3>
                            <button onClick={(e) => { e.stopPropagation(); openEdit(job); }} className="text-slate-300 hover:text-indigo-600 p-1"><Pencil size={14} /></button>
                          </div>
                          <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5 mb-3"><Globe size={14} className="text-slate-400" /> {job.role || "Role not specified"}</div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.salary && <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-lg">{job.salary}</div>}
                            {job.notes && job.notes.startsWith("Src:") && (
                              <div className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 inline-block px-2 py-1 rounded-lg truncate max-w-full">
                                {job.notes.split('|')[1]?.trim() || "Details inside"}
                              </div>
                            )}
                          </div>

                          {isInbox ? (
                            <div className="flex w-full gap-2 mt-3 pt-3 border-t border-slate-50">
                              <button onClick={(e) => { e.stopPropagation(); fastDiscardLead(job.id); }} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><X size={16} /> Discard</button>
                              <button onClick={(e) => { e.stopPropagation(); moveJob(job.id, job.stage); }} className="flex-1 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><Check size={16} /> Keep</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div className="flex gap-2">
                                {job.url && <a href={job.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-colors"><ExternalLink size={14} /></a>}
                                <button onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14} /></button>
                              </div>
                              {STAGES.findIndex(s => s.id === job.stage) < STAGES.length - 1 ? (
                                <button onClick={(e) => { e.stopPropagation(); moveJob(job.id, job.stage); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-all">Advance <ArrowRight size={14} /></button>
                              ) : (
                                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-xl"><CheckCircle size={14} /> Complete</div>
                              )}
                            </div>
                          )}
                        </>
                      );

                      if (isInbox) return <motion.div key={job.id} onClick={() => setViewingJob(job)} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8} onDragEnd={(e, info) => { if (info.offset.x < -100) fastDiscardLead(job.id); else if (info.offset.x > 100) moveJob(job.id, job.stage); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors group relative cursor-pointer active:cursor-grabbing touch-pan-y">{cardContent}</motion.div>;
                      return <div key={job.id} onClick={() => setViewingJob(job)} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors group relative cursor-pointer">{cardContent}</div>;
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
                  <div className="pt-1 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 touch-none"><GripVertical size={20} /></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{block.type}</div>
                        <div className={`font-bold ${block.active ? 'text-slate-900' : 'text-slate-500'}`}>{block.title}</div>
                        {block.date && <div className="text-xs text-slate-400 font-medium mt-0.5">{block.date}</div>}
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 rounded-full p-1 border border-slate-100">
                        <button onClick={() => toggleBlockVisibility(block.id)} className={`p-1.5 rounded-full ${block.active ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-200'}`}>{block.active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
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

      {/* ── BOUNCER VIEW ────────────────────────────────────────────────────── */}
      {activeView === 'bouncer' && (
        <div className="flex-1 overflow-y-auto space-y-6 no-print scrollbar-hide pb-12 animate-in fade-in slide-in-from-bottom-4 px-1">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-6">
            
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-emerald-600 ml-1 flex items-center gap-2 mb-2">
                <CheckCircle size={14}/> VIP Keywords (Include)
              </label>
              <textarea 
                rows="4" 
                value={bouncer.vip} 
                onChange={(e) => setBouncer({...bouncer, vip: e.target.value})} 
                className="w-full bg-white border border-emerald-100 rounded-2xl px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-relaxed"
              />
              <p className="text-[10px] font-medium text-slate-400 ml-1 mt-1">Comma-separated. A job MUST have one of these in the title to enter your inbox.</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-rose-600 ml-1 flex items-center gap-2 mb-2">
                <X size={14}/> Banned Keywords (Reject)
              </label>
              <textarea 
                rows="3" 
                value={bouncer.banned} 
                onChange={(e) => setBouncer({...bouncer, banned: e.target.value})} 
                className="w-full bg-white border border-rose-100 rounded-2xl px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:ring-2 focus:ring-rose-500/20 resize-none leading-relaxed"
              />
              <p className="text-[10px] font-medium text-slate-400 ml-1 mt-1">Jobs with these words in the title will be instantly deleted.</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-600 ml-1 flex items-center gap-2 mb-2">
                <Globe size={14}/> Banned Locations
              </label>
              <textarea 
                rows="2" 
                value={bouncer.locations} 
                onChange={(e) => setBouncer({...bouncer, locations: e.target.value})} 
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 font-medium outline-none focus:ring-2 focus:ring-slate-500/20 resize-none leading-relaxed"
              />
            </div>

            <Button onClick={handleSaveBouncer} disabled={isSavingBouncer} className="w-full !bg-slate-900 !mt-2">
              {isSavingBouncer ? <Loader2 size={18} className="animate-spin mx-auto"/> : "Save Filtering Rules"}
            </Button>
          </div>
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      
      {/* Job Details View Modal */}
      <Modal isOpen={!!viewingJob} onClose={() => setViewingJob(null)} title="Job Details">
        {viewingJob && (
          <div className="space-y-6 px-1">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{viewingJob.company}</h2>
              <p className="text-lg font-medium text-indigo-600 mt-1 flex items-center gap-2"><Briefcase size={18}/> {viewingJob.role}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl border border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> {STAGES.find(s => s.id === viewingJob.stage)?.label || "Saved"}
              </div>
              {viewingJob.salary && <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-100">{viewingJob.salary}</div>}
            </div>
            {viewingJob.notes && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-2"><AlignLeft size={14} /> Notes & Details</div>
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{viewingJob.notes}</p>
              </div>
            )}
            <div className="pt-4 flex gap-3">
              {viewingJob.url && <a href={viewingJob.url} target="_blank" rel="noreferrer" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">Open Job Post <ExternalLink size={16}/></a>}
              <button onClick={() => { setViewingJob(null); openEdit(viewingJob); }} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Edit</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Job Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Job" : "Add Job"}>
        <form onSubmit={handleSaveJob} className="space-y-4">
          <div><label className="text-sm font-bold text-slate-600 ml-1">Company</label><input type="text" placeholder="e.g. Coursera" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Role</label><input type="text" placeholder="e.g. Instructional Designer" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-bold text-slate-600 ml-1">Salary Range</label><input type="text" placeholder="e.g. $70k - $90k" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div><div><label className="text-sm font-bold text-slate-600 ml-1">Stage</label><select value={form.stage} onChange={(e) => setForm({...form, stage: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20">{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Job Post URL</label><input type="url" placeholder="https://..." value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-indigo-600 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" /></div>
          <div><label className="text-sm font-bold text-slate-600 ml-1">Notes</label><textarea rows="4" placeholder="Paste the job description, contacts, etc." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 resize-none" /></div>
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
            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="text-sm font-bold text-slate-600">Bullet Points</label>
                <button type="button" onClick={() => setBlockForm({...blockForm, bullets: [...(blockForm.bullets||[]), '']})} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg">+ Add</button>
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
