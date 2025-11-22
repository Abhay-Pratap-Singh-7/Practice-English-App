import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassCard: React.FC<Props> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        backdrop-blur-md 
        bg-white/5 
        border border-white/10 
        rounded-2xl 
        shadow-lg 
        transition-all 
        duration-300 
        ${onClick ? 'cursor-pointer hover:bg-white/10 hover:scale-[1.02] active:scale-95' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;