import React, { useState } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { DayTrendPoint } from '../types/attendance';

interface InteractiveTrendChartProps {
  trendData: DayTrendPoint[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  monthName: string;
  year: number;
}

export const InteractiveTrendChart: React.FC<InteractiveTrendChartProps> = ({
  trendData,
  selectedDay,
  onSelectDay,
  monthName,
  year,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayTrendPoint | null>(null);

  const workdays = trendData.filter((p) => !p.isWeekend);
  const avgAttendance =
    workdays.length > 0
      ? Math.round((workdays.reduce((acc, p) => acc + p.attendanceRate, 0) / workdays.length) * 10) / 10
      : 0;

  const svgWidth = 840;
  const svgHeight = 180;
  const padX = 35;
  const padY = 25;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padY * 2;

  const points = trendData.map((d, index) => {
    const x = padX + (index / (trendData.length - 1)) * chartW;
    const yVal = d.isWeekend ? 0 : d.attendanceRate;
    const y = padY + chartH - (yVal / 100) * chartH;
    return { x, y, data: d };
  });

  const validPoints = points.filter((p) => !p.data.isWeekend);
  const pathD = validPoints.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD =
    validPoints.length > 0
      ? `${pathD} L ${validPoints[validPoints.length - 1].x} ${padY + chartH} L ${validPoints[0].x} ${padY + chartH} Z`
      : '';

  const activePoint = hoveredDay || trendData.find((p) => p.day === selectedDay);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
      {/* Chart Title & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tren Kehadiran Harian ({monthName} {year})
            </h3>
            <p className="text-xs text-slate-500">
              Rata-rata kehadiran: <strong className="text-slate-800 dark:text-slate-200">{avgAttendance}%</strong> • Klik tanggal untuk memilih hari
            </p>
          </div>
        </div>

        {/* Hover / Selected Day badge */}
        {activePoint && !activePoint.isWeekend && (
          <div className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activePoint.dateStr}:
            </span>
            <span className="text-emerald-600 font-bold">{activePoint.attendanceRate}% Hadir</span>
            <span className="text-amber-600">({activePoint.telat} Telat)</span>
            <span className="text-rose-600">({activePoint.izin + activePoint.sakit + activePoint.cuti + activePoint.alpha} Absen)</span>
          </div>
        )}
      </div>

      {/* SVG Line Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-44 select-none"
          style={{ minWidth: '600px' }}
        >
          <defs>
            <linearGradient id="simpleRateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference Lines */}
          {[100, 75, 50].map((v) => {
            const y = padY + chartH - (v / 100) * chartH;
            return (
              <g key={v}>
                <line
                  x1={padX}
                  y1={y}
                  x2={svgWidth - padX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="2 3"
                  className="text-slate-200 dark:text-slate-800"
                />
                <text
                  x={padX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {v}%
                </text>
              </g>
            );
          })}

          {/* Filled Area & Line */}
          {areaD && <path d={areaD} fill="url(#simpleRateGrad)" />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Day Points */}
          {points.map((p, idx) => {
            if (p.data.isWeekend) {
              return (
                <text
                  key={idx}
                  x={p.x}
                  y={padY + chartH + 14}
                  textAnchor="middle"
                  className="text-[8px] fill-slate-300 dark:fill-slate-600 font-mono"
                >
                  {p.data.day}
                </text>
              );
            }

            const isSel = p.data.day === selectedDay;
            const isHov = hoveredDay?.day === p.data.day;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDay(p.data)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => onSelectDay(p.data.day)}
              >
                {(isSel || isHov) && (
                  <line
                    x1={p.x}
                    y1={padY}
                    x2={p.x}
                    y2={padY + chartH}
                    stroke={isSel ? '#059669' : '#cbd5e1'}
                    strokeWidth="1"
                    strokeDasharray={isSel ? undefined : '2 2'}
                  />
                )}

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSel ? 5 : isHov ? 4 : 2.5}
                  fill={isSel ? '#047857' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="1"
                />

                <text
                  x={p.x}
                  y={padY + chartH + 14}
                  textAnchor="middle"
                  className={`text-[9px] font-mono ${
                    isSel ? 'fill-emerald-600 font-bold' : 'fill-slate-400'
                  }`}
                >
                  {p.data.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
