const fs = require('fs')
const path = require('path')
const https = require('https')

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/'
const MODELS_DIR = path.join(__dirname, 'public', 'models')

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
]

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
}

function download(file) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODELS_DIR, file)
    console.log(`Downloading ${file}...`)
    const fileStream = fs.createWriteStream(filePath)
    
    https.get(BASE_URL + file, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${file}' (${response.statusCode})`))
        return
      }
      
      response.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(filePath, () => reject(err))
    })
  })
}

async function main() {
  try {
    for (const file of files) {
      await download(file)
    }
    console.log('All models downloaded successfully.')
  } catch (err) {
    console.error('Error downloading models:', err)
    process.exit(1)
  }
}

main()
