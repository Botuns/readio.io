import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { campaignPath, DEFAULT_CAMPAIGN_ID, routePatterns } from '@/lib/routes';
import { NotFoundPage } from './NotFoundPage';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';
import { RouteFallback } from './RouteFallback';

/**
 * `:roomName` is a single path segment. A `/` inside a room name travels as
 * `%2F` and React Router decodes it back, so no splat route is needed.
 * Both pages are split into their own chunks.
 */
export const routes: RouteObject[] = [
  {
    path: routePatterns.root,
    Component: RootLayout,
    ErrorBoundary: RouteError,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, element: <Navigate to={campaignPath(DEFAULT_CAMPAIGN_ID)} replace /> },
      {
        path: routePatterns.campaign,
        lazy: async () => {
          const { CampaignPage } = await import('@/features/campaign/CampaignPage');
          return { Component: CampaignPage };
        },
      },
      {
        path: routePatterns.room,
        lazy: async () => {
          const { RoomPage } = await import('@/features/room/RoomPage');
          return { Component: RoomPage };
        },
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
