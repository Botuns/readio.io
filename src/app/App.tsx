import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import { Tooltip } from 'radix-ui';
import { useState } from 'react';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from '@/components/ui/Toaster';
import { createQueryClient } from './queryClient';
import { createAppRouter } from './router';

/** The animation engine loads after first paint instead of blocking it. */
const loadMotionFeatures = () => import('@/lib/motionFeatures').then((module) => module.domMax);

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>
          <Tooltip.Provider delayDuration={300} skipDelayDuration={200}>
            <RouterProvider router={router} />
            <Toaster />
          </Tooltip.Provider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
