import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Eyebrow, MaskLines } from "./Reveal";

const faqs = [
  ["How does the embed install?", "Paste one script tag into your site. It works with Shopify, WordPress, Squarespace, Wix and custom builds, and inherits your fonts and colours."],
  ["Can I use my own catalogue and pricing?", "Yes. You define the metals, stones, cuts, settings and price rules your clients can choose from."],
  ["How does virtual try-on work?", "Clients open their phone or laptop camera and see their concept rendered on their hand in real time — no app download."],
  ["What happens when a client finishes a design?", "The concept, specs and contact details land in your Karat CRM, where you can follow up, quote and track it to completion."],
  ["What does early access cost?", "Early access pricing will be shared with the first jeweler cohort. Join the waitlist to hear first."],
];

export const FAQ = () => (
  <section id="faq" data-testid="faq-section" className="bg-cream py-24 text-onyx lg:py-36">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:px-16">
      <div className="lg:col-span-4">
        <Eyebrow light>Questions</Eyebrow>
        <h2 className="mt-5 font-display text-5xl font-light leading-[1] tracking-tight">
          <MaskLines inView lines={["Asked,", <em key="a" className="italic text-gold-deep">answered.</em>]} />
        </h2>
      </div>
      <Accordion type="single" collapsible className="lg:col-span-8">
        {faqs.map(([q, a], i) => (
          <AccordionItem key={q} value={`i${i}`} className="border-sand">
            <AccordionTrigger data-testid={`faq-item-trigger-${i + 1}`} className="py-6 text-left font-display text-2xl font-normal hover:no-underline sm:text-[1.7rem]">
              {q}
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-base text-zinc-600">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);
