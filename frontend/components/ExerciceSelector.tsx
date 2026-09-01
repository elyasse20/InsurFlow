'use client';

import { Calendar } from 'lucide-react';

interface ExerciceSelectorProps {
  selectedExercice: number;
  onExerciceChange: (exercice: number) => void;
  availableYears?: number[];
  className?: string;
}

export default function ExerciceSelector({
  selectedExercice,
  onExerciceChange,
  availableYears,
  className = '',
}: ExerciceSelectorProps) {
  const currentYear = new Date().getFullYear();
  // Default range of years including 2026, 2025, 2024, 2023
  const defaultYears = [2026, 2025, 2024, 2023];
  const years = availableYears && availableYears.length > 0
    ? Array.from(new Set([...availableYears, ...defaultYears, currentYear])).sort((a, b) => b - a)
    : Array.from(new Set([...defaultYears, currentYear])).sort((a, b) => b - a);

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-card/80 px-3.5 py-1.5 shadow-sm backdrop-blur-sm ${className}`}>
      <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
        Exercice :
      </span>
      <select
        value={selectedExercice}
        onChange={(e) => onExerciceChange(Number(e.target.value))}
        className="bg-transparent text-sm font-bold text-primary focus:outline-none cursor-pointer pr-1"
        aria-label="Sélectionner l'exercice comptable"
      >
        {years.map((year) => (
          <option key={year} value={year} className="bg-card text-foreground font-semibold">
            Exercice {year}
          </option>
        ))}
      </select>
    </div>
  );
}
