import Link from "next/link";

export function CustomApparelGuidePage({ store }: { store: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Custom Apparel Guide
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          How custom orders work at Jah and Co — plus the different ways we can customize.
        </p>

        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Methods of Customization</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Jah and Co has specific methods when it comes to customizing the products we offer.
            </p>
          </section>

          <hr className="border-white/10" />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Standard Customization</h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Our normal customization service includes us creating a special design specifically for you.
                The design we create is based on your personality, style, and vibe.
              </p>
              <p>
                In order for us to learn that specific information, we ask you to complete the Style Survey.
                This short survey asks a few general questions that allow us to learn more about you.
                We&apos;ll create a personalized experience from your responses.
              </p>
              <p>
                Completing the survey will sign you up for email marketing, which you may occasionally receive.
                You&apos;ll also receive special offers, discounts, new product alerts, and more.
              </p>
              <div>
                <Link className="text-white hover:underline" href={`/${store}/customer-questionnaire`}>
                  Take the Style Survey
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">How to Start a Custom Order</h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                To get started on a custom order, head to the Custom Apparel page and locate the “Custom Shirt
                Request” product, then place an order.
              </p>
              <p>
                After placing your order you&apos;ll receive an email (not the order confirmation email) within the
                same or next day.
              </p>
              <p className="text-zinc-400">*If no email is received within 24 hours, please contact us.*</p>
              <p>
                The email is from us — we&apos;ll be in direct contact with you to get started with the customization
                process. Please respond to any email from us in a timely manner.
              </p>
              <p>
                When we complete the design(s), you&apos;ll receive the completed designs and you&apos;ll be asked to
                approve or reject. You can provide feedback and share inspiration to guide us.
              </p>
              <p>
                If you choose to reject, we&apos;ll create another design, or you can choose to cancel the whole
                process.
              </p>
              <p>
                If you accept, you&apos;ll then receive an invoice email shortly (pricing will be discussed during the
                process). The order will be processed once the invoice is paid.
              </p>
              <p>Processing may take 1–3 days upon payment.</p>
              <div>
                <Link className="text-white hover:underline" href={`/${store}/custom-apparel`}>
                  Go to Custom Apparel
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Shirts with Front Designs</h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                Some products have a design only on the front of the shirt. These shirts may have the option for
                you to add any design from our Design Gallery to the back.
              </p>
              <div>
                <Link className="text-white hover:underline" href={`/${store}/design-gallery`}>
                  Browse the Design Gallery
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Other Customization Options</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Other options for customization may include the ability to add text, numbers, or modify the colors
              of any shirt that already has a design. Customization options will be specified in the description
              for applicable products.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Customization for Large Groups or Occasions
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>Purchases for large groups, events, occasions, and anything related should contact us directly.</p>
              <p>
                These purchases have the ability to present a design of your own to be displayed onto our
                products.
              </p>
              <p className="text-zinc-400">*Currently only these purchases can present their own design.*</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
