/**
 * ProductLayout Component
 * 
 * Legacy layout component. Use AppShell instead for new pages.
 */

import { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ProductLayoutProps {
  children: ReactNode;
}

export const ProductLayout = ({ children }: ProductLayoutProps) => {
  return (
    <div className={cn('min-h-screen bg-white dark:bg-navy-950')}>
      {children}
    </div>
  );
};

export default ProductLayout;
