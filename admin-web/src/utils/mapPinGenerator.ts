/**
 * 3D Google Maps Style Pin Generator for Leaflet
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

  // Category Color Palette with 3D gradients and rim highlights
  let primaryColor = '#0F8B5A'; // Emerald (Clinic)
  let secondaryColor = '#065F46';
  let highlightColor = '#34D399';
  let ringColor = 'rgba(16, 185, 129, 0.4)';

  switch (category) {
    case 'HOSPITAL':
      primaryColor = '#DC2626'; // Vivid Crimson Red
      secondaryColor = '#991B1B';
      highlightColor = '#F87171';
      ringColor = 'rgba(220, 38, 38, 0.45)';
      break;
    case 'PHARMACY':
      primaryColor = '#2563EB'; // Royal Blue
      secondaryColor = '#1E40AF';
      highlightColor = '#60A5FA';
      ringColor = 'rgba(37, 99, 235, 0.45)';
      break;
    case 'OFFICE':
      primaryColor = '#7C3AED'; // Purple / Diagnostic
      secondaryColor = '#5B21B6';
      highlightColor = '#A78BFA';
      ringColor = 'rgba(124, 58, 237, 0.45)';
      break;
    case 'MR':
      primaryColor = '#D97706'; // Amber / Gold for Field MR
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

  // Category Vector Icon (Crisp SVG)
  let iconSvg = '';

  if (category === 'HOSPITAL') {
    // 3D Hospital Building with Medical Cross
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
    // 3D Storefront / Chemist Shop with Awning & Plus Symbol
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
    // Field Agent Navigation Compass / Location Pin
    iconSvg = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" fill="#FEF3C7" fill-opacity="0.8"/>
      </svg>
    `;
  } else if (category === 'OFFICE') {
    // Diagnostic Lab / Office Building
    iconSvg = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="#EDE9FE" fill-opacity="0.6"/>
        <line x1="9" y1="22" x2="9" y2="22.01"/>
        <line x1="15" y1="22" x2="15" y2="22.01"/>
        <line x1="8" y1="6" x2="10" y2="6"/>
        <line x1="14" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="11" x2="10" y2="11"/>
        <line x1="14" y1="11" x2="16" y2="11"/>
      </svg>
    `;
  } else {
    // Stethoscope & Doctor Practice
    iconSvg = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${secondaryColor}" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4v5a7 7 0 0 0 14 0V4" stroke-width="2.2"/>
        <circle cx="4" cy="4" r="1.5" fill="${secondaryColor}"/>
        <circle cx="18" cy="4" r="1.5" fill="${secondaryColor}"/>
        <path d="M11 16v3a3 3 0 0 0 6 0v-1" stroke-width="2.2"/>
        <circle cx="17" cy="18" r="2" fill="#0F8B5A"/>
      </svg>
    `;
  }

  const scale = isSelected ? 1.2 : 1.0;
  const pinWidth = Math.round(40 * scale);
  const pinHeight = Math.round(52 * scale);
  const zIndex = isSelected ? 1000 : 100;

  return `
    <div class="custom-3d-pin-wrapper" style="position:relative;width:${pinWidth}px;height:${pinHeight}px;cursor:pointer;z-index:${zIndex};transition:transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      ${
        isSelected
          ? `<div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:${pinWidth + 14}px;height:${pinWidth + 14}px;border-radius:50%;background:${ringColor};animation:pinPulse 1.8s infinite;pointer-events:none;"></div>`
          : ''
      }
      ${
        isNew
          ? `<div style="position:absolute;top:-5px;right:-5px;background:#10B981;color:#FFFFFF;border:2px solid #FFFFFF;border-radius:10px;font-size:8px;font-weight:900;padding:1px 5px;line-height:1.2;box-shadow:0 2px 6px rgba(0,0,0,0.35);animation:whatsappBadgePulse 1.6s infinite ease-in-out;z-index:1002;letter-spacing:0.4px;pointer-events:none;">NEW</div>`
          : ''
      }
      <!-- 3D Ground Shadow -->
      <div style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:${Math.round(pinWidth * 0.72)}px;height:8px;background:radial-gradient(ellipse at center, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0) 75%);border-radius:50%;pointer-events:none;"></div>

      <!-- 3D Google Maps Pin Head & Stem -->
      <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 5px 8px rgba(0,0,0,0.38));overflow:visible;">
        <defs>
          <!-- 3D Gradient for Pin Body -->
          <linearGradient id="pinGrad_${category}_${isSelected ? 's' : 'n'}" x1="6" y1="2" x2="35" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="${highlightColor}" />
            <stop offset="35%" stop-color="${primaryColor}" />
            <stop offset="100%" stop-color="${secondaryColor}" />
          </linearGradient>

          <!-- 3D Inset Shadow for Center White Disc -->
          <radialGradient id="discGrad_${category}" cx="50%" cy="40%" r="50%">
            <stop offset="65%" stop-color="#FFFFFF" />
            <stop offset="100%" stop-color="#E2E8F0" />
          </radialGradient>
        </defs>

        <!-- Teardrop Pin Shape with Specular Highlight and Pointy Tip -->
        <path
          d="M20 0.5C9.0 0.5 0 9.5 0 20.5C0 32.0 15.5 46.5 19.0 50.8C19.5 51.4 20.5 51.4 21.0 50.8C24.5 46.5 40 32.0 40 20.5C40 9.5 31.0 0.5 20 0.5Z"
          fill="url(#pinGrad_${category}_${isSelected ? 's' : 'n'})"
          stroke="#FFFFFF"
          stroke-width="1.8"
          stroke-linejoin="round"
        />

        <!-- Top 3D Specular Highlight Arc -->
        <path
          d="M8 12C11 6 16 3.8 22 3.8"
          stroke="rgba(255, 255, 255, 0.7)"
          stroke-width="2.2"
          stroke-linecap="round"
        />

        <!-- Center Badge Disc -->
        <circle cx="20" cy="20.5" r="13" fill="url(#discGrad_${category})" stroke="${primaryColor}" stroke-width="1.4" />
      </svg>

      <!-- Center Icon Container -->
      <div style="position:absolute;top:${Math.round(11 * scale)}px;left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;pointer-events:none;">
        ${iconSvg}
      </div>
    </div>
  `;
}
