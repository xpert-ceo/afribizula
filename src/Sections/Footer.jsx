import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import {
  FaXTwitter,
  FaInstagram,
  FaTiktok,
  FaThreads,
} from "react-icons/fa6";

const footerLinks = [
  {
    title: "Platform",

    links: [
      {
        name: "Infrastructure",
        href: "#infrastructure",
      },

      {
        name: "Marketplace",
        href: "#marketplace",
      },

      {
        name: "Pricing",
        href: "#pricing",
      },

      {
        name: "FAQ",
        href: "#faq",
      },
    ],
  },

  {
    title: "Solutions",

    links: [
      {
        name: "Bookings",
        href: "#infrastructure",
      },

      {
        name: "Retail Operations",
        href: "#infrastructure",
      },

      {
        name: "Logistics",
        href: "#marketplace",
      },

      {
        name: "B2B Commerce",
        href: "#marketplace",
      },
    ],
  },

  {
    title: "Company",

    links: [
      {
        name: "Vision",
        href: "#vision",
      },
      // Privacy Policy and Terms of Service links were removed because the pages do not exist yet.
      // Add them back once the owner supplies the legal text (see docs/HANDOVER.md).

      {
        name: "Contact",
        href: "#footer",
      },
    ],
  },
];

// Social profiles. Links render only once a real URL is filled in (they were href="#" placeholders).
const SOCIAL_LINKS = [
  { Icon: FaXTwitter, label: "X (Twitter)", href: "" },
  { Icon: FaInstagram, label: "Instagram", href: "" },
  { Icon: FaTiktok, label: "TikTok", href: "" },
  { Icon: FaThreads, label: "Threads", href: "" },
].filter((s) => s.href);

