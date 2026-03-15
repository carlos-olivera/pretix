import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { EventList } from '../features/events/EventList';
import { EventDetail } from '../features/events/EventDetail';
import { Cart } from '../features/cart/Cart';
import { CheckoutWithBNPL } from '../features/checkout/CheckoutWithBNPL';
import { OrderDetails } from '../features/orders/OrderDetails';
import { BNPLDashboard } from '../features/bnpl/dashboard/BNPLDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <EventList />,
      },
      {
        path: 'event',
        element: <EventDetail />,
      },
      {
        path: 'cart',
        element: <Cart />,
      },
      {
        path: 'checkout',
        element: <CheckoutWithBNPL />,
      },
      {
        path: 'order/:orderCode',
        element: <OrderDetails />,
      },
      {
        path: 'bnpl/dashboard',
        element: <BNPLDashboard userId="user-placeholder" />,
      },
    ],
  },
]);
