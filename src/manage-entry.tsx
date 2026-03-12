import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/AppRouter";
import "@/styles/index.css";
import "goey-toast/styles.css";
import "@/i18n/index";

/** 淡出并移除 HTML 首屏 loading */
function dismissAppLoader() {
  const loader = document.getElementById("app-loader");
  if (!loader) return;
  loader.classList.add("fade-out");
  loader.addEventListener("transitionend", () => loader.remove(), { once: true });
  // 兜底：如果 transitionend 未触发，400ms 后强制移除
  setTimeout(() => loader.remove(), 500);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename="/manage">
      <AppRouter />
    </BrowserRouter>
  </StrictMode>,
);

// React 渲染完成后淡出 loading
dismissAppLoader();
