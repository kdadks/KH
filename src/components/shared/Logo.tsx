import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => (
  <img src="/Logo.png" alt="KH Therapy" className={className} />
);

export default Logo;
