import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function HotelCard({ hotel }) {
  return (
    <div
      style={{
        marginTop: 32,
        padding: "24px",
        background: "rgba(50,180,50,0.07)",
        border: "1px solid rgba(50,180,50,0.2)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            background: "rgba(50,180,50,0.15)",
            padding: 10,
            borderRadius: 8,
            color: "#5CCC5C",
            flexShrink: 0,
          }}
        >
          <Icon.hotel />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "#5CCC5C",
              marginBottom: 4,
            }}
          >
            ACCOMMODATION
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {hotel.name}
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, color: C.midGray }}>
              <Icon.location style={{ display: "inline" }} />{" "}
              {hotel.location || hotel.price}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#5CCC5C",
              }}
            >
              {hotel.price || hotel.priceRange}
            </span>
            {hotel.rating && (
              <span
                style={{
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon.star /> {hotel.rating}
              </span>
            )}
          </div>
          {hotel.why && (
            <p
              style={{
                fontSize: 12,
                color: C.midGray,
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              {hotel.why}
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(hotel.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              fontSize: 12,
              color: "#5CCC5C",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <Icon.map /> View on Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}