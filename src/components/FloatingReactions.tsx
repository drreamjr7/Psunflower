import React from 'react';
import { ReactionBurst } from '../types/party';

interface FloatingReactionsProps {
  reactions: ReactionBurst[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-12 flex flex-col items-center animate-reaction-float select-none"
          style={{
            left: `${r.x}%`,
            animation: 'floatUp 2.8s cubic-bezier(0.12, 0.8, 0.32, 1) forwards',
          }}
        >
          <span
            style={{ fontSize: `${r.size}px` }}
            className="filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          >
            {r.emoji}
          </span>
          <span className="text-[10px] font-mono text-cyan-200/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm -mt-1 border border-white/10 whitespace-nowrap">
            {r.senderName}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.6) rotate(-5deg);
          }
          15% {
            opacity: 1;
            transform: translateY(-20px) scale(1.15) rotate(4deg);
          }
          50% {
            opacity: 0.95;
            transform: translateY(-120px) scale(1) rotate(-3deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-240px) scale(0.85) rotate(6deg);
          }
        }
      `}</style>
    </div>
  );
};
