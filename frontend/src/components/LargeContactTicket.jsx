import { useState } from 'react';
import { ContactForm } from './ContactForm';

export default function LargeContactTicket({ onSubmit }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const ceoImg = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800";
  const coFounderImg = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800";

  return (
    <div className="w-full relative [perspective:1400px] group max-w-2xl mx-auto h-[650px]">
      <div className={`relative w-full h-full transition-transform duration-[1000ms] ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* FRONT: CONTACT FORM */}
        <div className="w-full h-full absolute inset-0 rounded-[2.5rem] bg-white border border-outline-variant shadow-2xl overflow-hidden [backface-visibility:hidden] flex flex-col">
          <div className="h-3 w-full bg-primary shrink-0" />
          <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto no-scrollbar relative">
            
            <div className="flex items-center justify-between mb-4 shrink-0">
               <div className="px-4 py-1.5 rounded-full bg-white-container-low border border-outline-variant text-on-surface-variant font-headline text-xs md:text-sm font-bold flex items-center gap-1.5">
                 <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 PRIORITY SUPPORT
               </div>
               
               {/* Hold to view founders button */}
               <button 
                  onPointerDown={() => setIsFlipped(true)}
                  onPointerUp={() => setIsFlipped(false)}
                  onPointerLeave={() => setIsFlipped(false)}
                  className="px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-headline text-xs md:text-sm font-bold flex items-center gap-2 cursor-pointer active:scale-95 touch-none select-none"
               >
                 <span className="material-symbols-outlined text-[18px]">visibility</span>
                 Hold for Founders
               </button>
            </div>

            <div className="flex-grow flex items-center justify-center w-full">
               <ContactForm 
                 onSubmit={onSubmit} 
                 className="!shadow-none !p-0 !max-w-full" 
               />
            </div>
            
          </div>
        </div>

        {/* BACK: FOUNDERS PHOTOS */}
        <div className="w-full h-full absolute inset-0 rounded-[2.5rem] bg-white border border-outline-variant shadow-2xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col select-none">
          <div className="h-3 w-full bg-primary shrink-0" />
          <div className="p-6 md:p-10 flex flex-col items-center justify-center h-full relative">
            
             <h3 className="font-headline text-3xl md:text-4xl text-on-surface font-extrabold mb-10">
                Executive Team
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-lg">
                {/* CEO */}
                <div className="flex flex-col items-center text-center">
                   <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2rem] p-2 bg-white border-2 border-outline-variant shadow-lg mb-5">
                     <img src={ceoImg} alt="CEO" className="w-full h-full object-cover rounded-3xl" draggable={false} />
                   </div>
                   <h4 className="font-headline text-xl font-bold text-on-surface">Alex Sterling</h4>
                   <p className="text-primary font-bold text-sm tracking-wide mt-1">CHIEF EXECUTIVE OFFICER</p>
                </div>
                {/* Co-Founder */}
                <div className="flex flex-col items-center text-center">
                   <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2rem] p-2 bg-white border-2 border-outline-variant shadow-lg mb-5">
                     <img src={coFounderImg} alt="Co-Founder" className="w-full h-full object-cover rounded-3xl" draggable={false} />
                   </div>
                   <h4 className="font-headline text-xl font-bold text-on-surface">Sarah Chen</h4>
                   <p className="text-primary font-bold text-sm tracking-wide mt-1">CO-FOUNDER & CTO</p>
                </div>
             </div>

             <div className="absolute bottom-6 w-full flex justify-center opacity-60">
                <p className="font-headline text-sm font-bold flex items-center gap-2">
                   <span className="material-symbols-outlined text-[18px]">touch_app</span>
                   Release to return
                </p>
             </div>

          </div>
        </div>

      </div>
    </div>
  );
}
