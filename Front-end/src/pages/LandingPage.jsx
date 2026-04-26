import React from "react";
import Navbar from "../components/layouts/Navbar";
import Footer from "../components/layouts/Footer";
import HeroSection from "../components/landing/HeroSection";
import HowItWorks from "../components/landing/HowItWorks";
import FeaturesSection from "../components/landing/FeaturesSection";
import DestinationsSection from "../components/landing/DestinationsSection";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import PricingSection from "../components/landing/PricingSection";
import CTASection from "../components/landing/CTASection";
import AboutSection from "../components/landing/AboutSection";
import BlogsSection from "../components/landing/BlogsSection";

export default function LandingPage({ onLogin, onSignup }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar onLogin={onLogin} onSignup={onSignup} />
      <HeroSection onLogin={onLogin} onSignup={onSignup} />
      <HowItWorks />
      <FeaturesSection />
      <DestinationsSection onSignup={onSignup} />
      <TestimonialsSection />
      <PricingSection onSignup={onSignup} />
      <CTASection onSignup={onSignup} />
      <AboutSection />
      <BlogsSection />
      <Footer />
    </div>
  );
}