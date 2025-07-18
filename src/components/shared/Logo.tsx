import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="32" cy="32" r="30" fill="#E0F2FE" />
    {/* Vertical bars representing spine */}
    <path d="M24 20 L24 44" stroke="#0369A1" strokeWidth="4" strokeLinecap="round" />
    <path d="M40 20 L40 44" stroke="#0369A1" strokeWidth="4" strokeLinecap="round" />
    {/* KH initials */}
    <text
      x="32"
      y="38"
      textAnchor="middle"
      fontSize="20"
      fill="#0369A1"
      fontFamily="sans-serif"
      fontWeight="bold"
    >
      KH
    </text>
  </svg>
);

export default Logo;
