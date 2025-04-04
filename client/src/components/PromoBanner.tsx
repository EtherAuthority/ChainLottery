import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Banner images with promotional content and fallback colors
const bannerImages = [
  {
    id: 1,
    url: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallbackColor: 'bg-gradient-to-r from-indigo-500 to-purple-800',
    title: 'JACKPOT ALERT',
    description: 'Current Jackpot Over $10 Million!'
  },
  {
    id: 2,
    url: 'https://images.pexels.com/photos/3943716/pexels-photo-3943716.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallbackColor: 'bg-gradient-to-r from-blue-700 to-blue-900',
    title: 'NEW PLAYERS BONUS',
    description: 'Get 20% Extra on Your First Ticket Purchase'
  },
  {
    id: 3,
    url: 'https://images.pexels.com/photos/259249/pexels-photo-259249.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallbackColor: 'bg-gradient-to-r from-emerald-600 to-teal-800',
    title: 'WINNERS EVERY DAY',
    description: 'Join Thousands of Winners This Month'
  },
  {
    id: 4,
    url: 'https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallbackColor: 'bg-gradient-to-r from-red-600 to-purple-900',
    title: 'PLAY RESPONSIBLY',
    description: 'Set Limits and Enjoy The Game'
  },
  {
    id: 5,
    url: 'https://images.pexels.com/photos/7821487/pexels-photo-7821487.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallbackColor: 'bg-gradient-to-r from-amber-500 to-orange-700',
    title: 'WEEKLY DRAWS',
    description: 'Every Tuesday and Friday - Never Miss Out!'
  },
  {
    id: 6,
    url: 'https://images.pexels.com/photos/7654418/pexels-photo-7654418.jpeg?auto=compress&cs=tinysrgb&w=800',
    fallbackColor: 'bg-gradient-to-r from-fuchsia-600 to-pink-900',
    title: 'CRYPTO PAYOUTS',
    description: 'Instant Withdrawals in ETH or BNB'
  }
];

export default function PromoBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [imageLoadError, setImageLoadError] = useState<Record<number, boolean>>({});

  // Function to advance to the next slide
  const goToNextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerImages.length);
  }, []);

  // Function to go to the previous slide
  const goToPrevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + bannerImages.length) % bannerImages.length);
  }, []);

  // Set up autoplay
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoplay) {
      intervalId = setInterval(() => {
        goToNextSlide();
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoplay, goToNextSlide]);

  // Reset autoplay when user manually changes the slide
  const handleManualNavigation = (index: number) => {
    setCurrentIndex(index);
    setAutoplay(false);
    
    // Resume autoplay after 10 seconds of inactivity
    setTimeout(() => {
      setAutoplay(true);
    }, 10000);
  };

  // Handle image load errors
  const handleImageError = (index: number) => {
    setImageLoadError(prev => ({
      ...prev,
      [index]: true
    }));
  };

  // Check if current image has a load error
  useEffect(() => {
    // Preload the current image
    const img = new Image();
    img.src = bannerImages[currentIndex].url;
    img.onerror = () => handleImageError(currentIndex);
    
    return () => {
      img.onerror = null;
    };
  }, [currentIndex]);

  // Get the current banner
  const currentBanner = bannerImages[currentIndex];
  const hasImageError = imageLoadError[currentIndex];

  return (
    <div className="relative w-full overflow-hidden bg-black">
      {/* Active banner */}
      <div 
        key={currentBanner.id}
        className="relative w-full h-56 transition-opacity duration-500"
      >
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-in-out ${hasImageError ? currentBanner.fallbackColor : ''}`}
          style={{ 
            backgroundImage: hasImageError ? 'none' : `url(${currentBanner.url})`,
            transform: 'scale(1.05)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-center h-full px-8 md:px-16 max-w-md">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {currentBanner.title}
          </h2>
          <p className="text-lg md:text-xl text-white/90">
            {currentBanner.description}
          </p>
          <Button className="mt-4 w-40 bg-primary hover:bg-primary/90">
            Learn More
          </Button>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {bannerImages.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              currentIndex === index ? 'bg-white w-4' : 'bg-white/50'
            }`}
            onClick={() => handleManualNavigation(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Previous/Next buttons */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 border-none text-white hover:bg-black/50 z-20"
        onClick={() => {
          goToPrevSlide();
          handleManualNavigation(currentIndex > 0 ? currentIndex - 1 : bannerImages.length - 1);
        }}
        aria-label="Previous slide"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 border-none text-white hover:bg-black/50 z-20"
        onClick={() => {
          goToNextSlide();
          handleManualNavigation((currentIndex + 1) % bannerImages.length);
        }}
        aria-label="Next slide"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}