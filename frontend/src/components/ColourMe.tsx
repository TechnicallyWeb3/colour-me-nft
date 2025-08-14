import React from 'react';
import colourMeSvg from '../assets/colour-me.test.svg';

interface ColourMeProps {
  width?: number;
  height?: number;
  className?: string;
}

const ColourMe: React.FC<ColourMeProps> = ({ 
  width = 1000,
  className = '' 
}) => {
  return (
    <object
      data={colourMeSvg}
      type="image/svg+xml"
      width={width}
      height={width}
      className={className}
    >
      <p>Your browser does not support SVG</p>
    </object>
  );
};

export default ColourMe;
