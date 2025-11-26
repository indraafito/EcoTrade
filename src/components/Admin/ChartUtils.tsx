// Chart data interface
export interface ChartData {
  label: string;
  registrations: number;
  bottles: number;
  date?: Date;
}

// Y-axis calculation functions
export const getRegistrationYAxisLabels = (chartData: ChartData[]) => {
  const maxRegistrations = Math.max(...chartData.map(d => d.registrations));
  const maxValue = Math.max(maxRegistrations, 1);
  
  // Round up to nearest nice number based on registration data only
  let roundedMax: number;
  let step: number;
  let labels: number[];
  
  if (maxValue <= 1) {
    roundedMax = 1;
    step = 1;
    labels = [0, 1];
  } else if (maxValue <= 2) {
    roundedMax = 2;
    step = 1;
    labels = [0, 1, 2];
  } else if (maxValue <= 3) {
    roundedMax = 3;
    step = 1;
    labels = [0, 1, 2, 3];
  } else if (maxValue <= 4) {
    roundedMax = 4;
    step = 1;
    labels = [0, 1, 2, 3, 4];
  } else if (maxValue <= 5) {
    roundedMax = 5;
    step = 1;
    labels = [0, 1, 2, 3, 4, 5];
  } else if (maxValue <= 10) {
    roundedMax = Math.ceil(maxValue / 2) * 2; // Round to nearest 2
    step = 2;
    labels = [0, 2, 4, 6, 8, 10].filter(label => label <= roundedMax);
  } else if (maxValue <= 20) {
    roundedMax = Math.ceil(maxValue / 4) * 4; // Round to nearest 4
    step = 4;
    labels = [0, 4, 8, 12, 16, 20].filter(label => label <= roundedMax);
  } else if (maxValue <= 30) {
    roundedMax = Math.ceil(maxValue / 5) * 5; // Round to nearest 5
    step = 5;
    labels = [0, 5, 10, 15, 20, 25, 30].filter(label => label <= roundedMax);
  } else if (maxValue <= 40) {
    roundedMax = Math.ceil(maxValue / 8) * 8; // Round to nearest 8
    step = 8;
    labels = [0, 8, 16, 24, 32, 40].filter(label => label <= roundedMax);
  } else if (maxValue <= 50) {
    roundedMax = Math.ceil(maxValue / 10) * 10; // Round to nearest 10
    step = 10;
    labels = [0, 10, 20, 30, 40, 50].filter(label => label <= roundedMax);
  } else if (maxValue <= 75) {
    roundedMax = Math.ceil(maxValue / 15) * 15; // Round to nearest 15
    step = 15;
    labels = [0, 15, 30, 45, 60, 75].filter(label => label <= roundedMax);
  } else if (maxValue <= 100) {
    roundedMax = Math.ceil(maxValue / 20) * 20; // Round to nearest 20
    step = 20;
    labels = [0, 20, 40, 60, 80, 100].filter(label => label <= roundedMax);
  } else {
    // For very large numbers, round up to nearest 50/100
    roundedMax = Math.ceil(maxValue / 50) * 50;
    step = Math.ceil(roundedMax / 5);
    labels = [0, step, step * 2, step * 3, step * 4, step * 5];
  }
  
  return labels;
};

export const getBottleYAxisLabels = (chartData: ChartData[]) => {
  const maxBottles = Math.max(...chartData.map(d => d.bottles));
  const maxValue = Math.max(maxBottles, 1);
  
  // Round up to nearest nice number based on bottle data only
  let roundedMax: number;
  let step: number;
  let labels: number[];
  
  if (maxValue <= 1) {
    roundedMax = 1;
    step = 1;
    labels = [0, 1];
  } else if (maxValue <= 2) {
    roundedMax = 2;
    step = 1;
    labels = [0, 1, 2];
  } else if (maxValue <= 3) {
    roundedMax = 3;
    step = 1;
    labels = [0, 1, 2, 3];
  } else if (maxValue <= 4) {
    roundedMax = 4;
    step = 1;
    labels = [0, 1, 2, 3, 4];
  } else if (maxValue <= 5) {
    roundedMax = 5;
    step = 1;
    labels = [0, 1, 2, 3, 4, 5];
  } else if (maxValue <= 10) {
    roundedMax = Math.ceil(maxValue / 2) * 2; // Round to nearest 2
    step = 2;
    labels = [0, 2, 4, 6, 8, 10].filter(label => label <= roundedMax);
  } else if (maxValue <= 20) {
    roundedMax = Math.ceil(maxValue / 4) * 4; // Round to nearest 4
    step = 4;
    labels = [0, 4, 8, 12, 16, 20].filter(label => label <= roundedMax);
  } else if (maxValue <= 30) {
    roundedMax = Math.ceil(maxValue / 5) * 5; // Round to nearest 5
    step = 5;
    labels = [0, 5, 10, 15, 20, 25, 30].filter(label => label <= roundedMax);
  } else if (maxValue <= 40) {
    roundedMax = Math.ceil(maxValue / 8) * 8; // Round to nearest 8
    step = 8;
    labels = [0, 8, 16, 24, 32, 40].filter(label => label <= roundedMax);
  } else if (maxValue <= 50) {
    roundedMax = Math.ceil(maxValue / 10) * 10; // Round to nearest 10
    step = 10;
    labels = [0, 10, 20, 30, 40, 50].filter(label => label <= roundedMax);
  } else if (maxValue <= 75) {
    roundedMax = Math.ceil(maxValue / 15) * 15; // Round to nearest 15
    step = 15;
    labels = [0, 15, 30, 45, 60, 75].filter(label => label <= roundedMax);
  } else if (maxValue <= 100) {
    roundedMax = Math.ceil(maxValue / 20) * 20; // Round to nearest 20
    step = 20;
    labels = [0, 20, 40, 60, 80, 100].filter(label => label <= roundedMax);
  } else {
    // For very large numbers, round up to nearest 50/100
    roundedMax = Math.ceil(maxValue / 50) * 50;
    step = Math.ceil(roundedMax / 5);
    labels = [0, step, step * 2, step * 3, step * 4, step * 5];
  }
  
  return labels;
};

// Date formatting utility
export const formatDate = (date: Date) => {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Chart data processing utilities
export const getDataPointsCount = (filterType: string) => {
  return filterType === 'week' ? 7 : 
         filterType === 'month' ? 30 : 
         filterType === 'year' ? 12 : 8;
};

export const getChartLabels = (filterType: string, startDate: Date, endDate: Date) => {
  if (filterType === 'day') {
    return Array.from({ length: 24 }, (_, i) => `${i}:00`);
  } else if (filterType === 'week') {
    return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  } else if (filterType === 'month') {
    return Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  } else if (filterType === 'year') {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  } else {
    // Custom range
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return formatDate(date);
    });
  }
};
