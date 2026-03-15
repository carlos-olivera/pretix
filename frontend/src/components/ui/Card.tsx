import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-white rounded-lg',
    bordered: 'bg-white rounded-lg border border-secondary/30',
    elevated: 'bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-secondary/10',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-b border-secondary/20 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 border-t border-secondary/20 ${className}`} {...props}>
      {children}
    </div>
  );
}
