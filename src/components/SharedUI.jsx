import React from 'react';
import { Minus, Plus, X } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-6 py-3.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide";
  const variants = {
    primary: "bg-slate-800 text-white shadow-md shadow-slate-200/50 hover:bg-slate-900 hover:shadow-lg",
    child: "bg-indigo-600 text-white shadow-md shadow-indigo-200/50 hover:bg-indigo-700 hover:shadow-lg",
    pet: "bg-amber-600 text-white shadow-md shadow-amber-200/50 hover:bg-amber-700 hover:shadow-lg",
    secondary: "bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
    danger: "bg-red-100 text-red-900 hover:bg-red-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    google: "bg-slate-100 text-slate-800 hover:bg-slate-200 w-full",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    activeOutline: "bg-indigo-100 text-indigo-900 font-bold"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

export const RollerInput = ({ value, onChange, step = 1, min = 0, max = 999, unit = '', label = '' }) => {
  const handleIncrement = () => { const current = parseFloat(value) || 0; if (current + step <= max) onChange((current + step).toFixed(step < 1 ? 1 : 0)); };
  const handleDecrement = () => { const current = parseFloat(value) || 0; if (current - step >= min) onChange((current - step).toFixed(step < 1 ? 1 : 0)); };
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>}
      <div className="flex items-center bg-slate-100 rounded-full overflow-hidden">
        <button type="button" onClick={handleDecrement} className="w-14 h-14 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors touch-manipulation"><Minus size={20} /></button>
        <div className="flex-1 flex items-center justify-center relative h-14"><input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-full text-center bg-transparent font-bold text-xl text-slate-900 outline-none appearance-none m-0 p-0 z-10" placeholder="0" />{unit && <span className="absolute right-4 text-xs text-slate-500 font-medium pointer-events-none">{unit}</span>}</div>
        <button type="button" onClick={handleIncrement} className="w-14 h-14 flex items-center justify-center text-slate-700 active:bg-slate-200 transition-colors touch-manipulation"><Plus size={20} /></button>
      </div>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"><div className="p-6 flex justify-between items-center bg-white"><h3 className="font-bold text-xl text-slate-900">{title}</h3><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={24} /></button></div><div className="p-6 pt-0 overflow-y-auto flex-1">{children}</div></div>
    </div>
  );
};

export const SimpleLineChart = ({ data, colorHex, unit, title }) => {
  if (!data || data.length < 2) return (<div className="bg-slate-50 p-6 rounded-[28px] text-center"><h4 className="text-slate-600 font-medium mb-2">{title}</h4><div className="text-slate-400 text-sm">Not enough data points yet</div></div>);
  const values = data.map(d => parseFloat(d.value)); const minVal = Math.min(...values) * 0.95; const maxVal = Math.max(...values) * 1.05; const range = maxVal - minVal || 1;
  const dates = data.map(d => new Date(d.date).getTime()); const minDate = Math.min(...dates); const maxDate = Math.max(...dates); const dateRange = maxDate - minDate || 1;
  const width = 100; const height = 50; const padding = 2;
  const points = data.map(d => { const x = ((new Date(d.date).getTime() - minDate) / dateRange) * (width - padding * 2) + padding; const y = height - (((parseFloat(d.value) - minVal) / range) * (height - padding * 2) + padding); return `${x},${y}`; }).join(' ');
  return (
    <div className="bg-slate-50 p-5 rounded-[28px]">
      <div className="flex justify-between items-end mb-4"><h4 className="font-bold text-slate-800">{title}</h4><span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">Last: {data[data.length-1].value}{unit}</span></div>
      <div className="relative aspect-[2/1] w-full"><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible"><line x1="0" y1="0" x2={width} y2="0" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2" /><line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2"/><line x1="0" y1={height} x2={width} y2={height} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2"/><polyline fill="none" stroke={colorHex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />{data.map((d, i) => { const x = ((new Date(d.date).getTime() - minDate) / dateRange) * (width - padding * 2) + padding; const y = height - (((parseFloat(d.value) - minVal) / range) * (height - padding * 2) + padding); return <circle key={i} cx={x} cy={y} r="2" fill="white" stroke={colorHex} strokeWidth="1.5" />; })}</svg></div>
      <div className="flex justify-between text-xs text-slate-400 font-medium mt-3"><span>{new Date(minDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span><span>{new Date(maxDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span></div>
    </div>
  );
};
