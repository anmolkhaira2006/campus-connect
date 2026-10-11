import { useState } from 'react';

export default function TicketFlip() {
  const [isFlipped, setIsFlipped] = useState(false);

  const ceoImg = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800";
  const coFounderImg = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800";

  return (
    <div className="w-full relative [perspective:1200px] group max-w-[360px] mx-auto h-[520px]">
      <div className={`relative w-full h-full transition-transform duration-[900ms] ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* Front of Card - CEO */}
        <div className="w-full h-full absolute inset-0 rounded-3xl bg-white border border-outline-variant shadow-2xl overflow-hidden [backface-visibility:hidden] flex flex-col cursor-pointer" onClick={() => setIsFlipped(true)}>
          <div className="h-2 w-full bg-primary shrink-0" />
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center gap-4 h-full">
            
            <div className="w-full flex items-center justify-between flex-wrap gap-2">
              <div className="px-3 py-1 rounded-full bg-white-container-low border border-outline-variant text-on-surface-variant font-headline text-xs font-bold">
                LEADERSHIP
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-black font-headline text-xs font-bold backdrop-blur-sm">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                VERIFIED
              </div>
            </div>

            <div className="text-center pt-2">
              <h3 className="font-headline text-2xl sm:text-3xl text-on-surface font-extrabold leading-tight">
                Alex Sterling
              </h3>
              <p className="text-primary font-bold mt-1 tracking-wide">CHIEF EXECUTIVE OFFICER</p>
            </div>

            {/* Profile Image Area */}
            <div className="bg-white-container-low border border-outline-variant/70 rounded-2xl p-4 flex flex-col items-center justify-center relative w-full flex-grow mt-2">
              
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full p-2 bg-white border-2 border-primary shadow-lg flex flex-col items-center relative hover:scale-[1.03] transition-transform duration-500">
                <img 
                  src={ceoImg} 
                  alt="CEO Alex Sterling" 
                  className="w-full h-full object-cover rounded-full"
                />
                <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-white border border-outline-variant text-primary font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ONLINE NOW
                </div>
              </div>
            </div>

            <div className="mt-4 text-primary font-bold text-sm flex items-center gap-1.5 group-hover:underline transition-all pb-2">
              <span className="material-symbols-outlined text-[20px]">flip</span>
              Tap to view Co-Founder
            </div>
          </div>
        </div>

        {/* Back of Card - Co-Founder */}
        <div className="w-full h-full absolute inset-0 rounded-3xl bg-white border border-outline-variant shadow-2xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col cursor-pointer" onClick={() => setIsFlipped(false)}>
          <div className="h-2 w-full bg-primary shrink-0" />
          <div className="p-6 sm:p-8 flex flex-col justify-between h-full gap-4">
            
            <div className="flex-grow flex flex-col items-center">
              <div className="w-full flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="px-3 py-1 rounded-full bg-white-container-low border border-outline-variant text-on-surface-variant font-headline text-xs font-bold">
                  FOUNDERS
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-black font-headline text-xs font-bold backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  VERIFIED
                </div>
              </div>
              
              <div className="text-center pt-2">
                <h3 className="font-headline text-2xl sm:text-3xl text-on-surface font-extrabold leading-tight">
                  Sarah Chen
                </h3>
                <p className="text-primary font-bold mt-1 tracking-wide">CO-FOUNDER & CTO</p>
              </div>

              {/* Profile Image Area */}
              <div className="bg-background border border-outline-variant rounded-2xl p-4 flex flex-col items-center justify-center relative w-full flex-grow mt-4 shadow-inner">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full p-1.5 bg-white border border-outline-variant shadow-md flex flex-col items-center relative hover:scale-[1.03] transition-transform duration-500">
                  <img 
                    src={coFounderImg} 
                    alt="Co-Founder Sarah Chen" 
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                
                <div className="flex flex-col gap-3 text-on-surface-variant text-sm mt-6 w-full px-2">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
                    <div>
                      <div className="font-bold text-on-surface text-sm">Direct Contact</div>
                      <div className="text-xs mt-0.5">sarah@hackathon.edu</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full flex justify-center pb-2 shrink-0 mt-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="text-primary font-bold text-sm flex items-center gap-1.5 hover:underline transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">flip</span>
                Tap to flip back
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
