import React, { useState } from 'react';
import { FileText, CheckCircle, Circle, Download, LayoutTemplate } from 'lucide-react';
import { motion } from 'framer-motion';

// The Master Database of all your experience
const INITIAL_BLOCKS = [
  { id: 'skills', type: 'Skills', title: 'Technical Stack & Languages', date: '', bullets: ['Bilingual: Native English & Fluent Spanish', 'Web Development: React, Next.js, JavaScript, HTML, CSS, Firebase', 'Instructional Design: Curriculum Development, Storyboarding, e-Learning Modules'], active: true },
  { id: 'exp1', type: 'Experience', title: 'English Teacher | TeachCast', date: 'Oct 2025 - Present', bullets: ['Deliver dynamic, high-engagement ESL instruction to remote students.', 'Utilize digital classroom tools and phonetic mechanics to improve pronunciation.'], active: true },
  { id: 'exp2', type: 'Experience', title: 'English Instructor | Carrot Global', date: 'Sept 2024 - Present', bullets: ['Facilitate adult language acquisition through tailored remote learning sessions.', 'Assess student proficiency and adapt curriculum to meet specific career objectives.'], active: true },
  { id: 'proj1', type: 'Project', title: 'KitchenComm | Lead Developer & Instructional Designer', date: '2025 - 2026', bullets: ['Engineered a bilingual (English/Spanish) e-learning platform for quick-service restaurant environments using React and Firebase.', 'Designed full curriculum storyboards and UI mockups focused on health, safety, and sanitation.'], active: true },
  { id: 'proj2', type: 'Project', title: 'Phonetic Mechanics Lab | Creator', date: '2026', bullets: ['Developed web-based simulators to visualize and animate IPA mouth movements, assisting ESL learners with difficult phonemes like the English /ɹ/.'], active: true },
  { id: 'edu1', type: 'Education', title: 'M.Ed. Instructional Technology and Design | Western Governors University', date: 'Expected July 2026', bullets: [], active: true },
  { id: 'edu2', type: 'Education', title: 'B.A. Spanish Language and Literature | Valdosta State University', date: 'May 2024', bullets: [], active: true },
  { id: 'cert1', type: 'Certification', title: '120-Hour TESOL Certificate', date: '2015', bullets: [], active: true }
];

export default function ResumeRemixer() {
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS);

  const toggleBlock = (id) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const handleExportPDF = () => {
    // We inject a temporary print stylesheet to hide the app UI and only show the resume
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-md mx-auto pb-12 h-full flex flex-col relative">
      
      {/* Header */}
      <div className="bg-white border border-indigo-100 p-6 rounded-[28px] shadow-sm flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full"><FileText size={32} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Remixer</h2>
            <div className="text-slate-500 font-medium text-xs mt-0.5">Toggle blocks & export</div>
          </div>
        </div>
        <button onClick={handleExportPDF} className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-colors active:scale-95 shadow-sm flex items-center gap-2">
          <Download size={20} /> <span className="font-bold text-sm pr-1">PDF</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 no-print scrollbar-hide pb-24">
        {/* The Toggle Dashboard */}
        {['Skills', 'Experience', 'Project', 'Education', 'Certification'].map(type => {
          const typeBlocks = blocks.filter(b => b.type === type);
          if (typeBlocks.length === 0) return null;
          
          return (
            <div key={type} className="bg-slate-50/50 p-4 rounded-[28px] border border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">{type}</h3>
              <div className="space-y-2">
                {typeBlocks.map(block => (
                  <div 
                    key={block.id} 
                    onClick={() => toggleBlock(block.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${block.active ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-slate-200 opacity-60 grayscale'}`}
                  >
                    <div className={`mt-0.5 ${block.active ? 'text-indigo-600' : 'text-slate-300'}`}>
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

      {/* --- HIDDEN PRINT AREA --- */}
      {/* This only becomes visible to the browser's PDF engine when you tap the Download button */}
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

    </div>
  );
}
