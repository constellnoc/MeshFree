import { useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { getAdminDisplayName, getAdminToken } from "../api/admin";
import { useLanguage } from "../contexts/LanguageContext";
import { SiteInfoBlock } from "./SiteInfoBlock";

type TopbarSectionId = "home" | "gallery" | "about";
type HomeSectionId = Extract<TopbarSectionId, "home" | "gallery">;

const topbarSections = [
  { id: "home", kind: "home-root" },
  { id: "gallery", kind: "home-section", targetId: "gallery", hash: "#gallery" },
  { id: "about", kind: "route", pathname: "/about" },
] as const;

function getDocumentTitle(
  pathname: string,
  activeSection: TopbarSectionId | null,
  copy: ReturnType<typeof useLanguage>["copy"],
): string {
  if (pathname === "/about") {
    return copy.documentTitle.about;
  }

  if (pathname === "/") {
    if (activeSection === "gallery") {
      return copy.documentTitle.gallery;
    }

    return copy.documentTitle.home;
  }

  if (pathname === "/upload" || pathname === "/submit") {
    return copy.documentTitle.upload;
  }

  if (pathname === "/admin/login") {
    return copy.documentTitle.signIn;
  }

  if (pathname === "/admin/dashboard") {
    return copy.documentTitle.dashboard;
  }

  if (pathname.startsWith("/models/")) {
    return copy.documentTitle.model;
  }

  return copy.documentTitle.fallback;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, setLocale, copy } = useLanguage();
  const hasAdminToken = Boolean(getAdminToken());
  const adminDisplayName = getAdminDisplayName();
  const navSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [homeSection, setHomeSection] = useState<HomeSectionId>(() => {
    return location.pathname === "/" && location.hash === "#gallery" ? "gallery" : "home";
  });

  const activeTopbarSection: TopbarSectionId | null =
    location.pathname === "/about" ? "about" : location.pathname === "/" ? homeSection : null;

  useEffect(() => {
    document.title = getDocumentTitle(location.pathname, activeTopbarSection, copy);
  }, [activeTopbarSection, copy, location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/" || location.hash !== "#gallery") {
      return;
    }

    const targetElement = document.getElementById("gallery");

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
      const topbarElement = document.querySelector(".topbar");
      const topbarHeight = topbarElement?.getBoundingClientRect().height ?? 0;
      const activationProbe = window.scrollY + Math.max(topbarHeight + 24, window.innerHeight * 0.42);
      const nextSection: HomeSectionId =
        galleryElement && getSectionActivationTop(galleryElement) <= activationProbe
          ? "gallery"
          : "home";

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

    setHomeSection("gallery");
    navigate({
      pathname: "/",
      search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      hash: "#gallery",
    });
  };

  const handleSectionNavigation = (sectionId: TopbarSectionId) => {
    const section = topbarSections.find((entry) => entry.id === sectionId);

    if (!section) {
      return;
    }

    if (section.kind === "home-root") {
      setHomeSection("home");

      if (location.pathname === "/") {
        if (location.search || location.hash) {
          navigate("/", { replace: true });
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      navigate("/");
      return;
    }

    if (section.kind === "home-section") {
      setHomeSection("gallery");

      if (location.pathname !== "/") {
        navigate({ pathname: "/", hash: section.hash });
        return;
      }

      const targetElement = document.getElementById(section.targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (location.hash !== section.hash) {
        navigate(
          {
            pathname: "/",
            search: location.search,
            hash: section.hash,
          },
          { replace: true },
        );
      }

      return;
    }

    navigate(section.pathname);
  };

  const handleLocaleToggle = () => {
    setLocale(locale === "en" ? "zh-CN" : "en");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <button
              className={activeTopbarSection === "home" ? "brand-link brand-link-active" : "brand-link"}
              type="button"
              onClick={() => handleSectionNavigation("home")}
            >
              MeshFree
            </button>
          </div>

          <div className="topbar-main">
            <nav className="topbar-nav topbar-link-group" aria-label={copy.nav.primaryNavigation}>
              {topbarSections
                .filter((section) => section.id !== "home")
                .map((section) => (
                  <button
                    key={section.id}
                    className={activeTopbarSection === section.id ? "nav-link nav-link-active" : "nav-link"}
                    type="button"
                    onClick={() => handleSectionNavigation(section.id)}
                  >
                    {section.id === "gallery" ? copy.nav.gallery : copy.nav.about}
                  </button>
                ))}
            </nav>

            <div className="topbar-language-group" role="group" aria-label={copy.nav.languageGroupAriaLabel}>
              <button
                className="nav-link"
                type="button"
                onClick={handleLocaleToggle}
              >
                {copy.nav.languageToggleLabel}
              </button>
            </div>

            <form className="nav-search-form" onSubmit={handleNavSearchSubmit}>
              <div className="nav-search-field">
                <input
                  key={location.search}
                  ref={navSearchInputRef}
                  className="nav-search-input"
                  type="search"
                  defaultValue={new URLSearchParams(location.search).get("q") ?? ""}
                  placeholder={copy.nav.searchPlaceholder}
                  aria-label={copy.nav.searchAriaLabel}
                />
                <button className="nav-search-button" type="submit" aria-label={copy.nav.searchAriaLabel}>
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
                  {adminDisplayName ?? copy.nav.dashboardFallback}
                </NavLink>
              ) : (
                <NavLink
                  className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
                  to="/admin/login"
                >
                  {copy.nav.adminSignIn}
                </NavLink>
              )}

              <NavLink
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active topbar-upload-button" : "nav-link topbar-upload-button"
                }
                to="/upload"
              >
                {copy.nav.upload}
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>

      {location.pathname !== "/about" ? (
        <footer className="site-footer">
          <SiteInfoBlock />
        </footer>
      ) : null}
    </div>
  );
}
