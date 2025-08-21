'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HourPoint } from '@/lib/types';
import { formatPopulation, generateHourLabels, getChartColors } from '@/lib/utils';

export interface HourlyLineProps {
  series: any[] | undefined | null;  // 🔧 백엔드 데이터 구조에 맞게 any로 변경
  title?: string;
  height?: number;
  color?: string;
  chartType?: 'hourly' | 'weekly'; // 🔧 추가: 차트 타입 구분
}

const HourlyLine = ({ 
  series, 
  title = '시간대별 인구 현황', 
  height = 300,
  color,
  chartType = 'hourly' // 🔧 추가: 기본값은 hourly
}: HourlyLineProps) => {
  const colors = getChartColors();
  const lineColor = color || colors.primary;

  // 🔧 디버깅: series 데이터 로그 추가
  console.log('🔍 HourlyLine 디버깅:');
  console.log('Raw series data:', series);
  console.log('Series type:', typeof series);
  console.log('Series is array:', Array.isArray(series));
  console.log('Series length:', series?.length);
  console.log('Chart type:', chartType); // 🔧 추가: 차트 타입 로그

  // 🔧 수정: series 유효성 검사를 맨 위로 이동
  if (!series || !Array.isArray(series) || series.length === 0) {
    console.log('❌ Series 데이터가 비어있음');
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  // 🔧 디버깅: 각 데이터 포인트 검사
  console.log('각 데이터 포인트 검사:');
  series.forEach((point, index) => {
    console.log(`Point ${index}:`, point);
    console.log(`  - hour: ${point?.hour} (type: ${typeof point?.hour})`);
    console.log(`  - total: ${point?.total} (type: ${typeof point?.total})`);
    console.log(`  - value: ${point?.value} (type: ${typeof point?.value})`);
    console.log(`  - hourLabel: ${point?.hourLabel} (type: ${typeof point?.hourLabel})`);
    console.log(`  - valid: ${point && typeof point.hour === 'number' && (typeof point.total === 'number' || typeof point.value === 'number')}`);
  });

  // 🔧 수정: 차트 타입에 따른 데이터 변환
  const chartData = series
    .filter(point => {
      // hour 필드와 total 또는 value 필드가 있는지 확인
      const hasHour = point && typeof point.hour === 'number';
      const hasValue = typeof point.total === 'number' || typeof point.value === 'number';
      const isValid = hasHour && hasValue;
      
      if (!isValid) {
        console.log('❌ 필터링된 포인트:', point);
      }
      return isValid;
    })
    .map(point => {
      // 🔧 수정: 차트 타입에 따른 라벨 처리
      let labelValue: string;
      
      if (chartType === 'weekly' && point.hourLabel) {
        // 주간 차트의 경우 전달받은 hourLabel(요일명) 사용
        labelValue = point.hourLabel;
        console.log(`📅 Weekly label: ${labelValue} for hour: ${point.hour}`);
      } else if (point.hourLabel && chartType === 'hourly') {
        // 일간 차트에서 기존 hourLabel이 있으면 사용
        labelValue = point.hourLabel;
      } else {
        // 없으면 시간 형식으로 생성 (일간 차트용)
        labelValue = `${point.hour.toString().padStart(2, '0')}:00`;
      }
      
      return {
        hour: point.hour,
        hourLabel: labelValue,
        value: point.total || point.value
      };
    });

  console.log('✅ 필터링 후 chartData:', chartData);
  console.log('✅ Chart labels:', chartData.map(item => item.hourLabel));
  console.log('ChartData length:', chartData.length);

  // 🔧 추가: 변환된 데이터가 비어있는 경우 처리
  if (chartData.length === 0) {
    console.log('❌ 필터링 후 데이터가 비어있음');
    return (
      <div className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500">유효한 데이터가 없습니다.</p>
        {/* 🔧 디버깅: 개발 환경에서 원본 데이터 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-red-600">
            <p>원본 데이터: {series.length}개</p>
            <p>첫 번째 포인트: {JSON.stringify(series[0])}</p>
            <p>첫 번째 포인트 total: {series[0]?.total}</p>
            <p>첫 번째 포인트 value: {series[0]?.value}</p>
          </div>
        )}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {label}
          </p>
          <p className="text-sm text-gray-600">
            인구수: <span className="font-semibold">{formatPopulation(payload[0].value)}명</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="hourLabel"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => formatPopulation(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HourlyLine;
