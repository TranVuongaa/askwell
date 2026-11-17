import { APP_NAME } from "@askwell/shared";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-20 sm:px-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-28 border-b border-white/15 pb-6 text-sm font-semibold tracking-wide">
          {APP_NAME}
        </header>
        <section className="rounded-3xl border border-white/15 bg-white/[0.04] px-7 py-16 shadow-2xl backdrop-blur-xl sm:px-14">
          <p className="mb-5 text-sm uppercase tracking-[0.25em] text-neutral-400">Support, ready when you are</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Answers from the knowledge you already have.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-400">
            {APP_NAME} is coming together. Soon, you’ll be able to add a helpful chat to any website.
          </p>
        </section>
      </div>
    </main>
  );
}
