"use client";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface MiniCalendarProps {
  year: number;
  month: number;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  onDayClick?: (date: string) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  showNav?: boolean;
}

export function MiniCalendar({
  year,
  month,
  rangeStart,
  rangeEnd,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  showNav = true,
}: MiniCalendarProps) {
  const today = todayStr();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const normStart = rangeStart && rangeEnd && rangeStart <= rangeEnd ? rangeStart : rangeEnd && rangeStart && rangeEnd <= rangeStart ? rangeEnd : rangeStart;
  const normEnd = rangeStart && rangeEnd && rangeStart <= rangeEnd ? rangeEnd : rangeEnd && rangeStart && rangeEnd <= rangeStart ? rangeStart : rangeEnd;

  return (
    <div className="w-[252px] select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        {showNav ? (
          <button
            type="button"
            onClick={onPrevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-7" />
        )}
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTH_NAMES[month]} {year}
        </span>
        {showNav ? (
          <button
            type="button"
            onClick={onNextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-7" />
        )}
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[11px] text-gray-500 dark:text-gray-500 text-center py-1 uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e${i}`} className="w-9 h-8" />;
          }

          const date = formatDate(year, month, day);
          const isT = date === today;
          const isStart = date === normStart;
          const isEnd = date === normEnd;
          const inRange = normStart && normEnd && date > normStart && date < normEnd;
          const isEdge = isStart || isEnd;
          const col = i % 7;

          let bgClass = "";
          if (inRange) {
            bgClass = "bg-blue-100 dark:bg-blue-500/15";
            if (col === 0) bgClass += " rounded-l-full";
            if (col === 6) bgClass += " rounded-r-full";
          }
          if (isStart && normEnd && normStart !== normEnd) {
            bgClass = "bg-blue-100 dark:bg-blue-500/15 rounded-l-full";
          }
          if (isEnd && normStart && normStart !== normEnd) {
            bgClass = "bg-blue-100 dark:bg-blue-500/15 rounded-r-full";
          }

          let dayClass = "w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors relative z-10 ";
          if (isEdge) {
            dayClass += "bg-blue-600 text-white font-medium";
          } else if (isT) {
            dayClass += "ring-2 ring-blue-500 text-blue-600 dark:text-blue-400 font-medium";
          } else {
            dayClass += "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5";
          }

          return (
            <div key={date} className={`flex items-center justify-center h-8 ${bgClass}`}>
              <button
                type="button"
                onClick={() => onDayClick?.(date)}
                className={dayClass}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
