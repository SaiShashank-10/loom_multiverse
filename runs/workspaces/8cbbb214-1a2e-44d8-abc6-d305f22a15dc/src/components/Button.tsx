import React from 'react';

const Button = ({ children, onClick, type = 'button', className = '' }) => {
  return (
    <button
      onClick={onClick}
      type={type}
      className={`btn ${className} hover:scale-102 hover:shadow-lg transition duration-200 ease-out text-primary bg-secondary hover:bg-secondary-container hover:text-on-secondary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
    >
      {children}
    </button>
  );
};

export default Button;
