
import React from 'react';

interface LogoProps {
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-14 h-14" }) => {
    return (
        <img 
            src="https://static.wixstatic.com/media/568992_b64a6dc3ea2440e2acae0b95a6439c0d~mv2.png/v1/fit/w_2500,h_1330,al_c/568992_b64a6dc3ea2440e2acae0b95a6439c0d~mv2.png" 
            alt="OPZEN AI Logo" 
            className={`${className} object-contain`}
        />
    );
};
