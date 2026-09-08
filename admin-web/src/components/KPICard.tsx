import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subText: string;
  Icon: LucideIcon;
  trendText?: string;
  trendType?: 'positive' | 'neutral' | 'negative';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subText,
  Icon,
  trendText,
  trendType = 'positive',
}) => {
  return (
    <div className="metric-tile">
      <div className="metric-tile-header">
        <span>{title}</span>
        <Icon size={16} color="#5e6c84" />
      </div>
      <div className="metric-tile-value">{value}</div>
      <div className="metric-tile-footer">
        {trendText && (
          <span className={`trend-pill ${trendType}`}>
            {trendText}
          </span>
        )}
        <span>{subText}</span>
      </div>
    </div>
  );
};
