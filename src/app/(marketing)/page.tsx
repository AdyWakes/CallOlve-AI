import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { CallMe } from "@/components/landing/call-me";
import { Demo } from "@/components/landing/demo";
import { Features } from "@/components/landing/features";
import { UseCases } from "@/components/landing/use-cases";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <CallMe />
        <Demo />
        <Features />
        <UseCases />
        <Pricing />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
