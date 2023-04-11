import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const integrationProduct = "5141150b-8419-4e24-ae3f-9cab47a7920f"; // Sample Serving Board
const workflowID = "3b09df2b-8808-4b1c-955a-d4172e706d11"; // Sample Serving Board Workflow

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App integrationProductId={integrationProduct} workflowId={workflowID} />
  </React.StrictMode>
);
