'use client';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

const Skeleton = ({ className = '', width, height }: SkeletonProps) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
    />
  );
};

// Predefined skeleton components
export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-md p-6 ${className}`}>
    <Skeleton height={20} className="mb-4" />
    <Skeleton height={200} className="mb-4" />
    <Skeleton height={16} width="60%" />
  </div>
);

export const SkeletonChart = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-md p-6 ${className}`}>
    <Skeleton height={20} width="40%" className="mb-6" />
    <Skeleton height={300} />
  </div>
);

export const SkeletonTable = ({ 
  rows = 5, 
  cols = 4, 
  className = '' 
}: { 
  rows?: number; 
  cols?: number; 
  className?: string; 
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden ${className}`}>
    {/* Header */}
    <div className="border-b border-gray-200 bg-gray-50 p-4">
      <div className="flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={16} width="20%" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} height={16} width="20%" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonLine = ({ 
  width = '100%', 
  height = 16, 
  className = '' 
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) => (
  <Skeleton width={width} height={height} className={className} />
);

export default Skeleton;
