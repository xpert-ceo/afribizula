import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const plans = [
  {
    title: "Service",

    price: "₦6,000",

    description:
      "For salons, agencies, freelancers, clinics, and service-based businesses.",

    features: [
      "Smart Booking System",
      "Commitment Payments",
      "Invoice Creation",
      "Staff Management",
      "Customer Booking Links",
    ],

    dark: false,
  },

  {
    title: "Retail",

    price: "₦10,000",

    description:
      "For pharmacies, supermarkets, stores, and growing retail operations.",

    features: [
      "Inventory Tracking",
      "Sales Analytics",
      "Invoice Management",
      "Order Tracking",
      "Staff Operations",
    ],

    dark: true,
  },

  {
    title: "Enterprise",

    price: "₦20,000",

    description:
      "For large businesses managing operations, suppliers, logistics, and commerce.",

    features: [
      "Everything Included",
      "Bulk Pricing Engine",
      "Supplier Management",
      "Logistics Integration",
      "B2B Marketplace Access",
    ],

    dark: false,
  },
];

// Features listed above that are NOT implemented in the current release (see docs/HANDOVER.md).
// They are labelled "coming soon" so the page does not advertise them as available today.
const ROADMAP = new Set([
  "Smart Booking System", "Commitment Payments", "Invoice Creation", "Customer Booking Links",
  "Invoice Management", "Order Tracking", "Bulk Pricing Engine", "Supplier Management",
  "Logistics Integration", "B2B Marketplace Access",
]);

