import React, { useState, useEffect } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { TESTIMONIALS } from "../../constants/data";

export default function TestimonialsSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial((i) => (i + 1) % (TESTIMONIALS.length || 1)), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section style={{ padding: "100px 5%", background: C.nearBlack }}>
      <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <div className="section-label">What Travelers Say</div>
        <h2 className="display-heading" style={{ fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 56 }}>
          Loved by Thousands
          <br />
          of Travelers
        </h2>
        
        <div style={{ position: "relative", minHeight: 200 }}>
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} isActive={index === activeTestimonial} />
          ))}
        </div>
        
        <TestimonialDots total={TESTIMONIALS.length} active={activeTestimonial} onSelect={setActiveTestimonial} />
      </div>
    </section>
  );
}

const TestimonialCard = ({ testimonial, isActive }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity: isActive ? 1 : 0,
      transition: "opacity 0.6s ease",
      pointerEvents: isActive ? "auto" : "none",
    }}
  >
    <div className="card" style={{ padding: "40px 48px" }}>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 20 }}>
        {[...Array(testimonial.rating)].map((_, j) => (
          <Icon.star key={j} />
        ))}
      </div>
      <p style={{ fontSize: 18, lineHeight: 1.8, color: C.offWhite, fontStyle: "italic", marginBottom: 24 }}>
        "{testimonial.text}"
      </p>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{testimonial.name}</div>
        <div style={{ color: C.midGray, fontSize: 13 }}>{testimonial.role}</div>
      </div>
    </div>
  </div>
);

const TestimonialDots = ({ total, active, onSelect }) => (
  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 220 }}>
    {[...Array(total)].map((_, index) => (
      <button
        key={index}
        onClick={() => onSelect(index)}
        style={{
          width: index === active ? 24 : 8,
          height: 8,
          borderRadius: 4,
          background: index === active ? C.crimson : C.midGray,
          border: "none",
          cursor: "pointer",
          transition: "all 0.3s",
        }}
      />
    ))}
  </div>
);