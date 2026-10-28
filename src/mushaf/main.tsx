// Main view (first open): the Mushaf reader Mahir sent (t363u). The earlier app and its page styles live on classic.html.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "./styles.css";
import { Home } from "@/components/home";
import { Reader } from "@/components/reader";
import { LocaleProvider } from "@/lib/i18n";

function Shell() {
  const [page, setPage] = useState<number | null>(null);
  if (page == null) return <Home onOpen={setPage} />;
  return <Reader initialPage={page} onHome={() => setPage(null)} />;
}

createRoot(document.getElementById("root")!).render(<LocaleProvider><Shell /></LocaleProvider>);
