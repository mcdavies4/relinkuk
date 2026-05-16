import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#1D9E75",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          letterSpacing: "-0.03em",
        }}
      >
        r
      </div>
    ),
    { ...size }
  );
}
