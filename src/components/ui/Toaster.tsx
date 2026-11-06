import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/lib/theme';

export function Toaster() {
  const theme = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      duration={2500}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-2 rounded-control bg-ink px-3.5 py-2.5 text-13 font-medium text-canvas shadow-overlay md:w-auto md:min-w-56',
          icon: 'shrink-0',
        },
      }}
    />
  );
}
