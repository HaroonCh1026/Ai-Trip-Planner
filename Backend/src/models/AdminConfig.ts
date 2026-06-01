import mongoose, { Schema, Document } from 'mongoose';

/**
 * AdminConfig — singleton Mongo document holding operations parameters that
 * the admin can edit live without redeploying.
 *
 * Pattern: ONE document per collection. We use a fixed `key: "default"` so
 * lookups are cheap and there's no ambiguity. The service layer
 * (adminConfig.service.ts) handles get/upsert + sensible defaults.
 *
 * Why Mixed for the override dictionaries?
 *   `vehicleOverridesPKR` and `flightRouteOverridesPKR` are sparse maps
 *   (only entries that were edited). Using Mixed keeps the schema simple
 *   and lets us add new vehicle/route keys without migrations.
 */

export interface IAdminConfig extends Document {
  key: 'default';                    // singleton anchor
  // ── Revenue model ────────────────────────────────────────────────────────
  tripServiceFeePercent: number;    // % added on top of trip cost at booking
  // ── Free tier ────────────────────────────────────────────────────────────
  freeTripLimit: number;            // # of free trips before Pro upgrade required
  // ── Fuel ─────────────────────────────────────────────────────────────────
  fuelPricePerLiterPKR: number;     // current OGRA petrol price
  // ── Vehicle cost overrides ───────────────────────────────────────────────
  // sparse: only keys admin explicitly edited; missing keys use seed default
  vehicleOverridesPKR?: Record<string, number>;     // { sedan_private: 30, hiace_private: 65, ... }
  // ── Flight route overrides ───────────────────────────────────────────────
  // sparse: only routes admin explicitly edited
  flightRouteOverridesPKR?: Record<string, number>; // { 'lahore-skardu': 35000, ... }
  // ── Audit ────────────────────────────────────────────────────────────────
  updatedBy?: mongoose.Types.ObjectId;   // admin user id
  updatedAt: Date;
  createdAt: Date;
}

const adminConfigSchema = new Schema<IAdminConfig>(
  {
    key: {
      type: String,
      required: true,
      enum: ['default'],
      unique: true,
      default: 'default',
    },
    tripServiceFeePercent: { type: Number, default: 8, min: 0, max: 50 },
    freeTripLimit:         { type: Number, default: 5, min: 0, max: 100 },
    fuelPricePerLiterPKR:  { type: Number, default: 382, min: 0 },

    // Mixed gives us flexible sparse maps without per-key schema definitions.
    // The service layer validates shape on write so we don't store garbage.
    vehicleOverridesPKR:      { type: Schema.Types.Mixed, default: {} },
    flightRouteOverridesPKR:  { type: Schema.Types.Mixed, default: {} },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['__v'];
        return ret;
      },
    },
  }
);

const AdminConfig = mongoose.model<IAdminConfig>('AdminConfig', adminConfigSchema);
export default AdminConfig;