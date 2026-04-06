export default function Candle() {
  return (
    <div className="candle-wrap">
      <div className="candle-glow" />
      <div
        className="smoke-wisp"
        style={
          {
            "--d": "5s",
            "--delay": "0s",
            "--dx": "6px",
            "--dx2": "-4px",
          } as React.CSSProperties
        }
      />
      <div
        className="smoke-wisp"
        style={
          {
            "--d": "6s",
            "--delay": "1.5s",
            "--dx": "-5px",
            "--dx2": "8px",
            left: "calc(50% + 5px)",
          } as React.CSSProperties
        }
      />
      <div
        className="smoke-wisp"
        style={
          {
            "--d": "7s",
            "--delay": "3s",
            "--dx": "10px",
            "--dx2": "-8px",
            left: "calc(50% - 3px)",
          } as React.CSSProperties
        }
      />
      <div className="flame-wrap">
        <div className="flame-outer" />
        <div className="flame-inner" />
        <div className="flame-core" />
      </div>
      <div className="candle-wick" />
      <div className="candle-body">
        <div className="candle-drip" />
      </div>
    </div>
  );
}
