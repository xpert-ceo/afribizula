import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { Link } from "react-router-dom";

import {
  Menu,
  X,
} from "lucide-react";

import Magnetic from "../motions/Magnetic";

const navLinks = [
  {
    label: "Vision",
    href: "#vision",
  },

  {
    label: "Infrastructure",
    href: "#infrastructure",
  },

  {
    label: "Marketplace",
    href: "#marketplace",
  },

  {
    label: "Pricing",
    href: "#pricing",
  },

  {
    label: "FAQ",
    href: "#faq",
  },
];

const Navbar = () => {

  const [scrolled, setScrolled] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  useEffect(() => {

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );

  }, []);

  return (
    <>
      {/* NAVBAR */}

      <motion.header

        initial={{
          y: -40,
          opacity: 0,
        }}

        animate={{
          y: 0,
          opacity: 1,
        }}

        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}

        style={{
          position: "fixed",

          top: 0,

          left: 0,

          width: "100%",

          zIndex: 1000,

          display: "flex",

          justifyContent: "center",

          padding:
            "1.2rem 1.2rem",
        }}
      >

        <div
          style={{
            width: "100%",

            maxWidth: "1240px",

            display: "flex",

            alignItems: "center",

            justifyContent:
              "space-between",

            padding:
              "1rem 1.3rem",

            borderRadius: "24px",

            background: scrolled
              ? "rgba(255,255,255,0.88)"
              : "rgba(255,255,255,0.72)",

            border:
              "1px solid rgba(0,0,0,0.06)",

            backdropFilter:
              "blur(24px)",

            WebkitBackdropFilter:
              "blur(24px)",

            boxShadow: scrolled
              ? "0 10px 40px rgba(0,0,0,0.06)"
              : "none",

            transition:
              "all 0.35s ease",
          }}
        >

          {/* LOGO */}

          <a
            href="/"
            style={{
              textDecoration: "none",

              display: "flex",

              alignItems: "center",
            }}
          >

            <span
              style={{
                fontSize: "1.55rem",

                fontWeight: 600,

                letterSpacing: "-2px",

                color: "#0A0A0A",

                fontFamily:
                  "'Inter', sans-serif",
              }}
            >

              <span
                style={{
                  color: "#7C3AED",
                }}
              >
                b
              </span>

              izula

            </span>

          </a>

          {/* DESKTOP NAV */}

          <nav
            className="desktop-nav"
            style={{
              display: "flex",

              alignItems: "center",

              gap: "2.5rem",
            }}
          >

            {navLinks.map((link) => (

              <a
                key={link.label}

                href={link.href}

                style={{
                  position: "relative",

                  textDecoration: "none",

                  color:
                    "rgba(0,0,0,0.72)",

                  fontSize: "0.94rem",

                  fontWeight: 500,

                  letterSpacing:
                    "-0.2px",

                  transition:
                    "all 0.3s ease",
                }}
              >

                {link.label}

                <span
                  className="nav-line"
                  style={{
                    position: "absolute",

                    left: 0,

                    bottom: "-7px",

                    width: 0,

                    height: "1.5px",

                    background:
                      "#7C3AED",

                    transition:
                      "width 0.3s ease",
                  }}
                />

              </a>

            ))}

          </nav>

          {/* RIGHT */}

          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: "0.9rem",
            }}
          >

            {/* LOGIN */}
            
            <Link to="/login"
              className="desktop-login"
              style={{
                border: "none",

                background:
                  "transparent",

                cursor: "pointer",

                color:
                  "rgba(0,0,0,0.72)",

                fontSize: "0.92rem",

                fontWeight: 500,

                transition:
                  "all 0.3s ease",
              }}
            >
              Login
            </Link>

            {/* WHITE PRIMARY */}

            <div className="desktop-cta">

              <Magnetic>

                <Link to="/register"
                  style={{
                    
                    outline: "none",

                    cursor: "pointer",

                    padding:
                      "0.92rem 1.35rem",

                    borderRadius:
                      "16px",

                    background:
                      "#FFFFFF",

                    color: "#0A0A0A",

                    fontWeight: 600,

                    fontSize: "0.92rem",

                    border:
                      "1px solid rgba(0,0,0,0.08)",

                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.04)",
                  }}
                >
                  Get Started
                </Link>

              </Magnetic>

            </div>

            {/* MOBILE */}

            <button

              onClick={() =>
                setOpen(!open)
              }

              className="mobile-toggle"

              style={{
                border: "none",

                background:
                  "transparent",

                cursor: "pointer",

                display: "none",
              }}
            >

              {open ? (
                <X
                  size={24}
                  color="#0A0A0A"
                />
              ) : (
                <Menu
                  size={24}
                  color="#0A0A0A"
                />
              )}

            </button>

          </div>

        </div>

      </motion.header>

      {/* MOBILE MENU */}

      <AnimatePresence>

        {open && (

          <motion.div

            initial={{
              opacity: 0,
            }}

            animate={{
              opacity: 1,
            }}

            exit={{
              opacity: 0,
            }}

            transition={{
              duration: 0.25,
            }}

            style={{
              position: "fixed",

              inset: 0,

              zIndex: 999,

              background:
                "rgba(255,255,255,0.94)",

              backdropFilter:
                "blur(24px)",

              WebkitBackdropFilter:
                "blur(24px)",

              display: "flex",

              flexDirection: "column",

              padding:
                "7rem 2rem 2rem",

              gap: "2rem",
            }}
          >

            {navLinks.map((link) => (

              <a
                key={link.label}

                href={link.href}

                onClick={() =>
                  setOpen(false)
                }

                style={{
                  textDecoration:
                    "none",

                  color: "#0A0A0A",

                  fontSize: "2rem",

                  fontWeight: 600,

                  letterSpacing:
                    "-2px",
                }}
              >
                {link.label}
              </a>

            ))}

            {/* WHITE PRIMARY */}

            <Link to="/register"
              style={{
                marginTop: "1rem",

                
                outline: "none",

                cursor: "pointer",

                padding:
                  "1rem 1.4rem",

                borderRadius:
                  "18px",

                background:
                  "#FFFFFF",

                color: "#0A0A0A",

                fontWeight: 600,

                fontSize: "1rem",

                border:
                  "1px solid rgba(0,0,0,0.08)",
              }}
            >
              Get Started
            </Link>

            {/* BLACK SECONDARY */}

            <Link to="/login" onClick={() => setOpen(false)}
              style={{
                border: "none",

                outline: "none",

                cursor: "pointer",

                padding:
                  "1rem 1.4rem",

                borderRadius:
                  "18px",

                background:
                  "#0A0A0A",

                color: "white",

                fontWeight: 500,

                fontSize: "1rem",
              }}
            >
              Sign in
            </Link>

            {/* PLUM COMPLEMENTARY */}

            <a href="#marketplace" onClick={() => setOpen(false)}
              style={{
                border: "none",

                outline: "none",

                cursor: "pointer",

                padding:
                  "1rem 1.4rem",

                borderRadius:
                  "18px",

                background:
                  "#7C3AED",

                color: "white",

                fontWeight: 500,

                fontSize: "1rem",
              }}
            >
              Explore Marketplace
            </a>

          </motion.div>

        )}

      </AnimatePresence>

      {/* STYLES */}

      <style>
        {`
          .desktop-nav a:hover {
            color: #0A0A0A;
          }

          .desktop-nav a:hover .nav-line {
            width: 100%;
          }

          .desktop-login:hover {
            color: #0A0A0A;
          }

          @media (max-width: 980px) {

            .desktop-nav,
            .desktop-cta,
            .desktop-login {
              display: none !important;
            }

            .mobile-toggle {
              display: flex !important;
              align-items: center;
              justify-content: center;
            }
          }
        `}
      </style>
    </>
  );
};

export default Navbar;