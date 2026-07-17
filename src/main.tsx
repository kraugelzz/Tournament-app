import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./i18n";
import App from "./App";
import { Home } from "./pages/Home";
import { GameList } from "./pages/GameList";
import { NewTournament } from "./pages/NewTournament";
import { Tournament } from "./pages/Tournament";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: ":game", element: <GameList /> },
      { path: ":game/new", element: <NewTournament /> },
      { path: ":game/:tournamentId", element: <Tournament /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
