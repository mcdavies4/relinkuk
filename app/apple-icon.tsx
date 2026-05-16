import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#1D9E75",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          fontSize: 120,
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
