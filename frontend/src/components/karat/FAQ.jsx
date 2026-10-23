import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Eyebrow, MaskLines } from "./Reveal";

const faqs = [
  ["What do my clients see?", "Your catalog and a design tool for rings, bracelets, pendants, earrings and more, on your website. They can design something new, start from one of your existing pieces, and leave notes for you."],
  ["How does try-on work?", "Clients upload a photo or use their live camera to try on their own designs or your existing jewellery — on the hand, wrist, neck or ear."],
  ["What happens when a client finishes a design?", "It arrives in your studio with their details, ready for you to consult, refine and manage in the CRM."],
  ["What is a production-ready brief?", "Once a design is approved, Karat turns it into a complete brief your bench or production partner can work from."],
  ["What does early access cost?", "Early access pricing will be shared with everyone on the waitlist first."],
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
