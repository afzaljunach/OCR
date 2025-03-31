import React from 'react';

// Button component
const Button = ({
    text = 'Click Me',
    isLoading = false,
    color = 'primary', // Default color
    size = 'md', // Default size
    disabled = false,
    className = '',
    ...restProps
}) => {
    // Define size classes
    const sizeClasses = {
        sm: 'py-1 px-2 text-sm',
        md: 'py-2 px-4 text-base',
        lg: 'py-3 px-6 text-lg',
    };

    // Define color classes
    const colorClasses = {
        primary: `bg-primary hover:bg-primary-600 text-white`,
        secondary: `bg-gray-500 hover:bg-gray-600 text-white`,
        light: `bg-gray-200 text-gray-600 hover:bg-gray-300`,
        danger: `bg-red-500 hover:bg-red-600 text-white`,
    };

    // Loader JSX
    const loader = (
        <svg class="mr-3 -ml-1 size-5 -mt-1 inline animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    );

    return (
        <button
            className={`block font-semibold rounded-lg transition-all duration-300 ${sizeClasses[size]
                } ${colorClasses[color]} ${disabled && 'opacity-50 cursor-not-allowed'} ${className}`}
            disabled={disabled || isLoading}
            {...restProps}
        >
            {isLoading && loader}
            {text}
        </button>
    );
};

export default Button;
