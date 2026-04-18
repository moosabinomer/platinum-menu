'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MenuItem } from '@/types';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

interface SpinningWheelProps {
  items: MenuItem[];
}

const ITEM_H = 52;
const VISIBLE = 5;
const CENTER_OFFSET = Math.floor(VISIBLE / 2); // 2
const WHEEL_H = ITEM_H * VISIBLE; // 260
const PAD_HEIGHT = CENTER_OFFSET * ITEM_H; // 104

export default function SpinningWheel({ items }: SpinningWheelProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startY: 0, lastY: 0, lastT: 0, vel: 0 });
  const rafRef = useRef<number>();

  const maxOffset = (items.length - 1) * ITEM_H;
  const centerIndex = Math.round(offset / ITEM_H);

  // Update track transform and item styles
  const updateWheel = useCallback((newOffset: number, snap = false) => {
    const clamped = Math.max(0, Math.min(maxOffset, newOffset));
    
    const track = trackRef.current;
    if (track) {
      track.style.transition = snap ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none';
      track.style.transform = `translateY(${-clamped}px)`;
    }
    
    setOffset(clamped);
  }, [maxOffset]);

  // Momentum animation
  const momentum = useCallback(() => {
    let vel = dragState.current.vel;
    
    const step = () => {
      vel *= 0.92; // friction
      if (Math.abs(vel) < 0.5) {
        // Snap to nearest
        const snapped = Math.round(offset / ITEM_H) * ITEM_H;
        updateWheel(snapped, true);
        return;
      }
      updateWheel(offset + vel);
      rafRef.current = requestAnimationFrame(step);
    };
    
    rafRef.current = requestAnimationFrame(step);
  }, [offset, updateWheel]);

  // Drag handlers
  const onStart = useCallback((y: number) => {
    setIsDragging(true);
    dragState.current = { startY: y, lastY: y, lastT: Date.now(), vel: 0 };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const track = trackRef.current;
    if (track) track.style.transition = 'none';
  }, []);

  const onMove = useCallback((y: number) => {
    if (!isDragging) return;
    const dy = dragState.current.lastY - y;
    dragState.current.lastY = y;
    dragState.current.lastT = Date.now();
    dragState.current.vel = dy;
    updateWheel(offset + dy);
  }, [isDragging, offset, updateWheel]);

  const onEnd = useCallback(() => {
    setIsDragging(false);
    momentum();
  }, [momentum]);

  // Wheel scroll handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    const newOffset = offset + direction * ITEM_H;
    updateWheel(newOffset, true);
  }, [offset, updateWheel]);

  // Item click - open detail
  const handleItemClick = (item: MenuItem) => {
    if (Math.abs(dragState.current.vel) > 2) return; // Don't trigger if dragging
    const event = new CustomEvent('openItemDetail', { detail: item });
    window.dispatchEvent(event);
  };

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Calculate item styles based on distance from center
  const getItemStyle = (index: number) => {
    const dist = Math.abs(index - centerIndex);
    const scale = dist === 0 ? 1 : dist === 1 ? 0.88 : dist === 2 ? 0.72 : 0.55;
    const opacity = dist === 0 ? 1 : 0.38;
    const rotX = dist === 0 ? 0 : (index < centerIndex ? -1 : 1) * dist * 18;
    const isCenter = index === centerIndex;
    
    return {
      transform: `perspective(400px) rotateX(${rotX}deg) scale(${scale})`,
      opacity,
      transformOrigin: 'center center',
      height: ITEM_H,
      zIndex: isCenter ? 10 : 5 - dist,
    };
  };

  return (
    <div className="relative mx-4 my-6">
      {/* Wheel Container */}
      <div
        ref={wrapRef}
        className="relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ 
          height: WHEEL_H, 
          backgroundColor: '#1C1917',
          touchAction: 'none',
        }}
        onWheel={handleWheel}
        onMouseDown={(e) => onStart(e.clientY)}
        onMouseMove={(e) => onMove(e.clientY)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={(e) => onStart(e.touches[0].clientY)}
        onTouchMove={(e) => { e.preventDefault(); onMove(e.touches[0].clientY); }}
        onTouchEnd={onEnd}
      >
        {/* Center Highlight */}
        <div 
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: ITEM_H,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            zIndex: 0,
          }}
        />

        {/* Top Fade */}
        <div 
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: 100,
            background: 'linear-gradient(to bottom, #1C1917 0%, rgba(28,25,23,0) 100%)',
            zIndex: 3,
          }}
        />

        {/* Bottom Fade */}
        <div 
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 100,
            background: 'linear-gradient(to top, #1C1917 0%, rgba(28,25,23,0) 100%)',
            zIndex: 3,
          }}
        />

        {/* Track */}
        <div
          ref={trackRef}
          className="absolute left-0 right-0"
          style={{
            willChange: 'transform',
            transform: 'translateY(0px)',
          }}
        >
          {/* Padding before */}
          <div style={{ height: PAD_HEIGHT }} />

          {/* Items */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                whileTap={{ scale: 0.97 }}
                className="flex items-center px-8 relative transition-opacity duration-150"
                style={getItemStyle(index)}
                onClick={() => index === centerIndex && handleItemClick(item)}
              >
                <span
                  className={`font-medium truncate flex-1 transition-all duration-200 ${
                    index === centerIndex
                      ? 'text-white text-lg font-semibold'
                      : 'text-white/50 text-base'
                  }`}
                  style={{
                    letterSpacing: '-0.1px',
                    maxWidth: 'calc(100% - 80px)',
                  }}
                >
                  {item.name}
                </span>
                <span
                  className={`ml-auto flex-shrink-0 font-normal transition-all duration-200 ${
                    index === centerIndex
                      ? 'text-sm font-medium'
                      : 'text-sm text-white/30'
                  }`}
                  style={{
                    color: index === centerIndex ? 'var(--accent, #C8473A)' : undefined,
                  }}
                >
                  {item.price ? `Rs ${item.price}` : ''}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Padding after */}
          <div style={{ height: PAD_HEIGHT }} />
        </div>
      </div>
    </div>
  );
}
