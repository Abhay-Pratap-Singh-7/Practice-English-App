import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const GradientBackground: React.FC<Props> = ({ children, className = '' }) => {
  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-slate-950 text-white ${className}`}>
      {/* Gradient Blobs */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-purple-900/40 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-900/30 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[40%] left-[30%] h-[400px] w-[400px] rounded-full bg-blue-900/30 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Glass Overlay Pattern (optional noise texture could go here) */}
      
      {/* Content Wrapper */}
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default GradientBackground;