import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { getAdminDisplayName, getAdminToken } from "../api/admin";

type HomeSection = "home" | "gallery" | "about";

function getDocumentTitle(pathname: string, hash: string, homeSection: HomeSection): string {
  if (pathname === "/") {
    if (homeSection === "gallery") {
      return "MeshFree-Gallery";
    }

    if (homeSection === "about") {
      return "MeshFree-About";
    }

    return "MeshFree-Home";
  }

  if (hash === "#about") {
    return "MeshFree-About";
  }

  if (pathname === "/upload" || pathname === "/submit") {
    return "MeshFree-Upload";
  }

  if (pathname === "/admin/login") {
    return "MeshFree-Sign in";
  }

  if (pathname === "/admin/dashboard") {
    return "MeshFree-Dashboard";
  }

  if (pathname.startsWith("/models/")) {
    return "MeshFree-Model";
  }

  return "MeshFree";
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasAdminToken = Boolean(getAdminToken());
  const adminDisplayName = getAdminDisplayName();
  const navSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [homeSection, setHomeSection] = useState<HomeSection>(() => {
    if (location.hash === "#gallery") {
      return "gallery";
    }

    if (location.hash === "#about") {
      return "about";
    }

    return "home";
  });

  const activeHomeSection =
    location.pathname === "/"
      ? homeSection
      : location.hash === "#about"
        ? "about"
        : "home";

  useEffect(() => {
    document.title = getDocumentTitle(location.pathname, location.hash, activeHomeSection);
  }, [activeHomeSection, location.hash, location.pathname]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetElement = document.getElementById(location.hash.slice(1));

    if (!targetElement) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setHomeSection("home");
      return;
    }

    if (location.hash === "#gallery") {
      setHomeSection("gallery");
      return;
    }

    if (location.hash === "#about") {
      setHomeSection("about");
      return;
    }

    setHomeSection("home");
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/") {
      return;
    }

    let animationFrameId = 0;

    const getSectionActivationTop = (element: HTMLElement) => {
      const computedStyle = window.getComputedStyle(element);
      const scrollMarginTop = Number.parseFloat(computedStyle.scrollMarginTop || "0") || 0;
      return element.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
    };

    const updateHomeSection = () => {
      animationFrameId = 0;

      const galleryElement = document.getElementById("gallery");
      const aboutElement = document.getElementById("about");
      const sectionProbe = window.scrollY + 1;

      let nextSection: HomeSection = "home";

      if (aboutElement && sectionProbe >= getSectionActivationTop(aboutElement)) {
        nextSection = "about";
      } else if (galleryElement && sectionProbe >= getSectionActivationTop(galleryElement)) {
        nextSection = "gallery";
      }

      setHomeSection((currentSection) => {
        return currentSection === nextSection ? currentSection : nextSection;
      });
    };

    const requestUpdate = () => {
      if (animationFrameId !== 0) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateHomeSection);
    };

    requestUpdate();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [location.pathname]);

  const handleNavSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    const trimmedQuery = navSearchInputRef.current?.value.trim() ?? "";

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }

    navigate({
      pathname: "/",
      search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      hash: "#gallery",
    });
  };

  const handleSectionNavigation = (section: "gallery" | "about") => {
    const targetPathname = section === "gallery" ? "/" : location.pathname;
    const nextHash = `#${section}`;

    if (location.pathname !== targetPathname) {
      navigate({
        pathname: targetPathname,
        hash: nextHash,
      });
      return;
    }

    if (location.pathname === "/") {
      setHomeSection(section);
    }

    const targetElement = document.getElementById(section);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (location.hash !== nextHash) {
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: nextHash,
        },
        { replace: true },
      );
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link className="brand-link" to="/">
              MeshFree
            </Link>
          </div>

          <div className="topbar-main">
            <nav className="topbar-nav topbar-link-group" aria-label="Primary navigation">
              <button
                className={
                  location.pathname === "/" && activeHomeSection === "gallery"
                    ? "nav-link nav-link-active"
                    : "nav-link"
                }
                type="button"
                onClick={() => handleSectionNavigation("gallery")}
              >
                Gallery
              </button>
              <button
                className={
                  (location.pathname === "/" && activeHomeSection === "about") ||
                  (location.pathname !== "/" && location.hash === "#about")
                    ? "nav-link nav-link-active"
                    : "nav-link"
                }
                type="button"
                onClick={() => handleSectionNavigation("about")}
              >
                About
              </button>
            </nav>

            <form className="nav-search-form" onSubmit={handleNavSearchSubmit}>
              <div className="nav-search-field">
                <input
                  key={location.search}
                  ref={navSearchInputRef}
                  className="nav-search-input"
                  type="search"
                  defaultValue={new URLSearchParams(location.search).get("q") ?? ""}
                  placeholder="Search"
                  aria-label="Search models"
                />
                <button className="nav-search-button" type="submit" aria-label="Search models">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.43 1.41-1.41-4.43-4.44A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9.01 4.5 4.5 0 0 1 0-9.01Z"
                    />
                  </svg>
                </button>
              </div>
            </form>

            <div className="topbar-action-group">
              {hasAdminToken ? (
                <NavLink
                  className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
                  to="/admin/dashboard"
                >
                  {adminDisplayName ?? "Dashboard"}
                </NavLink>
              ) : (
                <NavLink
                  className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
                  to="/admin/login"
                >
                  Sign in / Sign up
                </NavLink>
              )}

              <NavLink
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active topbar-upload-button" : "nav-link topbar-upload-button"
                }
                to="/upload"
              >
                Upload
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>

      <footer id="about" className="site-footer">
        <p className="footer-about">A lightweight platform for 3D model sharing and review.</p>
        <div className="footer-links">
          <a
            className="footer-link-with-icon"
            href="https://github.com/constellnoc/MeshFree"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              className="footer-link-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.59 2 12.24c0 4.51 2.87 8.34 6.84 9.69.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.1 0-1.13.39-2.05 1.03-2.77-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.06A9.33 9.33 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.06 2.75-1.06.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.77 0 3.97-2.35 4.84-4.58 5.09.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.24C22 6.59 17.52 2 12 2Z"
              />
            </svg>
            GitHub
          </a>
          <a href="mailto:constellnoc@gmail.com">Contact: constellnoc@gmail.com</a>
        </div>
        <p className="footer-meta">Copyright © 2026 Noctiluca</p>
      </footer>
    </div>
  );
}
