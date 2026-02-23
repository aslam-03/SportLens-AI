/**
 * TypingIndicator - Animated dots showing AI is processing
 */

import { cn } from '@/utils/cn';

interface TypingIndicatorProps {
    className?: string;
}

export const TypingIndicator = ({ className }: TypingIndicatorProps) => {
    return (
        <div
            className={cn(
                'flex items-start gap-3 max-w-[85%] animate-fade-in',
                className,
            )}
        >
            {/* Avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-cyan-400 flex items-center justify-center">
                <span className="text-xs font-bold text-white">AI</span>
            </div>

            {/* Typing bubble */}
            <div className="bg-navy-800 border border-navy-700 rounded-2xl rounded-tl-sm px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
                    />
                    <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
                    />
                    <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default TypingIndicator;
