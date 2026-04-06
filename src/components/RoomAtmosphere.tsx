export default function RoomAtmosphere() {
  return (
    <>
      <div className="room" />
      <div className="bookshelf" />
      {/* Ambient light pools */}
      <div
        className="light-pool"
        style={
          {
            width: 500,
            height: 400,
            bottom: -100,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(ellipse,rgba(200,120,30,0.18),transparent 70%)",
            "--d": "5s",
            "--delay": "0s",
            "--min": "0.6",
            "--max": "1",
          } as React.CSSProperties
        }
      />
      <div
        className="light-pool"
        style={
          {
            width: 300,
            height: 300,
            top: "20%",
            left: "10%",
            background:
              "radial-gradient(ellipse,rgba(180,100,20,0.06),transparent 70%)",
            "--d": "8s",
            "--delay": "1s",
            "--min": "0.3",
            "--max": "0.6",
          } as React.CSSProperties
        }
      />
      <div
        className="light-pool"
        style={
          {
            width: 250,
            height: 250,
            top: "30%",
            right: "5%",
            background:
              "radial-gradient(ellipse,rgba(160,80,10,0.05),transparent 70%)",
            "--d": "7s",
            "--delay": "2s",
            "--min": "0.2",
            "--max": "0.5",
          } as React.CSSProperties
        }
      />
    </>
  );
}
