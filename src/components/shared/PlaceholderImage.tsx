import React, { useState } from 'react';

interface PlaceholderImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'Image' 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
    console.log('Image failed to load:', src);
  };

  if (hasError) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
          <p className="text-blue-600 font-semibold text-lg">{fallbackText}</p>
          <p className="text-blue-500 text-sm mt-2">Professional Physiotherapy Services</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center ${className}`}>
          <div className="text-gray-500 font-medium">Loading image...</div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : 'block'}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </>
  );
};

export default PlaceholderImage;
