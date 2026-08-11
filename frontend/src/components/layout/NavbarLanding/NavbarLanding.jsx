import React from "react";
import nexusLogo from "../../../assets/icons/Logo-nexus.png";

const NavbarLanding = () => {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-outline-strong/70 bg-background/90 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-7 sm:h-20 sm:px-10 lg:px-11"
      >
        <div className="flex items-center gap-12">
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 text-[20px] font-extrabold leading-none text-primary outline-none transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <img alt="Nexus logo" className="h-8 w-8 rounded-md object-contain" src={nexusLogo} />
            NEXUS
          </a>
          <div className="hidden items-center gap-8 text-[13px] font-medium text-text-variant md:flex">
            <a className="transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href="#top">
              Product
            </a>
            <a className="transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href="#how-it-works">
              How It Works
            </a>
            <a className="transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href="#features">
              Features
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[13px] font-medium">
          <a
            className="hidden rounded-xl px-5 py-2.5 text-text-variant transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:inline-flex"
            href="/login"
          >
            Sign In
          </a>
          <a
            className="rounded-lg bg-primary-action px-5 py-3 font-semibold text-white shadow-[0_4px_10px_rgba(41,77,227,0.25)] transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-6"
            href="/signup"
          >
            Get Started
          </a>
        </div>
      </nav>
    </header>
  );
};

export default NavbarLanding;
