import ScrollContainer from "./ScrollContainer";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="pt-[130px] w-full flex flex-col items-center">
      <div
        className="text-center mb-12"
        style={{ animation: "ember-in 1.5s ease forwards" }}
      >
        <h1
          className="font-pinyon text-[clamp(3rem,8vw,5rem)] text-amber-pale mb-2"
          style={{
            textShadow:
              "0 0 30px rgba(232,168,74,0.5), 0 0 60px rgba(201,124,42,0.3)",
          }}
        >
          {title}
        </h1>
      </div>
      <div style={{ animation: "ember-in 2s ease forwards 0.4s", opacity: 0 }}>
        <ScrollContainer>
          <div className="relative z-[2] text-center py-16">
            <div className="flex items-center gap-3 justify-center mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
              <span className="font-cormorant text-parchment-aged text-sm opacity-60">
                ✦ ❧ ✦
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
            </div>
            <p className="font-cormorant italic text-xl text-ink-sepia opacity-60 leading-[2] max-w-md mx-auto">
              Coming soon — the quill is still writing this page
            </p>
            <div className="mt-8 text-4xl" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>
              🕯️
            </div>
          </div>
        </ScrollContainer>
      </div>
    </div>
  );
}
