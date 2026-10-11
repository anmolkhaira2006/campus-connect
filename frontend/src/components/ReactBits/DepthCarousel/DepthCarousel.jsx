import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import "./DepthCarousel.css";

const DepthCarousel = ({ items, className = "" }) => {
  const [activeItem, setActiveItem] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    if (!carouselRef.current) return;

    const cards = carouselRef.current.querySelectorAll(".depth-carousel__card");
    
    // Clear previous GSAP styles
    gsap.set(cards, { clearProps: "all" });
    
    // Apply new positions with animation
    cards.forEach((card, index) => {
      let relativeIndex = index - activeItem;
      // Handle wrapping for infinite carousel effect
      if (relativeIndex > Math.floor(cards.length / 2)) {
        relativeIndex -= cards.length;
      } else if (relativeIndex < -Math.floor(cards.length / 2)) {
        relativeIndex += cards.length;
      }
      
      const zIndex = cards.length - Math.abs(relativeIndex);
      const scale = 1 - Math.abs(relativeIndex) * 0.15;
      const xOffset = relativeIndex * 60; // Spread out items horizontally
      const opacity = Math.abs(relativeIndex) > 2 ? 0 : 1; // Hide items too far back
      
      gsap.to(card, {
        x: `${xOffset}%`,
        scale: scale,
        opacity: opacity,
        zIndex: zIndex,
        duration: 0.8,
        ease: "power2.inOut",
      });
    });
  }, [activeItem, items.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveItem((prev) => (prev + 1) % items.length);
    }, 3000); // 3 seconds per slide

    return () => clearInterval(interval);
  }, [items.length]);

  const handleCardClick = (index) => {
    setActiveItem(index);
  };

  return (
    <div className={`depth-carousel ${className}`}>
      <div className="depth-carousel__container" ref={carouselRef}>
        {items.map((item, index) => (
          <div 
            key={item.id || index} 
            className="depth-carousel__card"
            onClick={() => handleCardClick(index)}
          >
            <div className="depth-carousel__image-wrapper">
              <img src={item.src} alt={item.name} className="depth-carousel__image" loading="lazy" />
            </div>
            <div className="depth-carousel__info">
              <h3 className="depth-carousel__name">{item.name}</h3>
              <p className="depth-carousel__designation">{item.designation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepthCarousel;
