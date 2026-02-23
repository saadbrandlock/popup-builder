import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';

export interface DeviceToggleProps {
  value: 'desktop' | 'mobile';
  onChange: (device: 'desktop' | 'mobile') => void;
}

/**
 * Reusable Desktop / Mobile toggle pill.
 * Used wherever a viewport selector is needed (ReviewScreen, DesignReviewPanel, etc.)
 */
export const DeviceToggle: React.FC<DeviceToggleProps> = ({ value, onChange }) => (
  <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
    <button
      type="button"
      onClick={() => onChange('desktop')}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
        value === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Monitor size={13} />
      Desktop
    </button>
    <button
      type="button"
      onClick={() => onChange('mobile')}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
        value === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Smartphone size={13} />
      Mobile
    </button>
  </div>
);
