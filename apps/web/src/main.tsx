import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { AccountGate } from "./auth";
import "./styles.css";
import "./account.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AccountGate><App /></AccountGate>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>,
);
