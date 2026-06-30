import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ChannelsPage } from "./pages/ChannelsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PublishPage } from "./pages/PublishPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
    </Routes>
  );
}
