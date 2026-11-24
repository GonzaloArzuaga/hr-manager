import React from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function LegalPage({ title, intro, updatedAt, sections }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8ff] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar brandHref="/home" />

      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <header className="mb-6">
            <h1 className="mb-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Última actualización: {updatedAt}
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{intro}</p>
          </header>

          <div className="space-y-4">
            {sections.map(({ title: sectionTitle, paragraphs = [], items = [] }) => (
              <section
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
                key={sectionTitle}
              >
                <h2 className="mb-2 text-base font-bold text-slate-900">{sectionTitle}</h2>
                {paragraphs.map((paragraph) => (
                  <p className="mb-2 text-sm leading-relaxed text-slate-600 last:mb-0" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
                {items.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
