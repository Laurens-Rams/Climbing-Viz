import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { Icon } from "@chakra-ui/react";
import { Plus, Minus } from "lucide-react";

import "./ElasticSlider.css";

const MAX_OVERFLOW = 20;

interface ElasticSliderProps {
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onChange?: (value: number) => void;
  showValue?: boolean;
  trackColor?: string;
  rangeColor?: string;
  iconColor?: string;
  compact?: boolean;
  powerColor?: string;
}

const ElasticSlider: React.FC<ElasticSliderProps> = ({
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = "",
  isStepped = false,
  stepSize = 1,
  leftIcon = <Icon as={Minus} />,
  rightIcon = <Icon as={Plus} />,
  onChange,
  showValue = true,
  trackColor = "rgba(128, 128, 128, 0.4)",
  rangeColor = "rgb(34, 211, 238)",
  iconColor = "#888",
  compact = false,
  powerColor,
}) => {
  const [value, setValue] = useState<number>(defaultValue);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<"left" | "middle" | "right">("middle");
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);
  
  // Refs for throttling
  const lastCallRef = useRef<number>(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);
  
  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  // Throttled onChange callback
  const throttledOnChange = useCallback((newValue: number) => {
    if (!onChange) return;
    
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    // Store the pending value
    pendingValueRef.current = newValue;
    
    if (timeSinceLastCall >= 16) { // ~60fps throttle
      onChange(newValue);
      lastCallRef.current = now;
      pendingValueRef.current = null;
    } else {
      // Clear existing timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      
      // Set new timeout to ensure final value is sent
      throttleTimeoutRef.current = setTimeout(() => {
        if (pendingValueRef.current !== null && onChange) {
          onChange(pendingValueRef.current);
          lastCallRef.current = Date.now();
          pendingValueRef.current = null;
        }
      }, 16 - timeSinceLastCall);
    }
  }, [onChange]);

  useMotionValueEvent(clientX, "change", (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect();
      let newValue: number;
      if (latest < left) {
        setRegion("left");
        newValue = left - latest;
      } else if (latest > right) {
        setRegion("right");
        newValue = latest - right;
      } else {
        setRegion("middle");
        newValue = 0;
      }
      overflow.jump(decay(newValue, MAX_OVERFLOW));
    }
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect();
      let newValue =
        startingValue +
        ((e.clientX - left) / width) * (maxValue - startingValue);
      if (isStepped) {
        newValue = Math.round(newValue / stepSize) * stepSize;
      }
      newValue = Math.min(Math.max(newValue, startingValue), maxValue);
      setValue(newValue);
      throttledOnChange(newValue);
      clientX.jump(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { 
      type: "spring", 
      bounce: 0.2,
      stiffness: 200,
      damping: 20
    });
    
    // Ensure final value is sent
    if (pendingValueRef.current !== null && onChange) {
      onChange(pendingValueRef.current);
      pendingValueRef.current = null;
    }
  };

  const getRangePercentage = (): number => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;
    return ((value - startingValue) / totalRange) * 100;
  };

  return (
    <div className={`slider-container ${className} ${compact ? 'compact' : ''}`}>
      <motion.div
        onHoverStart={() => animate(scale, 1.05)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => animate(scale, 1.05)}
        onTouchEnd={() => animate(scale, 1)}
        style={{
          scale,
          opacity: useTransform(scale, [1, 1.05], [0.9, 1]),
        }}
        className="slider-wrapper"
      >
        <motion.div
          animate={{
            scale: region === "left" ? [1, 1.1, 1] : 1,
            transition: { duration: 0.15 },
          }}
          style={{
            x: useTransform(() =>
              region === "left" ? -overflow.get() / scale.get() : 0
            ),
            color: iconColor,
          }}
        >
          {leftIcon}
        </motion.div>

        <div
          ref={sliderRef}
          className="slider-root"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <motion.div
            style={{
              scaleX: useTransform(() => {
                if (sliderRef.current) {
                  const { width } = sliderRef.current.getBoundingClientRect();
                  return 1 + overflow.get() / width;
                }
                return 1;
              }),
              scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]),
              transformOrigin: useTransform(() => {
                if (sliderRef.current) {
                  const { left, width } =
                    sliderRef.current.getBoundingClientRect();
                  return clientX.get() < left + width / 2 ? "right" : "left";
                }
                return "center";
              }),
              height: useTransform(scale, [1, 1.2], [5.2, 10.4]),
              marginTop: useTransform(scale, [1, 1.2], [0, -2.6]),
              marginBottom: useTransform(scale, [1, 1.2], [0, -2.6]),
            }}
            className="slider-track-wrapper"
          >
            <div 
              className="slider-track"
              style={{ backgroundColor: trackColor }}
            >
              <div
                className="slider-range"
                style={{ 
                  width: `${getRangePercentage()}%`,
                  backgroundColor: powerColor || rangeColor
                }}
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{
            scale: region === "right" ? [1, 1.1, 1] : 1,
            transition: { duration: 0.15 },
          }}
          style={{
            x: useTransform(() =>
              region === "right" ? overflow.get() / scale.get() : 0
            ),
            color: iconColor,
          }}
        >
          {rightIcon}
        </motion.div>
      </motion.div>
    </div>
  );
};

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }
  const entry = value / max;
  const sigmoid = 1.5 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export default ElasticSlider;
