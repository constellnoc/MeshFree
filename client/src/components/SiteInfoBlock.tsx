export function SiteInfoBlock() {
  return (
    <>
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
    </>
  );
}
