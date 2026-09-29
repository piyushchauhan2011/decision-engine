import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useLocation,
} from "@tanstack/react-router";
import { validatePageSearch } from "../search";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Elsewhere — considered stays" },
    ],
  }),
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: RootDocument,
  notFoundComponent: () => (
    <main className="container not-found">
      <h1>Page not found</h1>
      <Link to="/">Return home</Link>
    </main>
  ),
});

function RootDocument() {
  const search = validatePageSearch(useLocation({ select: (location) => location.search }));
  const overrides = {
    country: search.country,
    offers: search.offers,
    guide: search.guide,
    "exp.arrival-flow": search["exp.arrival-flow"],
    "exp.destination-density": search["exp.destination-density"],
    "exp.planning-guide-detail": search["exp.planning-guide-detail"],
  };
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link to="/" search={overrides} className="wordmark" aria-label="Elsewhere home">
              elsewhere<span>.</span>
            </Link>
            <nav aria-label="Main navigation">
              <Link to="/" search={overrides}>
                Home
              </Link>
              <Link to="/destinations" search={overrides}>
                Destinations
              </Link>
            </nav>
            <span className="header-note">Stays with a sense of place</span>
          </div>
        </header>
        <Outlet />
        <footer className="site-footer">
          <div className="container">
            <strong>elsewhere.</strong>
            <p>Independent hotels and slower journeys, selected with care.</p>
            <Link to="/destinations" search={overrides}>
              Explore destinations →
            </Link>
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  );
}
