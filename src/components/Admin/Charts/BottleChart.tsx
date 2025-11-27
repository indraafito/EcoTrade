import React from 'react';
import { ChartData } from './ChartUtils';

interface BottleChartProps {
  chartData: ChartData[];
  dateFilter: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
  formatDate: (date: Date) => string;
  getBottleYAxisLabels: () => number[];
  chartType: 'bar' | 'line';
}

const BottleChart: React.FC<BottleChartProps> = ({
  chartData,
  dateFilter,
  formatDate,
  getBottleYAxisLabels,
  chartType
}) => {
  return (
    <div>
      <div className="h-64 flex items-center justify-center bg-muted rounded-lg relative border pt-16">
        {/* SVG Chart - Same structure as RegistrationChart */}
        <div className="absolute inset-0 p-4">
          <svg className="w-full h-full" viewBox="0 0 400 240">
            {/* Grid Lines - Match Y-axis Labels */}
            {getBottleYAxisLabels().map((label, index) => {
              const maxY = Math.max(...getBottleYAxisLabels());
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
            {chartType === 'bar' ? (
              // Bar Chart
              chartData.map((data, index) => {
                const x = 40 + (index * (340 / (chartData.length - 1)));
                const maxY = Math.max(...getBottleYAxisLabels());
                const barHeight = (data.bottles / maxY) * 180;
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
                      className="text-primary hover:text-primary/80 cursor-pointer transition-all"
                      rx="4"
                      ry="4"
                    />
                    
                    {/* Hover Tooltip */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {/* Calculate text width */}
                      {(() => {
                        const labelWidth = data.label.length * 6 + 20; // Estimate text width
                        const valueWidth = `${data.bottles} botol`.length * 6 + 20;
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
                            <text x={tooltipX + 10} y={y + 4} className="text-sm fill-primary font-bold">
                              {data.bottles} botol
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  </g>
                );
              })
            ) : (
              // Line Chart
              <>
                {/* Data Line */}
                <polyline
                  points={chartData.map((data, index) => {
                    const x = 40 + (index * (340 / (chartData.length - 1)));
                    const maxY = Math.max(...getBottleYAxisLabels());
                    const y = 220 - ((data.bottles / maxY) * 180);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary"
                />
                
                {/* Data Points */}
                {chartData.map((data, index) => {
                  const x = 40 + (index * (340 / (chartData.length - 1)));
                  const maxY = Math.max(...getBottleYAxisLabels());
                  const y = 220 - ((data.bottles / maxY) * 180);
                  return (
                    <g key={index} className="group cursor-pointer">
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="currentColor"
                        className="text-primary cursor-pointer hover:r-8 transition-all"
                      />
                      {/* Hover Tooltip */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        {(() => {
                          const labelWidth = data.label.length * 6 + 20; // Estimate text width
                          const valueWidth = `${data.bottles} botol`.length * 6 + 20;
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
                              <text x={tooltipX + 10} y={y + 4} className="text-sm fill-primary font-bold">
                                {data.bottles} botol
                              </text>
                            </>
                          );
                        })()}
                      </g>
                    </g>
                  );
                })}
              </>
            )}
            
            {/* Y-axis Labels - Same as RegistrationChart */}
            {getBottleYAxisLabels().map((label, index) => {
              const maxY = Math.max(...getBottleYAxisLabels());
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
            
            {/* X-axis Labels - Same as RegistrationChart */}
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
          
          {/* Total Display - Same as RegistrationChart */}
          <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-2">
            <p className="text-sm font-medium">{Math.max(...chartData.map(d => d.bottles))}</p>
            <p className="text-xs text-muted-foreground">Total Botol</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottleChart;