const Footer = () => {
  return (
    <footer
      id="footer"
      style={{
        position: "relative",

        background: "#050505",

        padding:
          "7rem 1.5rem 2rem",

        overflow: "hidden",
      }}
    >
      {/* GLOW */}

      <div
        style={{
          position: "absolute",

          width: "700px",

          height: "700px",

          borderRadius: "999px",

          background:
            "rgba(124,58,237,0.12)",

          filter: "blur(140px)",

          top: "-20%",

          right: "-10%",
        }}
      />

      {/* GRID */}

      <div
        style={{
          position: "absolute",

          inset: 0,

          opacity: 0.04,

          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",

          backgroundSize:
            "80px 80px",
        }}
      />

      {/* CONTAINER */}

      <div
        style={{
          position: "relative",

          zIndex: 2,

          width: "100%",

          maxWidth: "1280px",

          margin: "0 auto",
        }}
      >
        {/* TOP */}

        <div
          style={{
            display: "grid",

            gridTemplateColumns:
              "1.2fr 1fr",

            gap: "5rem",

            paddingBottom:
              "5rem",

            borderBottom:
              "1px solid rgba(255,255,255,0.08)",
          }}
          className="footer-top"
        >
          {/* LEFT */}

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.7,
            }}

            viewport={{
              once: true,
            }}
          >
            <span
              style={{
                display: "inline-flex",

                padding:
                  "0.7rem 1rem",

                borderRadius:
                  "999px",

                background:
                  "rgba(255,255,255,0.06)",

                border:
                  "1px solid rgba(255,255,255,0.08)",

                color:
                  "rgba(255,255,255,0.72)",

                fontSize: "0.9rem",

                marginBottom:
                  "1.5rem",
              }}
            >
              Bizula Commerce Infrastructure
            </span>

            <h2
              style={{
                fontSize:
                  "clamp(3rem, 6vw, 5.8rem)",

                lineHeight: "0.92",

                letterSpacing:
                  "-5px",

                color: "white",

                fontWeight: 650,

                maxWidth: "760px",

                marginBottom:
                  "1.5rem",
              }}
            >
              The Future
              Of African
              Commerce
              Starts Here
            </h2>

            <p
              style={{
                color:
                  "rgba(255,255,255,0.66)",

                lineHeight: "1.9",

                fontSize: "1.02rem",

                maxWidth: "620px",

                marginBottom:
                  "2rem",
              }}
            >
              Bizula connects
              businesses,
              suppliers,
              logistics providers,
              and customers into
              one unified commerce
              ecosystem built for
              Africa’s next digital
              economy.
            </p>

            {/* SOCIALS */}

            <div
              style={{
                display: "flex",

                alignItems: "center",

                gap: "1rem",
              }}
            >
              {SOCIAL_LINKS.map(({ Icon, label, href }, i) => (
                <motion.a
                  key={i}

                  whileHover={{
                    y: -4,
                  }}

                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"

                  style={{
                    width: "54px",

                    height: "54px",

                    borderRadius:
                      "18px",

                    background:
                      "rgba(255,255,255,0.05)",

                    border:
                      "1px solid rgba(255,255,255,0.08)",

                    display: "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    color: "white",

                    fontSize: "1.1rem",

                    textDecoration:
                      "none",
                  }}
                >
                  <Icon />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* RIGHT */}

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}

            whileInView={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.7,
              delay: 0.1,
            }}

            viewport={{
              once: true,
            }}
          >
            <div
              style={{
                padding:
                  "2rem",

                borderRadius:
                  "32px",

                background:
                  "rgba(255,255,255,0.04)",

                border:
                  "1px solid rgba(255,255,255,0.08)",

                backdropFilter:
                  "blur(20px)",
              }}
            >
              <span
                style={{
                  display:
                    "inline-block",

                  color:
                    "#C4B5FD",

                  marginBottom:
                    "1rem",

                  fontSize:
                    "0.92rem",

                  fontWeight: 500,
                }}
              >
                Join Bizula
              </span>

              <h3
                style={{
                  color: "white",

                  fontSize: "2rem",

                  lineHeight: "1",

                  letterSpacing:
                    "-2px",

                  fontWeight: 650,

                  marginBottom:
                    "1rem",
                }}
              >
                Get Started
              </h3>

              <p
                style={{
                  color:
                    "rgba(255,255,255,0.65)",

                  lineHeight:
                    "1.8",

                  marginBottom:
                    "2rem",
                }}
              >
                Create an account to set up your business, manage inventory and record sales. (A newsletter sign-up is not available yet.)
              </p>

              {/* The previous newsletter form had no backend; replaced with a working link. */}
              <Link
                to="/register"
                style={{
                  display: "block",
                  textAlign: "center",
                  width: "100%",
                  padding: "1rem 1.2rem",
                  borderRadius: "16px",
                  background: "#7C3AED",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                Create your account
              </Link>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM */}

        <div
          style={{
            paddingTop: "2rem",

            display: "flex",

            justifyContent:
              "space-between",

            alignItems: "center",

            gap: "2rem",

            flexWrap: "wrap",
          }}
          className="footer-bottom"
        >
          {/* LEFT */}

          <div>
            <h3
              style={{
                color: "white",

                fontSize: "1.4rem",

                fontWeight: 650,

                marginBottom:
                  "0.4rem",
              }}
            >
              Bizula
            </h3>

            <p
              style={{
                color:
                  "rgba(255,255,255,0.5)",

                fontSize: "0.92rem",
              }}
            >
              © 2026 Bizula.
              All rights reserved.
            </p>
          </div>

          {/* LINKS */}

          <div
            style={{
              display: "flex",

              gap: "4rem",

              flexWrap: "wrap",
            }}
            className="footer-links"
          >
            {footerLinks.map(
              (group) => (
                <div
                  key={group.title}
                >
                  <h4
                    style={{
                      color:
                        "white",

                      fontSize:
                        "0.95rem",

                      marginBottom:
                        "1rem",
                    }}
                  >
                    {group.title}
                  </h4>

                  <div
                    style={{
                      display:
                        "flex",

                      flexDirection:
                        "column",

                      gap: "0.8rem",
                    }}
                  >
                    {group.links.map(
                      (link) => (
                        <a
                          key={link.name}
                          href={link.href}
                          style={{
                            color:
                              "rgba(255,255,255,0.58)",

                            textDecoration:
                              "none",

                            fontSize:
                              "0.92rem",

                            transition:
                              "0.3s ease",
                          }}
                        >
                          {link.name}
                        </a>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* RESPONSIVE */}

      <style>
        {`
          @media (max-width: 980px) {

            .footer-top {
              grid-template-columns: 1fr !important;
            }

            .footer-bottom {
              flex-direction: column !important;
              align-items: flex-start !important;
            }

            .footer-links {
              gap: 2rem !important;
            }
          }
        `}
      </style>
    </footer>
  );
};

export default Footer;