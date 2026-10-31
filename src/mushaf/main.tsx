// First open: surah list. A surah opens the Madinah page (yazilar.html).
// The previous reader is kept at evvelki.html.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "./styles.css";
import { Home } from "@/components/home";
import { Reader } from "@/components/reader";
import { LocaleProvider } from "@/lib/i18n";

const legacy = /evvelki\.html$/.test(location.pathname);

function Shell() {
  const [page, setPage] = useState<number | null>(null);
  if (legacy && page != null) return <Reader initialPage={page} onHome={() => setPage(null)} />;
  return <Home onOpen={legacy ? setPage : undefined} />;
}

createRoot(document.getElementById("root")!).render(<LocaleProvider><Shell /></LocaleProvider>);
