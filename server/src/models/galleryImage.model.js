import mongoose from 'mongoose'

// Cloudinary + MongoDB is the storage pair for gallery photography — never a
// second source of cricket truth (that stays PostgreSQL), just media
// metadata. `image.publicId` is what every future transform/delete call
// keys on; `image.url` is the plain Cloudinary secure_url as uploaded
// (delivery-optimized URLs are derived on read via getOptimizedImageUrl,
// not stored, so the optimization strategy can change without a migration).
export const GALLERY_CATEGORIES = ['ground', 'match', 'tournament', 'event']

const galleryImageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, enum: GALLERY_CATEGORIES, default: 'ground', required: true },
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      width: { type: Number },
      height: { type: Number },
      format: { type: String },
      bytes: { type: Number },
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Postgres users.id (integer) — Mongo has no User collection of its own,
    // same convention as CanteenOrder.userId.
    createdBy: { type: Number, default: null },
  },
  { timestamps: true },
)

// The one real query pattern this collection serves: "active images in a
// category, in display order" (public gallery reads + the homepage
// carousel). Not adding speculative indexes beyond it.
galleryImageSchema.index({ category: 1, isActive: 1, order: 1 })

export default mongoose.model('GalleryImage', galleryImageSchema)
