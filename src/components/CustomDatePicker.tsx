import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { parseDateKey } from "../lib/dates";

interface CustomDatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CustomDatePicker({ label, value, onChange }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial value or use today
  const initialDate = value ? parseDateKey(value) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    // Format to YYYY-MM-DD
    const yyyy = currentYear;
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Generate blank spaces for the first row
  const blanks = Array.from({ length: firstDayOfMonth }).map((_, i) => (
    <div key={`blank-${i}`} className="w-8 h-8" />
  ));

  // Generate days
  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const isSelected = value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if it's today
    const today = new Date();
    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

    return (
      <button
        type="button"
        key={`day-${day}`}
        onClick={() => handleSelectDate(day)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium transition ${
          isSelected
            ? "bg-ink text-on-ink shadow-md"
            : isToday
            ? "liquid-input text-ink ring-1 ring-ink"
            : "text-body hover:bg-[color:var(--surface-pressed)] hover:text-ink"
        }`}
      >
        {day}
      </button>
    );
  });

  const displayDateStr = value 
    ? new Date(parseDateKey(value)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : "Select date";

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-mute block mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-2xl liquid-input px-4 py-3 text-[13px] font-medium text-ink outline-none focus:bg-[color:var(--canvas-softer)] transition hover:bg-[color:var(--surface-pressed)]"
      >
        <span>{displayDateStr}</span>
        <CalendarIcon className="w-4 h-4 text-mute" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
          <div className="p-5 liquid-glass rounded-[24px] shadow-2xl w-full max-w-[320px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-display font-bold text-ink pl-1">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={handlePrevMonth}
                className="grid w-8 h-8 place-items-center rounded-full text-mute hover:text-ink hover:liquid-input transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                type="button" 
                onClick={handleNextMonth}
                className="grid w-8 h-8 place-items-center rounded-full text-mute hover:text-ink hover:liquid-input transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => (
              <div key={d} className="w-8 text-center text-[10px] font-bold uppercase text-mute">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {blanks}
            {days}
          </div>
          
          <button 
            type="button"
            className="w-full mt-4 py-3 rounded-xl liquid-input text-ink font-bold text-[13px] hover:bg-[color:var(--surface-pressed)] transition"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
