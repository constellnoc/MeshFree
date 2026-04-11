import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/submit", label: "Submit" },
  { to: "/admin/login", label: "Admin Login" },
  { to: "/admin/dashboard", label: "Admin Dashboard" },
];

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">MeshFree MVP</p>
          <h1>Frontend Skeleton</h1>
        </div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
