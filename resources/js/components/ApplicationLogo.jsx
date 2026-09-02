import React from 'react';
import { cn } from '@/lib/utils';
import { Boxes } from 'lucide-react';

// Import asset default
import defaultLogo from '../../images/dsmitel.png';

export function ApplicationLogo({ 
    className, 
    imageClassName,
    textClassName,
    subtextClassName,
    imageSrc = defaultLogo, 
    showText = true,
    showTextOnMobile = false, 
    forceWhite = false,
    ...props 
}) {
    return (
        <div className={cn('flex items-center gap-3 select-none', className)} {...props}>
            {/* 1. LOGO IMAGE / FALLBACK ICON */}
            {imageSrc ? (
                <img 
                    src={imageSrc} 
                    alt="Logo DS Mitel" 
                    className={cn('h-9 sm:h-10 w-auto object-contain shrink-0', imageClassName)}
                />
            ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Boxes className="w-5 h-5 text-white" />
                </div>
            )}

            {/* 2. BRAND TEXT */}
            {showText && (
                <div className={showTextOnMobile ? "flex flex-col" : "hidden sm:flex flex-col"}>
                    <span 
                        className={cn(
                            'font-extrabold text-base tracking-wide block leading-none',
                            forceWhite ? 'text-white drop-shadow-md' : 'text-slate-900 dark:text-white',
                            textClassName
                        )}
                    >
                        DS Mitel
                    </span>
                    <span 
                        className={cn(
                            'text-[9px] sm:text-[10px] font-bold tracking-[0.18em] uppercase mt-1 block leading-tight',
                            forceWhite ? 'text-red-500' : 'text-red-600 dark:text-red-400',
                            subtextClassName
                        )}
                    >
                        Dashboard Management
                    </span>
                </div>
            )}
        </div>
    );
}

export const AppLogo = ApplicationLogo;
export default ApplicationLogo;