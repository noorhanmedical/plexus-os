import { useEffect, useRef, useMemo, useState } from "react";

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

interface TailSegment {
  id: number;
  x: number;
  y: number;
  opacity: number;
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  directionX: number;
  directionY: number;
  progress: number;
  active: boolean;
}

interface NightSkyBackdropProps {
  starCount?: number;
  showShootingStars?: boolean;
  showHorizonGlow?: boolean;
  className?: string;
}

export function NightSkyBackdrop({ 
  starCount = 100, 
  showShootingStars = true,
  showHorizonGlow = true,
  className = "" 
}: NightSkyBackdropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shootingStar, setShootingStar] = useState<ShootingStar | null>(null);
  const [tailSegments, setTailSegments] = useState<TailSegment[]>([]);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tailIdRef = useRef(0);

  const stars = useMemo(() => {
    const result: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      result.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 1.2 + 0.5,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 3,
      });
    }
    return result;
  }, [starCount]);

  const createShootingStar = () => {
    const direction = Math.floor(Math.random() * 4);
    let startX: number, startY: number, directionX: number, directionY: number;

    switch (direction) {
      case 0:
        startX = Math.random() * 30 + 10;
        startY = Math.random() * 30;
        directionX = 0.7;
        directionY = 0.5;
        break;
      case 1:
        startX = Math.random() * 30 + 60;
        startY = Math.random() * 30;
        directionX = -0.7;
        directionY = 0.5;
        break;
      case 2:
        startX = Math.random() * 20;
        startY = Math.random() * 40 + 10;
        directionX = 0.9;
        directionY = 0.3;
        break;
      default:
        startX = Math.random() * 20 + 80;
        startY = Math.random() * 40 + 10;
        directionX = -0.9;
        directionY = 0.3;
        break;
    }

    setShootingStar({
      id: Date.now(),
      startX,
      startY,
      directionX,
      directionY,
      progress: 0,
      active: true,
    });
  };

  useEffect(() => {
    if (!showShootingStars) return;

    const scheduleNext = () => {
      const delay = Math.random() * 8000 + 6000;
      timeoutRef.current = setTimeout(() => {
        createShootingStar();
      }, delay);
    };

    const initialDelay = setTimeout(() => {
      createShootingStar();
    }, 3000);

    return () => {
      clearTimeout(initialDelay);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showShootingStars]);

  useEffect(() => {
    if (!shootingStar || !shootingStar.active) return;

    const duration = 1500;
    const startTime = Date.now();
    const distance = 50;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentX = shootingStar.startX + easeProgress * distance * shootingStar.directionX;
      const currentY = shootingStar.startY + easeProgress * distance * shootingStar.directionY;

      if (progress < 0.9 && Math.random() > 0.5) {
        tailIdRef.current += 1;
        setTailSegments((prev) => [
          ...prev.slice(-20),
          { id: tailIdRef.current, x: currentX, y: currentY, opacity: 0.9 },
        ]);
      }

      setTailSegments((prev) =>
        prev
          .map((seg) => ({ ...seg, opacity: seg.opacity - 0.05 }))
          .filter((seg) => seg.opacity > 0)
      );

      setShootingStar((prev) =>
        prev ? { ...prev, progress: easeProgress } : null
      );

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setShootingStar(null);
          setTailSegments([]);
          const delay = Math.random() * 8000 + 6000;
          timeoutRef.current = setTimeout(createShootingStar, delay);
        }, 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [shootingStar?.id]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        background: "linear-gradient(to bottom, #000000 0%, #0a0a1a 30%, #0f0a1f 60%, #1a0a28 100%)",
      }}
    >
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.duration}s linear infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {shootingStar && shootingStar.active && (
        <div
          className="absolute w-[2px] h-[2px] bg-white rounded-full"
          style={{
            left: `${shootingStar.startX}%`,
            top: `${shootingStar.startY}%`,
            transform: `translate(${shootingStar.progress * 50 * shootingStar.directionX}vw, ${shootingStar.progress * 50 * shootingStar.directionY}vh)`,
            boxShadow: "0 0 4px 2px rgba(255, 255, 255, 0.8)",
            opacity: shootingStar.progress < 0.9 ? 1 : 1 - (shootingStar.progress - 0.9) * 10,
          }}
        />
      )}

      {tailSegments.map((seg) => (
        <div
          key={seg.id}
          className="absolute w-[1px] h-[1px] bg-white rounded-full"
          style={{
            left: `${seg.x}%`,
            top: `${seg.y}%`,
            opacity: seg.opacity,
          }}
        />
      ))}

      {showHorizonGlow && (
        <div
          className="absolute bottom-0 left-0 w-full h-[30%]"
          style={{
            background: "linear-gradient(to top, rgba(138, 43, 226, 0.15) 0%, rgba(75, 0, 130, 0.1) 40%, transparent 100%)",
          }}
        />
      )}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
