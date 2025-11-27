import React from 'react';
import { ChartData } from './ChartUtils';

interface UserRegistrationChartProps {
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
  chartType: 'line' | 'bar';
}

const UserRegistrationChart: React.FC<UserRegistrationChartProps> = ({
  chartData,
  dateFilter,
  stats,
  formatDate,
  getRegistrationYAxisLabels,
  chartType
}) => {
  return (
    <div>
      <div className="h-64 flex items-center justify-center bg-muted rounded-lg relative border pt-16">
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
            
            {/* Render based on chart type */}
            {chartType === 'line' ? (
              // Line Chart
              <>
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
                    <g key={index} className="group cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="currentColor"
                        className="text-green-600 cursor-pointer hover:r-8 transition-all"
                      />
                      {/* Hover Tooltip */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        {(() => {
                          const labelWidth = data.label.length * 6 + 20;
                          const valueWidth = `${data.registrations} pendaftar`.length * 6 + 20;
                          const tooltipWidth = Math.max(labelWidth, valueWidth, 100);
                          const tooltipX = x < 200 ? x + 5 : x - tooltipWidth - 5;
                          
                          return (
                            <>
                              <rect 
                                x={tooltipX} 
                                y={y - 30} 
                                width={tooltipWidth} 
                                height="50" 
                                rx="6"
                                className="fill-background stroke-border"
                                strokeWidth="1"
                              />
                              <text x={tooltipX + 10} y={y - 14} className="text-xs fill-foreground font-medium">
                                {data.label}
                              </text>
                              <text x={tooltipX + 10} y={y + 4} className="text-sm fill-green-600 font-bold">
                                {data.registrations} pendaftar
                              </text>
                            </>
                          );
                        })()}
                      </g>
                    </g>
                  );
                })}
              </>
            ) : (
              // Bar Chart
              chartData.map((data, index) => {
                const x = 40 + (index * (340 / (chartData.length - 1)));
                const maxY = Math.max(...getRegistrationYAxisLabels());
                const barHeight = (data.registrations / maxY) * 180;
                const barWidth = 340 / chartData.length - 4;
                const y = 220 - barHeight;
                
                return (
                  <g key={index} className="group cursor-pointer">
                    {/* Bar Rectangle */}
                    <rect
                      x={x - barWidth/2}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="currentColor"
                      className="text-green-600 hover:text-green-600/80 cursor-pointer transition-all"
                      rx="4"
                      ry="4"
                    />
                    
                    {/* Hover Tooltip */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {(() => {
                        const labelWidth = data.label.length * 6 + 20;
                        const valueWidth = `${data.registrations} pendaftar`.length * 6 + 20;
                        const tooltipWidth = Math.max(labelWidth, valueWidth, 100);
                        const tooltipX = x < 200 ? x + 5 : x - tooltipWidth - 5;
                        
                        return (
                          <>
                            <rect 
                              x={tooltipX} 
                              y={y - 30} 
                              width={tooltipWidth} 
                              height="50" 
                              rx="6"
                              className="fill-background stroke-border"
                              strokeWidth="1"
                            />
                            <text x={tooltipX + 10} y={y - 14} className="text-xs fill-foreground font-medium">
                              {data.label}
                            </text>
                            <text x={tooltipX + 10} y={y + 4} className="text-sm fill-green-600 font-bold">
                              {data.registrations} pendaftar
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  </g>
                );
              })
            )}
            
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
  );
};

export default UserRegistrationChart;
