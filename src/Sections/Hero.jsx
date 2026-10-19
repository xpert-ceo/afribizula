import { motion } from "framer-motion";

import HeroImage from "../assets/hero.jpg";

import GradientOrb from "../components/ui/GradientOrb";

import Magnetic from "../components/motions/Magnetic";

import { Link } from "react-router-dom";


const Hero = () => {
  return (
    <section
      style={{
        position: "relative",

        minHeight: "100vh",

        overflow: "hidden",

        background: "#F5F5F7",

        display: "flex",

        alignItems: "center",

        padding:
          "9rem 1.5rem 5rem",
      }}
    >
      {/* ORB */}

      <GradientOrb />

      {/* GRID */}

      <div
        style={{
          width: "100%",

          maxWidth: "1280px",

          margin: "0 auto",

          display: "grid",

          gridTemplateColumns:
            "1.05fr 1fr",

          gap: "4rem",

          alignItems: "center",
        }}
        className="hero-grid"
      >

        {/* LEFT */}

        <div>

          {/* BADGE */}

          <motion.div

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.6,
            }}

            style={{
              display: "inline-flex",

              alignItems: "center",

              gap: "0.6rem",

              padding:
                "0.7rem 1rem",

              borderRadius:
                "999px",

              background:
                "rgba(255,255,255,0.7)",

              border:
                "1px solid rgba(0,0,0,0.06)",

              marginBottom: "1.8rem",

              color:
                "rgba(0,0,0,0.72)",

              fontSize: "0.9rem",

              backdropFilter:
                "blur(16px)",
            }}
          >
            Infrastructure For
            African Commerce
          </motion.div>

          {/* HEADING */}

          <motion.h1

            initial={{
              opacity: 0,
              y: 30,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.7,
              delay: 0.1,
            }}

            style={{
              fontSize:
                "clamp(3.2rem, 7vw, 6.7rem)",

              lineHeight: "0.92",

              fontWeight: 650,

              letterSpacing: "-5px",

              color: "#0A0A0A",

              marginBottom: "1.8rem",

              maxWidth: "760px",
            }}
          >
            Run,
            Connect,
            And Grow
            Your Business
            From One
            Platform
          </motion.h1>

          {/* SUBTEXT */}

          <motion.p

            initial={{
              opacity: 0,
              y: 30,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.7,
              delay: 0.2,
            }}

            style={{
              fontSize: "1.05rem",

              lineHeight: "1.9",

              color:
                "rgba(0,0,0,0.65)",

              maxWidth: "620px",

              marginBottom: "2.2rem",
            }}
          >
            Manage operations,
            bookings, inventory,
            logistics, suppliers,
            orders, and customer
            interactions from one
            intelligent business
            ecosystem built for
            African businesses.
          </motion.p>

          {/* BUTTONS */}

          <motion.div

            initial={{
              opacity: 0,
              y: 30,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.7,
              delay: 0.3,
            }}

            style={{
              display: "flex",

              alignItems: "center",

              gap: "1rem",

              flexWrap: "wrap",

              marginBottom: "2.5rem",
            }}
          >

            {/* WHITE PRIMARY */}

            <Magnetic>

              <Link to="/register"
                style={{
                  
                  cursor: "pointer",

                  padding:
                    "1rem 1.45rem",

                  borderRadius:
                    "18px",

                  background:
                    "#FFFFFF",

                  color: "#0A0A0A",

                  fontWeight: 600,

                  fontSize: "0.95rem",

                  border:
                    "1px solid rgba(0,0,0,0.06)",

                  boxShadow:
                    "0 8px 30px rgba(0,0,0,0.04)",
                }}
              >
                Get Started
              </Link>

            </Magnetic>

            {/* BLACK SECONDARY */}

            <Link to="/login"
              style={{
                border: "none",

                cursor: "pointer",

                padding:
                  "1rem 1.45rem",

                borderRadius:
                  "18px",

                background:
                  "#0A0A0A",

                color: "white",

                fontWeight: 500,

                fontSize: "0.95rem",
              }}
            >
              Sign in
            </Link>

            {/* PLUM COMPLEMENTARY */}

            <a href="#marketplace"
              style={{
                border: "none",

                cursor: "pointer",

                padding:
                  "1rem 1.45rem",

                borderRadius:
                  "18px",

                background:
                  "#7C3AED",

                color: "white",

                fontWeight: 500,

                fontSize: "0.95rem",
              }}
            >
              Explore Marketplace
            </a>

          </motion.div>

          {/* STATS */}

          <motion.div

            initial={{
              opacity: 0,
              y: 30,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.7,
              delay: 0.4,
            }}

            style={{
              display: "flex",

              gap: "2.5rem",

              flexWrap: "wrap",
            }}
          >

            <div>
              <h3
                style={{
                  fontSize: "2rem",

                  fontWeight: 650,

                  color: "#0A0A0A",

                  marginBottom:
                    "0.3rem",
                }}
              >
                5+
              </h3>

              <p
                style={{
                  color:
                    "rgba(0,0,0,0.62)",

                  fontSize: "0.95rem",
                }}
              >
                User Ecosystems
              </p>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "2rem",

                  fontWeight: 650,

                  color: "#0A0A0A",

                  marginBottom:
                    "0.3rem",
                }}
              >
                B2B
              </h3>

              <p
                style={{
                  color:
                    "rgba(0,0,0,0.62)",

                  fontSize: "0.95rem",
                }}
              >
                Commerce Network
              </p>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "2rem",

                  fontWeight: 650,

                  color: "#0A0A0A",

                  marginBottom:
                    "0.3rem",
                }}
              >
                15%
              </h3>

              <p
                style={{
                  color:
                    "rgba(0,0,0,0.62)",

                  fontSize: "0.95rem",
                }}
              >
                Logistics Commission
              </p>
            </div>

          </motion.div>

        </div>

        {/* RIGHT */}

        <motion.div

          initial={{
            opacity: 0,
            scale: 0.95,
          }}

          animate={{
            opacity: 1,
            scale: 1,
          }}

          transition={{
            duration: 0.8,
          }}

          style={{
            position: "relative",

            display: "flex",

            justifyContent: "center",
          }}
        >

          {/* IMAGE */}

          <img
            src={HeroImage}
            alt="Bizula Hero"
            style={{
              width: "100%",

              maxWidth: "540px",

              height: "720px",

              objectFit: "cover",

              borderRadius: "36px",

              border:
                "1px solid rgba(0,0,0,0.06)",

              boxShadow:
                "0 30px 80px rgba(0,0,0,0.12)",
            }}
          />

          {/* FLOATING CARD 1 */}

          <motion.div

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: 0.4,
            }}

            style={{
              position: "absolute",

              top: "8%",

              left: "-5%",

              width: "240px",

              padding:
                "1rem 1.1rem",

              borderRadius:
                "22px",

              background:
                "rgba(255,255,255,0.88)",

              backdropFilter:
                "blur(24px)",

              border:
                "1px solid rgba(0,0,0,0.05)",

              boxShadow:
                "0 10px 40px rgba(0,0,0,0.08)",
            }}
          >

            <p
              style={{
                fontWeight: 600,

                color: "#0A0A0A",

                marginBottom:
                  "0.35rem",
              }}
            >
              Booking Confirmed
            </p>

            <span
              style={{
                fontSize: "0.92rem",

                color:
                  "rgba(0,0,0,0.62)",
              }}
            >
              ₦15,000 commitment
              received
            </span>

          </motion.div>

          {/* FLOATING CARD 2 */}

          <motion.div

            initial={{
              opacity: 0,
              y: 20,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              delay: 0.6,
            }}

            style={{
              position: "absolute",

              bottom: "18%",

              right: "-5%",

              width: "250px",

              padding:
                "1rem 1.1rem",

              borderRadius:
                "22px",

              background:
                "rgba(255,255,255,0.88)",

              backdropFilter:
                "blur(24px)",

              border:
                "1px solid rgba(0,0,0,0.05)",

              boxShadow:
                "0 10px 40px rgba(0,0,0,0.08)",
            }}
          >

            <p
              style={{
                fontWeight: 600,

                color: "#0A0A0A",

                marginBottom:
                  "0.35rem",
              }}
            >
              Dispatch Assigned
            </p>

            <span
              style={{
                fontSize: "0.92rem",

                color:
                  "rgba(0,0,0,0.62)",
              }}
            >
              Delivery arriving in
              24 mins
            </span>

          </motion.div>

        </motion.div>

      </div>

      {/* RESPONSIVE */}

      <style>
        {`
          @media (max-width: 980px) {

            .hero-grid {
              grid-template-columns: 1fr !important;
              gap: 4rem !important;
            }
          }
        `}
      </style>
    </section>
  );
};

export default Hero;