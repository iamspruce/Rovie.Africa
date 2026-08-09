import { type ElementType, type ReactNode, type ComponentPropsWithoutRef } from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  children: ReactNode;
  variant?: string;
  type?: 'button' | 'submit' | 'reset';
  as?: ElementType;
  className?: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
  [key: string]: unknown;
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  as: Component = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  if (Component !== 'button') {
    return (
      <Component className={classes} {...rest}>
        {children}
      </Component>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
