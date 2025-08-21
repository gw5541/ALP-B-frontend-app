'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AgeDistribution } from '@/lib/types';
import { 
  transformToPyramidData, 
  calculateXAxisDomain 
} from '@/lib/charts/pyramid';

export interface PyramidProps {
  data: AgeDistribution[] | undefined | null;
  title?: string;
  height?: number;
  ascending?: boolean;
}

// 안전한 formatPopulation fallback
const safeFormatPopulation = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
};

const Pyramid = ({ 
  data, 
  title = '연령대별 인구 분포', 
  height = 400,
  ascending = true
}: PyramidProps) => {
  console.log('🔺 Pyramid 컴포넌트 입력 데이터:', {
    data,
    dataLength: data?.length,
    firstItem: data?.[0]
  });

  // 1. 데이터 유효성 검사
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('❌ Pyramid: 데이터가 비어있음');
    return (
      <div 
        className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" 
        style={{ height }}
        role="img" 
        aria-label="연령대별 데이터가 없습니다"
      >
        <div className="text-center">
          <p className="text-gray-500">데이터가 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">유효한 연령대별 인구 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  // 2. 데이터 필터링 (유효한 데이터만)
  const validData = data.filter(item => 
    item && 
    item.ageGroup && 
    typeof item.male === 'number' && 
    typeof item.female === 'number' &&
    (item.male > 0 || item.female > 0)
  );

  if (validData.length === 0) {
    console.log('❌ Pyramid: 필터링 후 유효한 데이터가 없음');
    return (
      <div 
        className="w-full bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center" 
        style={{ height }}
        role="img" 
        aria-label="유효한 연령대별 데이터가 없습니다"
      >
        <div className="text-center">
          <p className="text-gray-500">유효한 데이터가 없습니다</p>
          <p className="text-xs text-gray-400 mt-1">모든 연령대의 인구가 0명입니다</p>
        </div>
      </div>
    );
  }

  // 3. 차트용 데이터 변환 (Vertical BarChart 형식)
  const chartData = validData.map(item => ({
    ageGroup: item.ageGroup,
    male: Math.abs(item.male), // 절댓값으로 변환 (표시용)
    female: item.female,
    maleOriginal: item.male, // 원본 값 (툴팁용)
    femaleOriginal: item.female
  }));

  // 정렬 처리
  if (!ascending) {
    chartData.reverse();
  }

  console.log('✅ Pyramid 최종 차트 데이터:', {
    chartData,
    chartDataLength: chartData.length,
    sampleItem: chartData[0]
  });

  // 4. 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const maleData = payload.find((p: any) => p.dataKey === 'male');
      const femaleData = payload.find((p: any) => p.dataKey === 'female');
      
      const maleValue = maleData?.value || 0;
      const femaleValue = femaleData?.value || 0;
      const total = maleValue + femaleValue;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="mt-1 space-y-1">
            <p className="text-sm">
              <span 
                className="inline-block w-3 h-3 rounded mr-2" 
                style={{ backgroundColor: '#ef4444' }}
              ></span>
              남성: {safeFormatPopulation(maleValue)}명
            </p>
            <p className="text-sm">
              <span 
                className="inline-block w-3 h-3 rounded mr-2" 
                style={{ backgroundColor: '#3b82f6' }}
              ></span>
              여성: {safeFormatPopulation(femaleValue)}명
            </p>
            <p className="text-sm font-medium border-t pt-1">
              총합: {safeFormatPopulation(total)}명
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" role="img" aria-label={`${title} 연령대별 인구 분포 차트`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={chartData}
          margin={{ top: 5, right: 30, left: 10, bottom: 15 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          {/* X축: 연령대 */}
          <XAxis 
            dataKey="ageGroup" 
            angle={-45} 
            textAnchor="end" 
            height={40}
            interval={0}
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          
          {/* Y축: 인구수 */}
          <YAxis 
            tickFormatter={(value) => safeFormatPopulation(value)}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            tick={{ fontSize: 11 }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* 남성 막대 */}
          <Bar 
            dataKey="male" 
            fill="#ef4444" 
            name="남성"
            radius={[2, 2, 0, 0]}
          />
          
          {/* 여성 막대 */}
          <Bar 
            dataKey="female" 
            fill="#3b82f6" 
            name="여성"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Pyramid;