// src/components/CustomCursor.tsx
import React, { useEffect, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // On désactive sur mobile/tactile
    if (window.matchMedia('(hover: none)').matches) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let raf = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      }
    };

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(animateRing);
    };

    const onMouseEnter = () => document.body.classList.add('hovering');
    const onMouseLeave = () => document.body.classList.remove('hovering');

    window.addEventListener('mousemove', onMouseMove);
    // Cible tous les éléments interactifs pour l'effet de "Grossissement"
    const interactives = document.querySelectorAll('a, button, input, textarea, .card-hover');
    interactives.forEach(el => {
      el.addEventListener('mouseenter', onMouseEnter);
      el.addEventListener('mouseleave', onMouseLeave);
    });

    raf = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <style>{`
        .cursor-dot, .cursor-ring {
          position: fixed; top: 0; left: 0; pointer-events: none; z-index: 999999; border-radius: 50%;
          transform: translate(-50%, -50%); will-change: transform;
        }
        .cursor-dot { width: 6px; height: 6px; background: #ff3366; box-shadow: 0 0 15px #ff3366, 0 0 30px #7c5cff; transition: opacity 0.2s; }
        .cursor-ring { width: 40px; height: 40px; border: 1px solid rgba(255, 51, 102, 0.5); transition: width 0.25s, height 0.25s, border-color 0.25s; }
        body.hovering .cursor-ring { width: 70px; height: 70px; border-color: #ff3366; background: rgba(255, 51, 102, 0.05); }
        @media (hover: none) { .cursor-dot, .cursor-ring { display: none; } body { cursor: auto; } }
        body { cursor: none; }
      `}</style>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
};