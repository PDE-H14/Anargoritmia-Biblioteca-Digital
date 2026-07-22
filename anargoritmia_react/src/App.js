import React from "react";
import { Navigation } from "./routes/index";

import { ClientLayout, AdminLayout } from "./layouts";

export default function App() {
  return (
    <ClientLayout>
      <h1>Hola mundo</h1>
      <button class="ui secondary button">Okay</button>
      <button class="ui button">Cancel</button>
      <Navigation />
    </ClientLayout>
  );
}
