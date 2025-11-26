import React from 'react';
import { ChartData } from './ChartUtils';

interface RegistrationChartProps {
  chartData: ChartData[];
  dateFilter: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
  stats: {
    totalUsers: number;
  };
  formatDate: (date: Date) => string;
  getRegistrationYAxisLabels: () => number[];
}

const RegistrationChart: React.FC<RegistrationChartProps> = ({
  chartData,
  dateFilter,
  stats,
  formatDate,
  getRegistrationYAxisLabels
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Bottle Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Tren Botol Terkumpul</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {dateFilter.type === 'day' ? 'Per jam' :
           dateFilter.type === 'week' ? '7 hari terakhir' :
           dateFilter.type === 'month' ? '30 hari terakhir' : 
           dateFilter.type === 'year' ? 'Tahun ini' :
           `Custom: ${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`}
        </p>
        <div className="h-64 flex items-center justify-center bg-muted rounded-lg relative overflow-hidden border">
          {/* Dynamic Bar Chart */}
          <div className="absolute inset-0 p-4">
            <div className="flex items-end justify-around h-full gap-1">
              {chartData.map((data, index) => {
                const maxY = Math.max(...chartData.map(d => d.bottles));
                const heightPercent = (data.bottles / maxY) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div 
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all duration-500 hover:from-primary/80 cursor-pointer relative"
                      style={{ height: `${Math.min(heightPercent, 100)}%` }}
                    >
                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border rounded p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        <p className="font-medium">{data.label}</p>
                        <p>{data.bottles} botol</p>
                      </div>
                    </div>
                    {dateFilter.type !== 'day' && (
                      <span className="text-xs mt-1 text-muted-foreground truncate">
                        {data.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Registration Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Pendaftaran Pengguna</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {dateFilter.type === 'day' ? 'Hari ini' :
           dateFilter.type === 'week' ? '7 hari terakhir' :
           dateFilter.type === 'month' ? '30 hari terakhir' : 
           dateFilter.type === 'year' ? 'Tahun ini' :
           `Custom: ${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`}
        </p>
        <div className="h-64 flex items-center justify-center bg-muted rounded-lg relative overflow-hidden border">
          {/* Line Chart */}
          <div className="absolute inset-0 p-4">
            <svg className="w-full h-full" viewBox="0 0 400 240">
              {/* Grid Lines */}
              {getRegistrationYAxisLabels().map((label, index) => {
                const maxY = Math.max(...getRegistrationYAxisLabels());
                const y = 220 - ((label / maxY) * 180);
                return (
                  <line
                    key={index}
                    x1="40"
                    y1={y}
                    x2="380"
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-muted-foreground/30"
                  />
                );
              })}
              
              {/* Data Line */}
              <polyline
                points={chartData.map((data, index) => {
                  const x = 40 + (index * (340 / (chartData.length - 1)));
                  const maxY = Math.max(...getRegistrationYAxisLabels());
                  const y = 220 - ((data.registrations / maxY) * 180);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-green-600"
              />
              
              {/* Data Points */}
              {chartData.map((data, index) => {
                const x = 40 + (index * (340 / (chartData.length - 1)));
                const maxY = Math.max(...getRegistrationYAxisLabels());
                const y = 220 - ((data.registrations / maxY) * 180);
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="currentColor"
                      className="text-green-600 cursor-pointer hover:r-8 transition-all"
                    />
                    {/* Hover Tooltip */}
                    <foreignObject x={x - 60} y={y - 40} width="120" height="35" className="pointer-events-none">
                      <div className="bg-background border rounded p-2 text-xs opacity-0 hover:opacity-100 transition-opacity">
                        <p className="font-medium">{data.label}</p>
                        <p>{data.registrations} pendaftar</p>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
              
              {/* Y-axis Labels */}
              {getRegistrationYAxisLabels().map((label, index) => {
                const maxY = Math.max(...getRegistrationYAxisLabels());
                const y = 220 - ((label / maxY) * 180);
                return (
                  <text
                    key={index}
                    x="30"
                    y={y + 5}
                    textAnchor="end"
                    className="text-xs fill-muted-foreground"
                  >
                    {label}
                  </text>
                );
              })}
              
              {/* X-axis Labels */}
              {chartData.map((data, index) => {
                if (dateFilter.type === 'month' && index % 5 !== 0) return null;
                if (dateFilter.type === 'day' && index % 6 !== 0) return null;
                
                const x = 40 + (index * (340 / (chartData.length - 1)));
                return (
                  <text
                    key={index}
                    x={x}
                    y="235"
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {data.label}
                  </text>
                );
              })}
            </svg>
            
            {/* Total Display */}
            <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-2">
              <p className="text-sm font-medium">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Pendaftar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationChart;
