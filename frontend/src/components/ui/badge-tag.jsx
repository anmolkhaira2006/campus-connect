import React from "react";
import { Sparkles } from "lucide-react";

export function BadgeTag({ 
    text = "New feature is ready to use, let's try", 
    tag = "Update",
    icon: Icon = Sparkles
}) {
    return (
        <div className="flex w-fit items-center space-x-2.5 border border-outline-variant/50 rounded-full bg-white-container-low/70 p-1 text-sm text-on-surface shadow-sm backdrop-blur-md cursor-pointer transition-all hover:bg-white-container-low hover:shadow-md hover:scale-[1.02]">
            <div className="flex items-center space-x-1.5 bg-white border border-outline-variant/40 rounded-2xl px-3 py-1">
                {Icon && <Icon className="w-4 h-4 text-primary" />}
                <p className="font-headline font-bold text-[10px] uppercase tracking-wider">{tag}</p>
            </div>
            <p className="pr-3 text-xs font-medium">{text}</p>
        </div>
    );
}
