import React from "react";
import { Routes, BrowserRouter, Route } from "react-router-dom";
import { map } from "lodash";
import routes from "./routes";

export function Navigation() {
  return (
    <BrowserRouter>
      <Routes>
        {map(routes, (route, index) => {
          // Asignación a variables capitalizadas
          const Layout = route.layout;
          const Component = route.component;

          // Uso del return explícito
          return (
            <Route
              key={index}
              path={route.path}
              element={
                <Layout>
                  <Component />
                </Layout>
              }
            />
          );
        })}
      </Routes>
    </BrowserRouter>
  );
}
