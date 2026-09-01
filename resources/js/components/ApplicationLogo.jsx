import React from 'react';
import { cn } from '@/lib/utils';
import { Boxes } from 'lucide-react';

// Import asset default
import defaultLogo from '../../images/dsmitel.png';

export function ApplicationLogo({ 
    className, 
    imageClassName,
    imageSrc = defaultLogo, 
    showText = true,
    showTextOnMobile = false, 
    ...props 
}) {
    return (
        <div className={cn('flex items-center gap-3 select-none', className)} {...props}>
            {/* 1. LOGO IMAGE / FALLBACK ICON */}
            {imageSrc ? (
                <img 
                    src={imageSrc} 
                    alt="Logo DS Mitel" 
                    className={cn('h-10 sm:h-13 w-auto object-contain shrink-0', imageClassName)}
                />
            ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Boxes className="w-5 h-5 text-white" />
                </div>
            )}

            {/* 2. BRAND TEXT (ADAPTIF LIGHT & DARK MODE) */}
            {showText && (
                <div className={showTextOnMobile ? "flex flex-col" : "hidden sm:flex flex-col"}>
                    <span className="font-extrabold text-base tracking-wide text-slate-900 dark:text-white block leading-none">
                        DS Mitel
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-red-600 dark:text-red-400 font-bold tracking-[0.18em] uppercase mt-1 block leading-tight">
                        Dashboard Management
                    </span>
                </div>
            )}
        </div>
    );
}

// Alias Export agar kompatibel dengan import AppLogo maupun ApplicationLogo
export const AppLogo = ApplicationLogo;
export default ApplicationLogo;