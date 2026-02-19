/**
 * Application Routes
 * 
 * Central routing configuration for all pages in the SportLens AI application.
 * Update your main App.tsx or vite router configuration to use these routes.
 */

import { lazy } from 'react';

// Pages (use lazy loading for code splitting)
const HomePage = lazy(() => import('./pages/Home'));
const LiveCoachingPage = lazy(() => import('./pages/LiveCoaching'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

export const routes = [
  {
    path: '/',
    children: [
      {
        path: '/',
        element: <HomePage />,
        label: 'Home',
        showInNav: true,
        icon: 'Home',
      },
      {
        path: '/coaching',
        element: <LiveCoachingPage />,
        label: 'Live Coaching',
        showInNav: true,
        icon: 'Play',
      },
      {
        path: '/sessions',
        element: <SessionsPage />,
        label: 'Sessions',
        showInNav: true,
        icon: 'Download',
      },
      {
        path: '/reports',
        element: <ReportsPage />,
        label: 'Reports',
        showInNav: true,
        icon: 'Settings',
      },
      {
        path: '/account',
        element: <AccountPage />,
        label: 'Account',
        showInNav: true,
        icon: 'User',
      },
    ],
  },
];

/**
 * Navigation Items
 * Use this for building navigation menus
 */
export const navigationItems = routes[0].children
  .filter((route) => route.showInNav)
  .map((route) => ({
    path: route.path,
    label: route.label,
    icon: route.icon,
  }));

/**
 * React Router Configuration (if using React Router v6)
 * 
 * Usage in App.tsx:
 * 
 * import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
 * import { routes } from './routes';
 * 
 * function App() {
 *   return (
 *     <BrowserRouter>
 *       <Routes>
 *         {routes.map((route) => (
 *           <Route key={route.path} path={route.path} element={route.element}>
 *             {route.children?.map((child) => (
 *               <Route
 *                 key={child.path}
 *                 path={child.path}
 *                 element={child.element}
 *               />
 *             ))}
 *           </Route>
 *         ))}
 *       </Routes>
 *     </BrowserRouter>
 *   );
 * }
 */

/**
 * TanStack Router Configuration (Recommended for Modern Apps)
 * 
 * Usage: Create routes.tsx and use createRootRoute, createRoute, etc.
 */
