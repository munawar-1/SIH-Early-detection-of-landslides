import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './FoldText.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface FoldTextProps {
  text: string;
  splitBy?: 'char' | 'word' | 'line';
  hinge?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'mount' | 'scroll' | 'hover';
  duration?: number;
  stagger?: number;
  ease?: string;
  perspective?: number;
  creaseShading?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
}

export const FoldText: React.FC<FoldTextProps> = ({
  text,
  splitBy = 'char',
  hinge = 'top',
  trigger = 'mount',
  duration = 0.65,
  stagger = 0.045,
  ease = 'power3.out',
  perspective = 700,
  creaseShading = 0.55,
  className = '',
  style,
  as: Component = 'span'
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const piecesRef = useRef<HTMLSpanElement[]>([]);
  const shadowsRef = useRef<HTMLSpanElement[]>([]);

  piecesRef.current = [];
  shadowsRef.current = [];

  useEffect(() => {
    if (!containerRef.current || trigger !== 'mount') return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pieces = piecesRef.current.filter(Boolean);
    const shadows = shadowsRef.current.filter(Boolean);

    if (pieces.length === 0) return;

    if (prefersReducedMotion) {
      gsap.set(pieces, { rotateX: 0, rotateY: 0, opacity: 1 });
      if (shadows.length > 0) gsap.set(shadows, { opacity: 0 });
      return;
    }

    let transformOrigin = '50% 0%';
    let initialRotateX = 0;
    let initialRotateY = 0;

    switch (hinge) {
      case 'bottom':
        transformOrigin = '50% 100%';
        initialRotateX = 90;
        break;
      case 'left':
        transformOrigin = '0% 50%';
        initialRotateY = 90;
        break;
      case 'right':
        transformOrigin = '100% 50%';
        initialRotateY = -90;
        break;
      case 'top':
      default:
        transformOrigin = '50% 0%';
        initialRotateX = -90;
        break;
    }

    const ctx = gsap.context(() => {
      gsap.set(pieces, {
        transformOrigin,
        rotateX: initialRotateX,
        rotateY: initialRotateY,
        opacity: 0
      });

      if (shadows.length > 0 && creaseShading > 0) {
        gsap.set(shadows, {
          opacity: creaseShading
        });
      }

      const tl = gsap.timeline({ delay: 0.05 });

      tl.to(pieces, {
        rotateX: 0,
        rotateY: 0,
        opacity: 1,
        duration,
        stagger,
        ease
      }, 0);

      if (shadows.length > 0 && creaseShading > 0) {
        tl.to(shadows, {
          opacity: 0,
          duration,
          stagger,
          ease
        }, 0);
      }
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, [text, hinge, duration, stagger, ease, creaseShading, trigger]);

  const renderContent = () => {
    if (splitBy === 'word') {
      const words = text.split(' ');
      return words.map((word, wordIdx) => (
        <React.Fragment key={wordIdx}>
          <span
            className="fold-text-piece"
            ref={el => { if (el) piecesRef.current.push(el); }}
          >
            {word}
            {creaseShading > 0 && (
              <span
                className="fold-text-shadow"
                ref={el => { if (el) shadowsRef.current.push(el); }}
              />
            )}
          </span>
          {wordIdx < words.length - 1 && (
            <span className="fold-text-whitespace">&nbsp;</span>
          )}
        </React.Fragment>
      ));
    }

    // Default: splitBy === 'char'
    const words = text.split(' ');
    return words.map((word, wordIdx) => (
      <React.Fragment key={wordIdx}>
        <span className="fold-text-segment">
          {word.split('').map((char, charIdx) => (
            <span
              key={charIdx}
              className="fold-text-piece"
              ref={el => { if (el) piecesRef.current.push(el); }}
            >
              {char}
              {creaseShading > 0 && (
                <span
                  className="fold-text-shadow"
                  ref={el => { if (el) shadowsRef.current.push(el); }}
                />
              )}
            </span>
          ))}
        </span>
        {wordIdx < words.length - 1 && (
          <span className="fold-text-whitespace">&nbsp;</span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Component
      ref={containerRef as any}
      className={`fold-text ${className}`}
      style={style}
    >
      <span className="fold-text-sr-only">{text}</span>
      <span
        className="fold-text-visual"
        aria-hidden="true"
        style={{ perspective: `${perspective}px` }}
      >
        {renderContent()}
      </span>
    </Component>
  );
};
