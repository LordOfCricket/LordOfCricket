import { v2 as cloudinary } from 'cloudinary'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret)

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })
}

export function hasCloudinaryConfig() {
  return isCloudinaryConfigured
}

export async function uploadImageFile(file, folder = 'canteen-menu') {
  if (!file) return ''

  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary credentials are not configured.')
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}`,
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        resolve(result?.secure_url || '')
      },
    )

    stream.end(file.buffer)
  })
}
