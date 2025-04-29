const fetch = require('node-fetch');
const Model = require('../models/Model');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

let octokit;

async function initOctokit() {
  const { Octokit } = await import('@octokit/rest');
  octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
}

function ensureAbsoluteUrl(url) {
  if (!url) return null;
  try {
    new URL(url);
    return url;
  } catch {
    if (url.startsWith('/')) {
      return `https://lh3.googleusercontent.com${url}`;
    }
    return `https://lh3.googleusercontent.com/${url}`;
  }
}

async function processGoogleDriveUrl(url) {
  if (!url) return null;
  
  if (url.includes(',')) {
    const firstUrl = url.split(',')[0].trim();
    return firstUrl;
  }

  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname === 'lh3.googleusercontent.com') {
      return url;
    }

    let fileId = null;
    if (urlObj.hostname === 'drive.google.com') {
      if (urlObj.pathname.includes('/file/d/')) {
        fileId = urlObj.pathname.split('/file/d/')[1].split('/')[0];
      } else if (urlObj.pathname.includes('/open')) {
        fileId = urlObj.searchParams.get('id');
      }
    }

    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    return url;
  } catch (e) {
    console.warn('Invalid URL format:', url);
    return url;
  }
}

async function downloadImage(url, modelId) {
  try {
    if (!url) return null;

    // Create images directory if it doesn't exist
    const imagesDir = path.join(__dirname, '../public/images/models');
    await fs.mkdir(imagesDir, { recursive: true });

    // Create unique filename
    const filename = `${modelId}-${Date.now()}.jpg`;
    const filepath = path.join(imagesDir, filename);
    const publicPath = `/images/models/${filename}`;

    // Check if file already exists
    try {
      await fs.access(filepath);
      console.log('Image already exists:', filename);
      return publicPath;
    } catch {
      // File doesn't exist, continue with download
    }

    const directUrl = await processGoogleDriveUrl(url);
    if (!directUrl) return null;

    console.log('Downloading image from:', directUrl);
    
    // Handle Google Drive files
    let imageBuffer;
    if (directUrl.includes('drive.google.com')) {
      const fileId = directUrl.match(/[?&]id=([^&]+)/)?.[1];
      if (!fileId) {
        console.warn('Invalid Google Drive URL:', directUrl);
        return null;
      }
      
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        console.error('Failed to fetch Google Drive thumbnail:', response.status);
        return null;
      }
      imageBuffer = await response.buffer();
    } else {
      const response = await fetch(directUrl);
      if (!response.ok) {
        console.error('Failed to fetch image:', response.status);
        return null;
      }
      imageBuffer = await response.buffer();
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      console.error('Empty image buffer received');
      return null;
    }

    try {
      const processedBuffer = await sharp(imageBuffer, {
        failOnError: false,
        animated: true
      })
      .jpeg({
        quality: 80,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      })
      .resize({
        width: 1000,
        height: 1000,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();

      await fs.writeFile(filepath, processedBuffer);
      console.log('Image processed and saved:', filename);
      return publicPath;

    } catch (sharpError) {
      console.error('Image processing error:', sharpError);
      // Save original buffer if processing fails
      await fs.writeFile(filepath, imageBuffer);
      console.log('Original image saved:', filename);
      return publicPath;
    }
  } catch (error) {
    console.error('Image download/save error:', error);
    return null;
  }
}

async function processMultipleImages(urls, modelId) {
  if (!urls) return [];
  const imageUrls = urls.split(',').map(url => url.trim()).filter(Boolean);
  const localPaths = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const localPath = await downloadImage(imageUrls[i], `${modelId}-${i}`);
    if (localPath) {
      localPaths.push(localPath);
    }
  }

  return localPaths;
}

async function syncModels() {
  try {
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKufsvBTBhRxK161zV1jSl_wM8TGdYfGlLLLTA8Ta_tw_ImkSir2a_u2ghAUXLXfmudaxxDe-AJnnX/pub?output=tsv";
    const response = await fetch(sheetURL);
    const text = await response.text();
    
    const rows = text.split('\n').map(row => row.split('\t'));
    const headers = rows[0];
    
    // Process each model
    for (let i = 1; i < rows.length; i++) {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header.trim()] = rows[i][index]?.trim() || '';
      });

      const email = rowData['Email Address'];
      const imageUrls = rowData['Upload 1–3 headshots or portfolio pictures'];

      if (!email || !imageUrls) continue;

      try {
        // Find existing model or create new one
        let model = await Model.findOne({ email });
        
        // Only process images if model doesn't exist or has no images
        if (!model || !model.images || model.images.length === 0) {
          console.log(`Processing images for ${email}`);
          const urls = imageUrls.split(',').map(url => url.trim()).filter(Boolean);
          const localPaths = [];

          for (const url of urls) {
            const localPath = await downloadImage(url, `${email}-${localPaths.length}`);
            if (localPath) {
              localPaths.push(localPath);
            }
          }

          if (localPaths.length > 0) {
            if (!model) {
              model = new Model({ email });
            }
            model.images = localPaths;
            model.originalImageUrl = imageUrls;
            await model.save();
            console.log(`Saved ${localPaths.length} images for ${email}`);
          }
        }
      } catch (modelError) {
        console.error(`Error processing model ${email}:`, modelError);
      }
    }
    
    return text;
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

module.exports = { syncModels };
