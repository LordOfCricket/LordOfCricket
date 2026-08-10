import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    // Populated only for items uploaded after this field was added — lets
    // deleteMenuItem clean up the Cloudinary asset; legacy items (URL only,
    // no publicId) simply skip that step, same as before this field existed.
    imagePublicId: { type: String, default: '' },
    defaultStock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export default mongoose.model('MenuItem', menuItemSchema)
