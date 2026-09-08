/**
 * 3D Google Maps Style Pin Generator for Leaflet (Mobile App)
 * Renders high-fidelity 3D teardrop map pins with ground shadows and category icons.
 * Strict: No emojis! Only vector graphics and 3D CSS lighting.
 */

export type PinCategory = 'HOSPITAL' | 'PHARMACY' | 'CLINIC' | 'OFFICE' | 'OTHER' | 'MR';

interface PinOptions {
  category: PinCategory;
  isSelected?: boolean;
  isNew?: boolean;
  label?: string;
}

export function create3DMapPinHtml(options: PinOptions): string {
  const { category, isSelected = false, isNew = false } = options;

  let primaryColor = '#0F8B5A'; // Emerald (Clinic)
  let secondaryColor = '#065F46';
  let highlightColor = '#34D399';
  let ringColor = 'rgba(16, 185, 129, 0.4)';

  switch (category) {
    case 'HOSPITAL':
      primaryColor = '#DC2626'; // Red
      secondaryColor = '#991B1B';
      highlightColor = '#F87171';
      ringColor = 'rgba(220, 38, 38, 0.45)';
      break;
    case 'PHARMACY':
      primaryColor = '#2563EB'; // Blue
      secondaryColor = '#1E40AF';
      highlightColor = '#60A5FA';
      ringColor = 'rgba(37, 99, 235, 0.45)';
      break;
    case 'OFFICE':
      primaryColor = '#7C3AED'; // Purple
      secondaryColor = '#5B21B6';
      highlightColor = '#A78BFA';
      ringColor = 'rgba(124, 58, 237, 0.45)';
      break;
    case 'MR':
      primaryColor = '#D97706'; // Amber
      secondaryColor = '#92400E';
      highlightColor = '#FBBF24';
      ringColor = 'rgba(217, 119, 6, 0.5)';
      break;
    case 'CLINIC':
    default:
      primaryColor = '#0F8B5A'; // Emerald Green
      secondaryColor = '#065F46';
      highlightColor = '#34D399';
      ringColor = 'rgba(15, 139, 90, 0.45)';
      break;
  }

  let iconSvg = '';

  if (category === 'HOSPITAL') {
    iconSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21h18" stroke-width="2.5"/>
        <path d="M5 21V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v15" stroke-width="2" fill="#FEE2E2" fill-opacity="0.6"/>
        <path d="M9 10h6" stroke="#DC2626" stroke-width="2.8"/>
        <path d="M12 7v6" stroke="#DC2626" stroke-width="2.8"/>
        <rect x="9.5" y="16" width="5" height="5" fill="${secondaryColor}" rx="0.5"/>
      </svg>
    `;
  } else if (category === 'PHARMACY') {
    iconSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l1.5-6h15L21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke-width="2" fill="#DBEAFE" fill-opacity="0.6"/>
        <path d="M3 9h18" stroke-width="2"/>
        <path d="M3 9c0 1.5 1.5 2.5 3 2.5s3-1 3-2.5c0 1.5 1.5 2.5 3 2.5s3-1 3-2.5c0 1.5 1.5 2.5 3 2.5s3-1 3-2.5" stroke-width="1.8"/>
        <path d="M12 14v4" stroke="#2563EB" stroke-width="2.6"/>
        <path d="M10 16h4" stroke="#2563EB" stroke-width="2.6"/>
      </svg>
    `;
  } else if (category === 'MR') {
    iconSvg = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" fill="#FEF3C7" fill-opacity="0.8"/>
      </svg>
    `;
  } else if (category === 'OFFICE') {
    iconSvg = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="#EDE9FE" fill-opacity="0.6"/>
        <line x1="9" y1="22" x2="9" y2="22.01"/>
        <line x1="15" y1="22" x2="15" y2="22.01"/>
        <line x1="8" y1="6" x2="10" y2="6"/>
        <line x1="14" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="11" x2="10" y2="11"/>
      </svg>
    `;
  } else {
    // Stethoscope / Medical Clinic Cross
    iconSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
        <circle cx="20" cy="10" r="2" fill="${secondaryColor}"/>
      </svg>
    `;
  }

  const pulseRing = isSelected
    ? `<div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 44px; height: 16px; border-radius: 50%; background: ${ringColor}; border: 1.5px solid ${primaryColor}; animation: ahtri-pin-pulse 1.8s infinite ease-out;"></div>`
    : '';

  return `
    <div style="position: relative; width: 46px; height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; cursor: pointer;">
      ${pulseRing}
      
      <!-- Ground 3D Drop Shadow -->
      <div style="
        position: absolute;
        bottom: 2px;
        width: 22px;
        height: 7px;
        background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0) 75%);
        border-radius: 50%;
        filter: blur(0.6px);
      "></div>

      <!-- 3D Pin Main Body -->
      <div style="
        position: relative;
        z-index: 2;
        width: 40px;
        height: 52px;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25));
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ${isSelected ? 'transform: translateY(-4px) scale(1.08);' : ''}
      ">
        <!-- Circular Head with 3D Bevel -->
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, ${highlightColor} 0%, ${primaryColor} 60%, ${secondaryColor} 100%);
          border: 1.5px solid ${highlightColor};
          box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.45), inset 0 -3px 4px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <!-- White Inset Core -->
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${iconSvg}
          </div>
        </div>

        <!-- Pointed Pin Tip (Triangle pointing downward) -->
        <div style="
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 13px solid ${secondaryColor};
          margin-top: -3px;
          position: relative;
          z-index: 1;
        "></div>
      </div>
    </div>
  `;
}
