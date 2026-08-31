import React from 'react';
import './FoldText.css';

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
  className = '',
  style,
  as: Component = 'span'
}) => {
  return (
    <Component className={`fold-text ${className}`} style={style}>
      {text}
    </Component>
  );
};
