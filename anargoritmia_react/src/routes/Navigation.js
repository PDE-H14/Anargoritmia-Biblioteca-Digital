import React from "react";
import { Routes, BrowserRouter, Route } from "react-router-dom";
import routes from "./routes";

export function Navigation() {
  return (
    <BrowserRouter>
      <Routes>
        {routes.map((route, index) => {
          const Layout = route.layout;
          const Component = route.component;
          return (
            <Route
              key={index}
              path={route.path}
              element={
                <Layout staffOnly={route.staffOnly}>
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
