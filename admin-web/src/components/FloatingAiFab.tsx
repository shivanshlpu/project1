import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingAiFabProps {
  onOpenAi: () => void;
}

const STORAGE_KEY = 'ahtri_ai_fab_position';
const DEFAULT_BOTTOM = 24;
const DEFAULT_RIGHT = 24;
const FAB_SIZE = 52;

export const FloatingAiFab: React.FC<FloatingAiFabProps> = ({ onOpenAi }) => {
  const [position, setPosition] = useState<{ bottom: number; right: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.bottom === 'number' &&
          typeof parsed.right === 'number' &&
          parsed.bottom >= 10 &&
          parsed.right >= 10
        ) {
          return {
            bottom: Math.min(parsed.bottom, window.innerHeight - FAB_SIZE - 20),
            right: Math.min(parsed.right, window.innerWidth - FAB_SIZE - 20),
          };
        }
      }
    } catch {}
    return { bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT };
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    startRight: DEFAULT_RIGHT,
    startBottom: DEFAULT_BOTTOM,
    hasMoved: false,
  });

  // Handle window resize so FAB stays on screen
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        bottom: Math.min(Math.max(16, prev.bottom), window.innerHeight - FAB_SIZE - 16),
        right: Math.min(Math.max(16, prev.right), window.innerWidth - FAB_SIZE - 16),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left mouse button
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: position.right,
      startBottom: position.bottom,
      hasMoved: false,
    };
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragRef.current.hasMoved = true;
      }
      if (dragRef.current.hasMoved) {
        const newRight = Math.min(
          Math.max(16, dragRef.current.startRight - deltaX),
          window.innerWidth - FAB_SIZE - 16
        );
        const newBottom = Math.min(
          Math.max(16, dragRef.current.startBottom - deltaY),
          window.innerHeight - FAB_SIZE - 16
        );
        setPosition({ bottom: newBottom, right: newRight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (dragRef.current.hasMoved) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              bottom: position.bottom,
              right: position.right,
            })
          );
        } catch {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startRight: position.right,
      startBottom: position.bottom,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragRef.current.startX;
    const deltaY = touch.clientY - dragRef.current.startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.hasMoved = true;
    }
    if (dragRef.current.hasMoved) {
      const newRight = Math.min(
        Math.max(16, dragRef.current.startRight - deltaX),
        window.innerWidth - FAB_SIZE - 16
      );
      const newBottom = Math.min(
        Math.max(16, dragRef.current.startBottom - deltaY),
        window.innerHeight - FAB_SIZE - 16
      );
      setPosition({ bottom: newBottom, right: newRight });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragRef.current.hasMoved) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            bottom: position.bottom,
            right: position.right,
          })
        );
      } catch {}
    } else {
      onOpenAi();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpenAi();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Reset to default bottom-right
    setPosition({ bottom: DEFAULT_BOTTOM, right: DEFAULT_RIGHT });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
        zIndex: 850,
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* Tooltip on hover (appears to the left of the circle button) */}
        {isHovered && !isDragging && (
          <div
            style={{
              position: 'absolute',
              right: `${FAB_SIZE + 10}px`,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(15, 39, 74, 0.95)',
              color: '#FFFFFF',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'aiFabTooltipIn 0.15s ease-out',
            }}
          >
            <Sparkles size={13} color="#38BDF8" />
            <span>Ask Aura AI</span>
            <span
              style={{
                fontSize: '9.5px',
                background: '#0F8B5A',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '1px 5px',
                fontWeight: 800,
              }}
            >
              AURA
            </span>
          </div>
        )}

        {/* Circular Floating Action Button (Circle Option Type) */}
        <button
          type="button"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="floating-ai-fab-circle"
          style={{
            width: `${FAB_SIZE}px`,
            height: `${FAB_SIZE}px`,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1A3C6E 0%, #0F274A 100%)',
            color: '#FFFFFF',
            border: isHovered
              ? '2px solid #38BDF8'
              : '2px solid rgba(56, 189, 248, 0.45)',
            boxShadow: isHovered
              ? '0 8px 24px rgba(56, 189, 248, 0.4), 0 0 12px rgba(56, 189, 248, 0.3)'
              : '0 6px 18px rgba(15, 39, 74, 0.35)',
            cursor: isDragging ? 'grabbing' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: isDragging
              ? 'none'
              : 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease, border-color 0.18s ease',
            transform: isHovered && !isDragging ? 'scale(1.08)' : 'scale(1)',
            position: 'relative',
          }}
          title="Ask Aura AI • Drag to reposition • Double-click to reset"
          aria-label="Ask Aura AI Copilot"
        >
          {/* Sparkles Icon */}
          <Sparkles
            size={22}
            color="#38BDF8"
            style={{
              filter: isHovered ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))' : 'none',
              transition: 'filter 0.2s ease',
            }}
          />

          {/* Online Aura Indicator Dot */}
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10B981',
              border: '2px solid #0F274A',
              boxShadow: '0 0 6px #10B981',
            }}
          />
        </button>
      </div>
    </div>
  );
};
