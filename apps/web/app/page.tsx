import Link from "next/link";
import { APP_NAME } from "@askwell/shared";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Everything you need to get started.",
    features: ["1 project", "100 messages / month", "3 knowledge sources", "Askwell badge included"],
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    description: "More room to grow, with a widget that feels like yours.",
    features: ["5 projects", "2,000 messages / month", "25 knowledge sources", "Full widget customization", "Remove the Askwell badge"],
    featured: true,
  },
];

const steps = [
  { number: "01", title: "Add what you know", text: "Upload a product guide or paste in the answers your customers need." },
  { number: "02", title: "Make it yours", text: "Askwell learns from your content and gives your support chat a home." },
  { number: "03", title: "Add it to your site", text: "Copy one small script tag. Your chat is ready wherever your customers are." },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <main>
      <nav className="site-nav page-wrap" aria-label="Main navigation">
        <Link className="wordmark" href="/" aria-label={`${APP_NAME} home`}><span className="brand-mark">a.</span>{APP_NAME}</Link>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <Link className="nav-cta" href="/sign-up">Get started <Arrow /></Link>
      </nav>

      <section className="hero page-wrap">
        <div className="hero-copy enter-up">
          <div className="eyebrow"><span className="status-dot" /> SUPPORT THAT KNOWS YOUR PRODUCT</div>
          <h1>Good answers.<br /><span>Right on your site.</span></h1>
          <p className="hero-lede">Give every customer a helpful answer, any time. Askwell turns your product knowledge into a support chat that feels like part of your team.</p>
          <div className="hero-actions">
            <Link className="button button-light" href="/sign-up">Start free <Arrow /></Link>
            <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
          </div>
          <p className="hero-note">Free to start <span>·</span> No credit card required</p>
        </div>

        <div className="hero-art enter-up delay-1" aria-label="Illustration of an Askwell support chat">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="orbit-core"><span>a.</span></div>
          <div className="chat-card glass-card">
            <div className="chat-head"><div className="chat-avatar">a.</div><div><strong>Ask us anything</strong><small><span className="status-dot" /> Here to help</small></div><span className="chat-menu">···</span></div>
            <div className="chat-body">
              <div className="chat-time">TODAY, 10:42 AM</div>
              <div className="chat-message visitor-message">How do I get started?</div>
              <div className="chat-message bot-message"><span className="tiny-mark">a.</span><span>You can be up and running in just a few minutes. Add your product info, then paste one line of code into your site.</span></div>
              <div className="chat-input">Ask a question <span>↑</span></div>
            </div>
          </div>
          <div className="floating-note note-top"><span className="note-icon">✳</span><span><b>Knows your product</b><small>Answers from your content</small></span></div>
          <div className="floating-note note-bottom"><span className="note-spark">✦</span><span><b>Always on</b><small>Even after you log off</small></span></div>
          <div className="art-caption">A little more helpful, around the clock.</div>
        </div>
      </section>

      <div className="trust-strip page-wrap"><span>YOUR PRODUCT KNOWLEDGE,</span><i /> <span>READY WHEN THEY ARE.</span><div className="strip-rule" /></div>

      <section className="section page-wrap" id="how-it-works">
        <div className="section-heading reveal">
          <p className="eyebrow">THREE STEPS. THAT’S IT.</p>
          <h2>From what you know<br />to <span>help on every page.</span></h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => <article className="step-card reveal" key={step.number} style={{ "--step-index": index } as React.CSSProperties}>
            <div className="step-top"><span>{step.number}</span><span className="step-glyph">{["⌘", "✳", "↗"][index]}</span></div>
            <h3>{step.title}</h3><p>{step.text}</p>
            <div className="step-line" />
          </article>)}
        </div>
      </section>

      <section className="showcase page-wrap reveal">
        <div className="showcase-copy"><p className="eyebrow">MADE FOR YOUR PRODUCT</p><h2>Helpful sounds<br />like <span>you.</span></h2><p>Give your customers a simple place to find answers. Askwell uses the information you share, so every reply starts with what you already know.</p><a className="text-link" href="#pricing">Find your plan <span aria-hidden="true">→</span></a></div>
        <div className="showcase-visual">
          <div className="visual-window glass-card"><div className="window-bar"><span /><span /><span /><div>yourwebsite.com</div></div><div className="window-content"><div className="window-nav"><b>studio north</b><span>WORK　 ABOUT　 CONTACT</span></div><div className="window-sun" /><div className="window-title">Thoughtful<br />by design.</div><div className="window-button">EXPLORE OUR WORK ↗</div><div className="widget-button">✳</div></div></div>
          <div className="visual-label"><span className="status-dot" /> ONE LINE OF CODE. THAT’S ALL IT TAKES.</div>
        </div>
      </section>

      <section className="section pricing-section page-wrap" id="pricing">
        <div className="section-heading centered reveal"><p className="eyebrow">SIMPLE, HONEST PRICING</p><h2>A good place to <span>start.</span></h2><p>Start free and find your rhythm. Upgrade when you’re ready for more.</p></div>
        <div className="pricing-grid">
          {plans.map((plan, index) => <article className={`price-card ${plan.featured ? "price-card-featured" : ""} reveal`} key={plan.name} style={{ "--step-index": index } as React.CSSProperties}>
            {plan.featured && <div className="popular-tag">FOR THE NEXT CHAPTER</div>}
            <div className="price-top"><div><h3>{plan.name}</h3><p>{plan.description}</p></div><div className="price">{plan.price}<span>/ month</span></div></div>
            <Link className={`button ${plan.featured ? "button-light" : "button-outline"}`} href="/sign-up">{plan.featured ? "Get started with Pro" : "Start free"} <Arrow /></Link>
            <div className="price-divider" /><p className="includes">WHAT’S INCLUDED</p>
            <ul>{plan.features.map((feature) => <li key={feature}><span className="check">✓</span>{feature}</li>)}</ul>
          </article>)}
        </div>
        <p className="pricing-footnote reveal">All plans include the same thoughtful support experience.</p>
      </section>

      <section className="install-section page-wrap reveal">
        <div className="install-copy"><p className="eyebrow">SMALL SCRIPT. BIG HELP.</p><h2>One line to<br /><span>make it yours.</span></h2><p>Drop this into your site and let your product knowledge do the talking.</p><Link className="text-link" href="/sign-up">Try it for free <span aria-hidden="true">→</span></Link></div>
        <div className="code-card glass-card"><div className="code-top"><span className="code-dots"><i /><i /><i /></span><span>your-site.html</span><span className="copy-label">EXAMPLE INSTALL</span></div><pre><code><span className="code-muted">&lt;!-- Askwell support chat --&gt;</span>{"\n"}<span className="code-pink">&lt;script</span> <span className="code-green">src</span>=<span className="code-yellow">{`"https://askwell.app/widget.js"`}</span>{"\n  "}<span className="code-green">data-key</span>=<span className="code-yellow">{`"pk_your_public_key"`}</span><span className="code-pink">&gt;&lt;/script&gt;</span></code></pre><div className="code-footer"><span><i className="status-dot" /> READY IN MINUTES</span><span>HTML · 3 LINES</span></div></div>
      </section>

      <section className="final-cta page-wrap reveal"><div className="cta-orb" /><div className="cta-content"><p className="eyebrow">YOUR NEXT HELPFUL THING</p><h2>Let’s make support<br /><span>feel a little easier.</span></h2><Link className="button button-light" href="/sign-up">Start free <Arrow /></Link><p>No credit card required. Just a good place to start.</p></div></section>

      <footer className="site-footer page-wrap"><Link className="wordmark" href="/"><span className="brand-mark">a.</span>{APP_NAME}</Link><p>Good answers, right on your site.</p><div className="footer-links"><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><Link href="/sign-up">Get started <Arrow /></Link></div><span className="copyright">© {new Date().getFullYear()} {APP_NAME}</span></footer>
    </main>
  );
}
