import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import FreightPage from "./pages/FreightPage";
import PrixRevientPage from "./pages/PrixRevientPage";

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<FreightPage />} />
          <Route path="/prix-de-revient" element={<PrixRevientPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
