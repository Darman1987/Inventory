import { createBrowserRouter } from "react-router";
import RootLayout from "./layouts/RootLayout";
import Login from "./pages/Login";
import ProtectedDashboard from "./pages/ProtectedDashboard";
import RedirectToDashboard from "./pages/RedirectToDashboard";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/dashboard",
        Component: ProtectedDashboard,
      },
      {
        path: "/",
        Component: RedirectToDashboard,
      },
    ],
  },
]);