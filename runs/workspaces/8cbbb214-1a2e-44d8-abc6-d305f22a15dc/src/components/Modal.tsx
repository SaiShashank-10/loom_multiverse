import React, { useState } from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  const [isAnimating, setIsAnimating] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isOpen]);

  return (
    <div className={`modal ${isAnimating ? 'animate-open' : 'animate-close'}`}
         onClick={onClose}
    >
      <div className='modal-content'
           onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
