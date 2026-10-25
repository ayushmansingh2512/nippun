import React, { useEffect, useRef } from 'react';
import { BotAvatarProps } from './avatarTypes';

export const BotAvatar: React.FC<BotAvatarProps> = ({
  type = 'clover',
  face = 'eyes',
  color = '#2563eb',
  shading = 'plastic',
  state = 'default',
  size = 200,
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const startTime = useRef<number>(performance.now());
  const pokeProgress = useRef<number>(0);
  const isPoking = useRef<boolean>(false);

  // Trigger poke physics if state changes to 'poked'
  useEffect(() => {
    if (state === 'poked') {
      isPoking.current = true;
      pokeProgress.current = 1.0;
    }
  }, [state]);

  const handleInternalClick = () => {
    isPoking.current = true;
    pokeProgress.current = 1.0;
    if (onClick) onClick();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    let isMounted = true;

    const render = (now: number) => {
      if (!isMounted) return;
      const t = (now - startTime.current) * 0.001;

      // Handle poke decay
      let pokeOffset = 0;
      let pokeSquash = 1;
      if (isPoking.current) {
        pokeProgress.current *= 0.92;
        pokeOffset = Math.sin(pokeProgress.current * 18) * 12 * pokeProgress.current;
        pokeSquash = 1 + Math.sin(pokeProgress.current * 14) * 0.25 * pokeProgress.current;
        if (pokeProgress.current < 0.01) {
          isPoking.current = false;
          pokeProgress.current = 0;
        }
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;

      // Dynamic animation parameters based on state
      const isWorking = state === 'working';
      const floatSpeed = isWorking ? 4.2 : 1.8;
      const floatAmp = isWorking ? 6 : 4;
      const floatY = Math.sin(t * floatSpeed) * floatAmp + pokeOffset;
      const breathScale = isWorking
        ? 1 + Math.sin(t * 5.5) * 0.04
        : 1 + Math.sin(t * 2.0) * 0.025;

      const scaleX = breathScale * (isPoking.current ? pokeSquash : 1);
      const scaleY = breathScale * (isPoking.current ? 1 / Math.max(pokeSquash, 0.6) : 1);

      // Render Soft Floor Drop Shadow
      ctx.save();
      ctx.beginPath();
      const shadowW = size * 0.32 * scaleX;
      const shadowH = size * 0.08 * (1 - floatY / 30);
      ctx.ellipse(cx, size * 0.88, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.filter = 'blur(6px)';
      ctx.fill();
      ctx.restore();

      // Working state orbiting telemetry rings/dots
      if (isWorking) {
        ctx.save();
        ctx.translate(cx, cy + floatY);
        for (let i = 0; i < 3; i++) {
          const orbitAngle = t * 3 + (i * Math.PI * 2) / 3;
          const rx = size * 0.44;
          const ry = size * 0.22;
          const ox = Math.cos(orbitAngle) * rx;
          const oy = Math.sin(orbitAngle) * ry;
          ctx.beginPath();
          ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Main Avatar Body
      ctx.save();
      ctx.translate(cx, cy + floatY);
      ctx.scale(scaleX, scaleY);

      // Draw shape path
      drawAvatarPath(ctx, type, size);

      // Fill base color
      ctx.fillStyle = color;
      ctx.fill();

      // Tactile Plastic Specular Highlights
      if (shading === 'plastic') {
        // Soft volumetric inner shadow for vinyl 3D depth
        ctx.save();
        ctx.clip();
        const depthGrad = ctx.createRadialGradient(0, -size * 0.05, size * 0.1, 0, size * 0.1, size * 0.45);
        depthGrad.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
        depthGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        depthGrad.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
        ctx.fillStyle = depthGrad;
        ctx.fill();

        // Top Gloss Sheen
        ctx.beginPath();
        ctx.ellipse(-size * 0.08, -size * 0.18, size * 0.18, size * 0.08, -Math.PI / 8, 0, Math.PI * 2);
        const sheenGrad = ctx.createLinearGradient(-size * 0.2, -size * 0.25, 0, -size * 0.1);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
        sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = sheenGrad;
        ctx.fill();
        ctx.restore();
      }

      // Draw Facial Expression (Eyes, Mouth)
      drawAvatarFace(ctx, face, size, t, isWorking, isPoking.current);

      ctx.restore(); // restore body transform
      ctx.restore(); // restore root

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [type, face, color, shading, state, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        display: 'block',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      className={className}
      onClick={handleInternalClick}
      title={`${type} agent avatar`}
    />
  );
};

// Procedural Geometry Generator for A24 Avatar archetypes
function drawAvatarPath(ctx: CanvasRenderingContext2D, type: string, size: number) {
  ctx.beginPath();
  const r = size * 0.32;

  if (type === 'clover') {
    // 4 overlapping round lobes
    const lobeDist = r * 0.52;
    const lobeR = r * 0.62;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const lx = Math.cos(angle) * lobeDist;
      const ly = Math.sin(angle) * lobeDist;
      ctx.arc(lx, ly, lobeR, 0, Math.PI * 2);
    }
  } else if (type === 'flower') {
    // 6-petaled stylized floral silhouette
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      const px = Math.cos(angle) * (r * 0.55);
      const py = Math.sin(angle) * (r * 0.55);
      ctx.arc(px, py, r * 0.52, 0, Math.PI * 2);
    }
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  } else if (type === 'square') {
    // Rounded squircle / soft cube
    const w = r * 1.55;
    const rad = r * 0.48;
    ctx.roundRect(-w / 2, -w / 2, w, w, rad);
  } else if (type === 'ghost') {
    // Floating phantom dome with 3 wave scallops
    const w = r * 1.4;
    const h = r * 1.6;
    const topRadius = w / 2;
    ctx.arc(0, -h * 0.15, topRadius, Math.PI, 0, false);
    ctx.lineTo(topRadius, h * 0.45);
    // 3 wavy bottom scallops
    ctx.quadraticCurveTo(topRadius * 0.65, h * 0.6, topRadius * 0.33, h * 0.45);
    ctx.quadraticCurveTo(0, h * 0.6, -topRadius * 0.33, h * 0.45);
    ctx.quadraticCurveTo(-topRadius * 0.65, h * 0.6, -topRadius, h * 0.45);
    ctx.closePath();
  } else {
    // Default circle
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
}

// Procedural expressive face rendering with blinking and working emotions
function drawAvatarFace(
  ctx: CanvasRenderingContext2D,
  faceType: string,
  size: number,
  t: number,
  isWorking: boolean,
  isPoking: boolean
) {
  const eyeSpan = size * 0.085;
  const eyeY = -size * 0.02;

  // Eye blinking calculation (blinks every ~4.5 seconds for 0.15s)
  const blinkCycle = t % 4.5;
  const isBlinking = blinkCycle < 0.14 || isPoking;

  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  if (faceType === 'eyes' || faceType === 'both') {
    if (isBlinking) {
      // Closed happy blink arc
      ctx.beginPath();
      ctx.arc(-eyeSpan, eyeY, 6, 0.1 * Math.PI, 0.9 * Math.PI, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeSpan, eyeY, 6, 0.1 * Math.PI, 0.9 * Math.PI, false);
      ctx.stroke();
    } else {
      // Open expressive dark bead eyes with tiny white specular twinkle
      const eyeR = isWorking ? 5.5 : 4.8;
      // Left eye
      ctx.beginPath();
      ctx.arc(-eyeSpan, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-eyeSpan - 1.5, eyeY - 1.5, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Right eye
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(eyeSpan, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpan - 1.5, eyeY - 1.5, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  // Cute mouth
  if (faceType === 'mouth' || faceType === 'both') {
    const mouthY = size * 0.055;
    ctx.beginPath();
    if (isWorking) {
      // Concentrated small 'o' mouth
      ctx.arc(0, mouthY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
    } else {
      // Gentle smile arc
      ctx.arc(0, mouthY - 2, 7, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.stroke();
    }
  }
}
