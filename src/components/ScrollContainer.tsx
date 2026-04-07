interface ScrollContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function ScrollContainer({
  children,
  className = "",
}: ScrollContainerProps) {
  return (
    <div className={`relative w-[min(900px,98vw)] mx-auto ${className}`}>
      <div className="scroll-rod" />
      <div className="scroll-body">
        <div className="parchment-light" />
        {children}
      </div>
      <div className="scroll-rod bottom" />
    </div>
  );
}
