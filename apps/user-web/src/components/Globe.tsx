import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export const Globe = ({ className = '' }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: [0.82, 0.18, 0.18],
      glowColor: [1, 1, 1],
      markers: [
        { location: [28.6139, 77.2090], size: 0.1 }, // New Delhi
        { location: [23.5255, 77.8081], size: 0.1 }, // Vidisha
      ],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className={`relative w-full max-w-[600px] aspect-square mx-auto ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', contain: 'layout paint size' }}
      />
    </div>
  );
};
