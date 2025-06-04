import React from 'react';
import { cn } from '../../utils/cn';
import './tabs.css';

// TODO: Paste ReactBits Tabs TypeScript code here
// Replace the default styling with our glassy theme classes

interface TabsProps {
  className?: string;
  children?: React.ReactNode;
  // TODO: Add other props from ReactBits component
}

const Tabs: React.FC<TabsProps> = ({ 
  className, 
  children,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        // Base glassy styles
        'bg-black/85 border border-teal-light/15 rounded-xl',
        'backdrop-blur-lg shadow-xl',
        'transition-all duration-200',
        // Hover effects
        'hover:border-teal-light/25 hover:shadow-2xl',
        // Custom className
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Tabs;
export type { TabsProps };
