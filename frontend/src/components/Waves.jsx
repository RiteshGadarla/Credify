import React, { useEffect, useRef } from 'react';

const Waves = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Ribbons with fill colors at the bottom
    const ribbons = [
      { amplitude: 100, wavelength: 0.0015, speed: 0.012, thickness: 3, strokeColor: 'rgba(3, 169, 244, 0.4)', fillColor: 'rgba(3, 169, 244, 0.08)', offset: 0 },
      { amplitude: 140, wavelength: 0.001, speed: 0.008, thickness: 5, strokeColor: 'rgba(79, 195, 247, 0.3)', fillColor: 'rgba(79, 195, 247, 0.05)', offset: Math.PI / 6 },
      { amplitude: 180, wavelength: 0.0008, speed: 0.006, thickness: 8, strokeColor: 'rgba(129, 212, 250, 0.2)', fillColor: 'rgba(129, 212, 250, 0.03)', offset: Math.PI / 4 },
      { amplitude: 80, wavelength: 0.002, speed: 0.016, thickness: 2, strokeColor: 'rgba(2, 136, 209, 0.5)', fillColor: 'rgba(2, 136, 209, 0.06)', offset: Math.PI },
      { amplitude: 220, wavelength: 0.0006, speed: 0.004, thickness: 12, strokeColor: 'rgba(225, 245, 254, 0.1)', fillColor: 'rgba(225, 245, 254, 0.02)', offset: Math.PI / 2 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;

      const centerY = canvas.height * 0.55;

      ribbons.forEach((ribbon) => {
        ctx.beginPath();
        for (let x = 0; x <= canvas.width + 5; x += 5) {
          const y = centerY
            + Math.sin(x * ribbon.wavelength + time * ribbon.speed + ribbon.offset) * ribbon.amplitude
            + Math.sin(x * ribbon.wavelength * 0.4 - time * ribbon.speed * 0.8) * (ribbon.amplitude * 0.3);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Complete the path to the bottom corners
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        // Fill the area below the wave
        ctx.fillStyle = ribbon.fillColor;
        ctx.fill();

        // Only stroke the top edge
        ctx.beginPath();
        for (let x = 0; x <= canvas.width + 5; x += 5) {
          const y = centerY
            + Math.sin(x * ribbon.wavelength + time * ribbon.speed + ribbon.offset) * ribbon.amplitude
            + Math.sin(x * ribbon.wavelength * 0.4 - time * ribbon.speed * 0.8) * (ribbon.amplitude * 0.3);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineWidth = ribbon.thickness;
        ctx.strokeStyle = ribbon.strokeColor;
        ctx.shadowBlur = ribbon.thickness * 1.5;
        ctx.shadowColor = ribbon.strokeColor;
        ctx.stroke();

        ctx.shadowBlur = 0;
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default Waves;
