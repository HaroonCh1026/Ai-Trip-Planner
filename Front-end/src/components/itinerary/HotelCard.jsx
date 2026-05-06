import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function HotelCard({ hotel }) {
  const accent = "#5CCC5C";

  return (
    <div
      style={{
        marginTop: 28,
        padding: "22px 24px",
        background: "rgba(50,180,50,0.06)",
        border: "1px solid rgba(50,180,50,0.22)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            background: "rgba(50,180,50,0.15)",
            padding: 10,
            borderRadius: 8,
            color: accent,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon.hotel />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: accent,
              marginBottom: 6,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Accommodation
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 19,
              fontWeight: 600,
              marginBottom: 8,
              lineHeight: 1.25,
              color: C.offWhite,
            }}
          >
            {hotel.name}
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              rowGap: 6,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: C.midGray,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon.location /> {hotel.location || ''}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: accent,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {hotel.price || hotel.priceRange}
            </span>
            {hotel.rating && (
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(232,232,232,0.85)",
                  display: "inline-flex",
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
                color: "rgba(232,232,232,0.75)",
                marginTop: 10,
                lineHeight: 1.65,
              }}
            >
              {hotel.why}
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(hotel.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="vai-focusable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              fontSize: 12,
              color: accent,
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