import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import PlaceholderImage from './PlaceholderImage';

interface ImageGalleryProps {
  title?: string;
  images: string[];
  className?: string;
  autoSlideInterval?: number;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  title = "Gallery",
  images,
  className = "",
  autoSlideInterval = 3000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [objectFit, setObjectFit] = useState<'cover' | 'contain' | 'fill' | 'none' | 'scale-down'>('cover');
  const [isZoomed, setIsZoomed] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === '+') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        resetZoom();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleObjectFit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    resetZoom();
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    resetZoom();
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    resetZoom();
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setObjectFit('cover');
    setIsZoomed(false);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
    setObjectFit('contain');
    setIsZoomed(true);
    setIsAutoPlaying(false);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    if (zoomLevel <= 1.25) {
      setObjectFit('cover');
      setIsZoomed(false);
      setIsAutoPlaying(true);
    }
  };

  const handleMouseEnter = () => {
    if (!isZoomed) {
      setIsAutoPlaying(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isZoomed) {
      setIsAutoPlaying(true);
    }
  };

  const toggleObjectFit = () => {
    const fits: Array<'cover' | 'contain' | 'fill' | 'none' | 'scale-down'> = ['cover', 'contain', 'fill', 'none', 'scale-down'];
    const currentIndex = fits.indexOf(objectFit);
    const nextIndex = (currentIndex + 1) % fits.length;
    setObjectFit(fits[nextIndex]);
  };

  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlaying || images.length <= 1 || isZoomed) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length, autoSlideInterval, isZoomed]);

  // If only one image, show simple display
  if (images.length === 1) {
    return (
      <div className={`w-full ${className}`}>
        {title && (
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            {title}
          </h2>
        )}
        <div className="max-w-md mx-auto">
          <PlaceholderImage
            src={images[0]}
            alt="Gallery image"
            className="w-full h-96 object-cover rounded-lg shadow-lg"
            fallbackText="Gallery Image"
          />
        </div>
      </div>
    );
  }

  // Auto-sliding carousel for all screen sizes
  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          {title}
        </h2>
      )}

      <div
        className="relative max-w-4xl mx-auto"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Main Image Container */}
        <div className="relative overflow-hidden rounded-lg shadow-2xl bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="relative"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center'
              }}
            >
              <div className="relative overflow-hidden">
                <img
                  src={images[currentIndex]}
                  alt={`Gallery image ${currentIndex + 1}`}
                  className={`w-full ${isMobile ? 'h-80' : 'h-96'} transition-all duration-300`}
                  style={{
                    objectFit: objectFit,
                    maxHeight: isMobile ? '320px' : '384px'
                  }}
                  onError={(e) => {
                    console.log('Image failed to load:', images[currentIndex]);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <button
              onClick={handleZoomIn}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors duration-200"
              aria-label="Zoom in"
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <button
              onClick={handleZoomOut}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors duration-200"
              aria-label="Zoom out"
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={resetZoom}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors duration-200"
              aria-label="Reset zoom"
              title="Reset Zoom"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={toggleObjectFit}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors duration-200 text-xs font-bold"
              aria-label="Toggle fit mode"
              title={`Fit: ${objectFit}`}
            >
              FIT
            </button>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors duration-200 z-10"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors duration-200 z-10"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>

          {/* Status Indicators */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
              {isAutoPlaying && !isZoomed ? 'Auto-playing' : isZoomed ? 'Zoomed' : 'Paused'}
            </div>
            {zoomLevel > 1 && (
              <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                Zoom: {Math.round(zoomLevel * 100)}%
              </div>
            )}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center mt-6 space-x-3">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-primary-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400 hover:scale-110'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Image Counter */}
        <div className="text-center mt-4 text-lg font-semibold text-gray-700">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Thumbnail Grid (optional - shows on larger screens) */}
        {!isMobile && images.length > 1 && (
          <div className="mt-8 grid grid-cols-5 gap-2 max-w-2xl mx-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`relative overflow-hidden rounded-md transition-all duration-200 ${
                  index === currentIndex
                    ? 'ring-2 ring-primary-600 scale-105'
                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-16 object-cover rounded-md"
                  onError={(e) => {
                    console.log('Thumbnail failed to load:', image);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGallery;
