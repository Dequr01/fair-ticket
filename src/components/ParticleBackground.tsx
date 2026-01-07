"use client";

import React, { useEffect, useRef } from "react";
import anime from "animejs";

const ParticleBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const isMobile = window.innerWidth < 768;
    const numberOfParticles = isMobile ? 20 : 50;
    
    // Clear previous
    container.innerHTML = "";

    for (let i = 0; i < numberOfParticles; i++) {
      const particle = document.createElement("div");
      particle.classList.add("particle");
      
      // Random initial positions
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      
      particle.style.left = `${x}vw`;
      particle.style.top = `${y}vh`;
      
      container.appendChild(particle);
    }

    // Antigravity / Floating effect
    anime({
      targets: ".particle",
      translateX: () => anime.random(-50, 50),
      translateY: () => anime.random(-50, 50),
      scale: () => anime.random(0.5, 2),
      opacity: () => anime.random(0.3, 0.8),
      easing: "easeInOutQuad",
      duration: () => anime.random(3000, 8000),
      delay: () => anime.random(0, 500),
      loop: true,
      direction: "alternate",
    });

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        anime({
            targets: ".particle",
            translateX: (el: HTMLElement) => {
                const rect = el.getBoundingClientRect();
                const dx = mouseX - rect.left;
                return dx * -0.1; // Move away from mouse
            },
            translateY: (el: HTMLElement) => {
                const rect = el.getBoundingClientRect();
                const dy = mouseY - rect.top;
                return dy * -0.1;
            },
            duration: 1000,
            easing: 'easeOutExpo'
        });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);

  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black"
    >
      <style jsx global>{`
        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: rgba(100, 255, 218, 0.6);
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(100, 255, 218, 0.8);
        }
      `}</style>
    </div>
  );
};

export default ParticleBackground;