const Pricing = () => {
  return (
    <section
      id="pricing"
      style={{
        position: "relative",

        background: "#050505",

        padding:
          "9rem 1.5rem",

        overflow: "hidden",
      }}
    >

      {/* PURPLE GLOW */}

      <div
        style={{
          position: "absolute",

          width: "700px",

          height: "700px",

          borderRadius: "999px",

          background:
            "rgba(124,58,237,0.18)",

          filter: "blur(140px)",

          top: "-20%",

          left: "-10%",
        }}
      />

      {/* GRID */}

      <div
        style={{
          position: "absolute",

          inset: 0,

          opacity: 0.05,

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

          maxWidth: "1240px",

          margin: "0 auto",
        }}
      >

        {/* TOP */}

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

          style={{
            textAlign: "center",

            marginBottom: "6rem",
          }}
        >

          <span
            style={{
              display: "inline-flex",

              padding:
                "0.75rem 1rem",

              borderRadius:
                "999px",

              background:
                "rgba(255,255,255,0.08)",

              border:
                "1px solid rgba(255,255,255,0.08)",

              color:
                "rgba(255,255,255,0.78)",

              fontSize: "0.92rem",

              marginBottom:
                "1.5rem",
            }}
          >
            Flexible Pricing
          </span>

          <h2
            style={{
              fontSize:
                "clamp(3rem, 6vw, 6rem)",

              lineHeight: "0.92",

              letterSpacing:
                "-5px",

              color: "white",

              fontWeight: 650,

              maxWidth: "900px",

              margin:
                "0 auto 2rem",
            }}
          >
            Built For
            Businesses
            At Every
            Stage
          </h2>

          <p
            style={{
              fontSize: "1.08rem",

              lineHeight: "1.9",

              color:
                "rgba(255,255,255,0.68)",

              maxWidth: "760px",

              margin: "0 auto",
            }}
          >
            Transparent pricing
            designed around the
            infrastructure your
            business actually needs.
            Start small, scale
            confidently, and expand
            into the Bizula ecosystem.
          </p>

        </motion.div>

        {/* PRICING GRID */}

        <div
          style={{
            display: "grid",

            gridTemplateColumns:
              "repeat(3, 1fr)",

            gap: "1.5rem",
          }}
          className="pricing-grid"
        >

          {plans.map(
            (plan, index) => (

              <motion.div

                key={plan.title}

                initial={{
                  opacity: 0,
                  y: 40,
                }}

                whileInView={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  duration: 0.7,
                  delay:
                    index * 0.08,
                }}

                viewport={{
                  once: true,
                }}

                whileHover={{
                  y: -8,
                }}

                style={{
                  position:
                    "relative",

                  padding:
                    "2rem",

                  borderRadius:
                    "36px",

                  background:
                    plan.dark
                      ? "#111111"
                      : "rgba(255,255,255,0.05)",

                  border:
                    plan.dark
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "1px solid rgba(255,255,255,0.06)",

                  overflow:
                    "hidden",

                  backdropFilter:
                    "blur(20px)",
                }}
              >

                {/* TOP */}

                <div
                  style={{
                    marginBottom:
                      "2rem",
                  }}
                >

                  <div
                    style={{
                      display:
                        "inline-flex",

                      padding:
                        "0.65rem 0.9rem",

                      borderRadius:
                        "999px",

                      background:
                        plan.dark
                          ? "rgba(124,58,237,0.18)"
                          : "rgba(255,255,255,0.08)",

                      color:
                        plan.dark
                          ? "#C4B5FD"
                          : "rgba(255,255,255,0.8)",

                      fontSize:
                        "0.88rem",

                      marginBottom:
                        "1.5rem",
                    }}
                  >
                    {plan.title}
                  </div>

                  <h3
                    style={{
                      fontSize:
                        "4rem",

                      letterSpacing:
                        "-4px",

                      color: "white",

                      fontWeight: 650,

                      lineHeight: "1",

                      marginBottom:
                        "0.8rem",
                    }}
                  >
                    {plan.price}
                    <span style={{ fontSize: "1rem", fontWeight: 500, letterSpacing: 0, opacity: 0.7 }}> / month</span>
                  </h3>

                  <p
                    style={{
                      color:
                        "rgba(255,255,255,0.68)",

                      lineHeight: "1.8",
                    }}
                  >
                    {plan.description}
                  </p>

                </div>

                {/* FEATURES */}

                <div
                  style={{
                    display: "flex",

                    flexDirection:
                      "column",

                    gap: "1rem",

                    marginBottom:
                      "2.5rem",
                  }}
                >

                  {plan.features.map(
                    (feature) => (

                      <div
                        key={feature}
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap: "0.8rem",

                          color:
                            "rgba(255,255,255,0.82)",

                          fontSize:
                            "0.96rem",
                        }}
                      >

                        <div
                          style={{
                            width: "8px",

                            height: "8px",

                            borderRadius:
                              "999px",

                            background:
                              "#7C3AED",
                          }}
                        />

                        {feature}
                        {ROADMAP.has(feature) && (
                          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>(coming soon)</span>
                        )}
                      </div>

                    )
                  )}

                </div>

                {/* BUTTON */}

                <Link to="/register"
                  style={{
                    width: "100%",

                    border: "none",

                    cursor: "pointer",

                    padding:
                      "1rem 1.2rem",

                    borderRadius:
                      "18px",

                    background:
                      plan.dark
                        ? "#7C3AED"
                        : "white",

                    color:
                      plan.dark
                        ? "white"
                        : "#0A0A0A",

                    fontWeight: 600,

                    fontSize: "0.95rem",
                  }}
                >
                  Get Started
                </Link>

                {/* GLOW */}

                <div
                  style={{
                    position:
                      "absolute",

                    width: "220px",

                    height: "220px",

                    borderRadius:
                      "999px",

                    background:
                      "rgba(124,58,237,0.14)",

                    filter:
                      "blur(90px)",

                    bottom: "-15%",

                    right: "-10%",
                  }}
                />

              </motion.div>

            )
          )}

        </div>

      </div>

      {/* RESPONSIVE */}

      <style>
        {`
          @media (max-width: 980px) {

            .pricing-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

    </section>
  );
};

export default Pricing;