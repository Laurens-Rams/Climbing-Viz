import React from "react";
import "./GlassIcons.css";

export interface GlassIconsItem {
  icon: React.ReactElement;
  label: string;
  onClick?: () => void;
  customClass?: string;
  isActive?: boolean;
  isDisabled?: boolean;
}

export interface GlassIconsProps {
  items: GlassIconsItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const GlassIcons: React.FC<GlassIconsProps> = ({ 
  items, 
  className = "",
  orientation = 'horizontal'
}) => {
  return (
    <div className={`icon-btns ${orientation} ${className}`}>
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          className={`icon-btn ${item.customClass || ""} ${item.isActive ? 'active' : ''} ${item.isDisabled ? 'disabled' : ''}`}
          aria-label={item.label}
          onClick={item.onClick}
          disabled={item.isDisabled}
        >
          <span className="icon-btn__front">
            <span className="icon-btn__icon" aria-hidden="true">
              {item.icon}
            </span>
          </span>
          <span className="icon-btn__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default GlassIcons;
