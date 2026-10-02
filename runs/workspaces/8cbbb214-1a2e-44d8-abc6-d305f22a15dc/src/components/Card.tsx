import React, { useEffect, useState } from 'react';
import './Card.css';

interface CardProps {
  title: string;
  description: string;
  imageUrl: string;
  price?: number;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, imageUrl, price, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const cardTop = document.getElementById('card').getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      if (cardTop < windowHeight) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`card ${isVisible ? 'visible' : ''}`} id='card' onClick={onClick}>
      <img src={imageUrl} alt={title} className='card-image' />
      <div className='card-content'>
        <h3>{title}</h3>
        <p>{description}</p>
        {price && <p>${price.toFixed(2)}</p>}
      </div>
    </div>
  );
};

export default Card;
