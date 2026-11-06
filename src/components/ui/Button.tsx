import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button holding a single icon. Always pair with `aria-label`. */
  iconOnly?: boolean;
}

type ButtonProps = ButtonStyleProps & ComponentProps<'button'>;

export function Button({
  variant,
  size,
  iconOnly,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, iconOnly, className })}
      {...props}
    >
      <span className="btn-content">{children}</span>
    </button>
  );
}

type ButtonLinkProps = ButtonStyleProps & LinkProps;

export function ButtonLink({
  variant,
  size,
  iconOnly,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, iconOnly, className })} {...props}>
      <span className="btn-content">{children}</span>
    </Link>
  );
}
