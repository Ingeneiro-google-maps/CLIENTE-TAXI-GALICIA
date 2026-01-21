import React from 'react';

const Watermark: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-20 opacity-15 select-none transform rotate-[-30deg] scale-150">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="text-2xl md:text-4xl font-black text-white whitespace-nowrap uppercase tracking-widest border-2 border-white/50 p-2 rounded-lg">
            DEMOSTRACION desarrollado por el Ing.Orlando Galdamez
          </div>
        ))}
      </div>
    </div>
  );
};

export default Watermark;