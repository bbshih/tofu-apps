import { useState, useEffect } from "react";
import {
  generateQuarterlyWeekends,
  generateNextWeekends,
  generateThisWeekend,
} from "@seacalendar/shared";

export interface DatePatternPresetsProps {
  onDatesSelected: (dates: string[]) => void;
}

interface PatternHistory {
  label: string;
  description: string;
  usedAt: number;
}

const RECENT_PATTERNS_KEY = "recentDatePatterns";

export default function DatePatternPresets({
  onDatesSelected,
}: DatePatternPresetsProps) {
  const [recentPatterns, setRecentPatterns] = useState<PatternHistory[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const presets = [
    {
      label: "Quarterly Weekends",
      description: "Fri-Sun for current + next 2 months",
      generator: generateQuarterlyWeekends,
    },
    {
      label: "Next 4 Weekends",
      description: "Fri-Sun for the next 4 weekends",
      generator: () => generateNextWeekends(4, true),
    },
    {
      label: "This Weekend",
      description: "Fri-Sun for the upcoming weekend",
      generator: () => generateThisWeekend(true),
    },
  ];

  useEffect(() => {
    // Load recent patterns from localStorage
    const stored = localStorage.getItem(RECENT_PATTERNS_KEY);
    if (stored) {
      try {
        const patterns = JSON.parse(stored);
        setRecentPatterns(patterns);
      } catch (error) {
        console.error("Failed to load recent patterns:", error);
      }
    }
  }, []);

  const saveToHistory = (label: string, description: string) => {
    const now = Date.now();
    const pattern: PatternHistory = {
      label,
      description,
      usedAt: now,
    };

    // Remove duplicates by label and add to front
    const filtered = recentPatterns.filter((p) => p.label !== label);
    const updated = [pattern, ...filtered].slice(0, 3); // Keep only last 3

    setRecentPatterns(updated);
    localStorage.setItem(RECENT_PATTERNS_KEY, JSON.stringify(updated));
  };

  const handlePresetClick = (
    label: string,
    description: string,
    generator: () => string[],
  ) => {
    // If clicking the same pattern, deselect it
    if (selectedPattern === label) {
      setSelectedPattern(null);
      onDatesSelected([]);
      return;
    }

    // Otherwise, select the pattern and generate dates
    const dates = generator();
    setSelectedPattern(label);
    saveToHistory(label, description);
    onDatesSelected(dates);
  };

  return (
    <div className="space-y-4">
      {/* Recently Used Patterns */}
      {recentPatterns.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-coral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-coral-800">
              Recently Used
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {recentPatterns.map((pattern) => {
              const preset = presets.find((p) => p.label === pattern.label);
              if (!preset) return null;
              const isSelected = selectedPattern === pattern.label;
              return (
                <button
                  key={pattern.label}
                  onClick={() =>
                    handlePresetClick(
                      pattern.label,
                      pattern.description,
                      preset.generator,
                    )
                  }
                  className={`group relative p-3 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md cursor-pointer ${
                    isSelected
                      ? "border-coral-500 bg-coral-200 shadow-md"
                      : "border-coral-200 bg-coral-50 hover:border-coral-400 hover:bg-coral-100"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div
                      className={`text-sm font-medium ${
                        isSelected
                          ? "text-coral-900"
                          : "text-coral-800 group-hover:text-coral-900"
                      }`}
                    >
                      {pattern.label}
                    </div>
                    <div className="text-xs text-gray-600">
                      {pattern.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All Patterns */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-ocean-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="font-semibold text-ocean-800">Quick Patterns</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const isSelected = selectedPattern === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() =>
                  handlePresetClick(
                    preset.label,
                    preset.description,
                    preset.generator,
                  )
                }
                className={`group relative p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md cursor-pointer ${
                  isSelected
                    ? "border-ocean-500 bg-ocean-100 shadow-md"
                    : "border-ocean-200 bg-white hover:border-ocean-400 hover:bg-ocean-50"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div
                    className={`font-medium ${
                      isSelected
                        ? "text-ocean-900"
                        : "text-ocean-800 group-hover:text-ocean-900"
                    }`}
                  >
                    {preset.label}
                  </div>
                  <div className="text-xs text-gray-600">
                    {preset.description}
                  </div>
                </div>

                {/* Wave animation on hover */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ocean-400 to-coral-400 transform transition-transform duration-300 origin-left rounded-full ${
                    isSelected
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
