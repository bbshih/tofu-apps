import { HTMLAttributes, ReactNode, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  noPadding?: boolean;
  variant?: 'default' | 'glass' | '3d';
  hover3d?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      noPadding = false,
      variant = 'default',
      hover3d: _hover3d = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-white rounded-2xl shadow-xl border-t-4 border-ocean-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1',
      glass: 'bg-white/30 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 transition-all duration-300 hover:bg-white/40 hover:shadow-2xl',
      '3d': 'bg-gradient-to-br from-white to-ocean-50 rounded-2xl shadow-2xl border-t-4 border-ocean-400 transition-all duration-500',
    };

    const paddingStyles = noPadding ? '' : 'p-6 md:p-8';

    return (
      <div
        ref={ref}
        className={`${variantStyles[variant]} ${paddingStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
