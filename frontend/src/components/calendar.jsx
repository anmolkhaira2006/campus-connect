import React from "react";
import { 
  Calendar as AriaCalendar, 
  CalendarCell, 
  CalendarGrid, 
  CalendarGridBody, 
  CalendarGridHeader, 
  CalendarHeaderCell, 
  Heading, 
  Button 
} from "react-aria-components";

export function Calendar(props) {
  return (
    <AriaCalendar aria-label="Event date" {...props} className="w-full max-w-[280px]">
      <header className="flex items-center justify-between px-1 pb-4">
        <Button slot="previous" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white-container text-on-surface transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </Button>
        <Heading className="font-headline font-bold text-sm text-on-surface m-0" />
        <Button slot="next" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white-container text-on-surface transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </Button>
      </header>
      <CalendarGrid className="w-full border-collapse border-0">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="font-headline text-[10px] font-bold uppercase tracking-wider text-on-surface-variant pb-2">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell 
              date={date} 
              className={({ isSelected, isOutsideVisibleRange, isDisabled }) => `
                w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all cursor-pointer outline-none mx-auto
                ${isOutsideVisibleRange ? 'text-on-surface-variant/30' : 'text-on-surface hover:bg-white-container-low'}
                ${isSelected ? 'bg-primary text-white hover:bg-primary-dark font-bold shadow-md' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
              `}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  );
}
