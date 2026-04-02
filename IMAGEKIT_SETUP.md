# ImageKit Integration

This application now uploads images to both Firebase Storage and ImageKit, and fetches images from both sources.

## Setup Instructions

### 1. Get ImageKit Credentials

1. Sign up or log in to [ImageKit.io](https://imagekit.io/)
2. Get your credentials from the Dashboard:
   - **URL Endpoint**: e.g., `https://ik.imagekit.io/8ewg8di9l`
   - **Public Key**: Found in Developer Options
   - **Private Key**: Found in Developer Options (keep this secure!)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id_here
VITE_IMAGEKIT_PUBLIC_KEY=public_your_key_here
VITE_IMAGEKIT_PRIVATE_KEY=private_your_key_here
```

### 3. How It Works

#### Upload Flow

**Gallery Page (ImageKit Only):**
- When users upload photos to the Gallery:
  1. **Image Compression**: Images are compressed using canvas before upload
  2. **ImageKit Upload**: Compressed images are uploaded ONLY to ImageKit
  3. **Database Storage**: ImageKit URL is stored in both fields:
     - `imagekitUrl` - Primary ImageKit URL
     - `url` - Also stores ImageKit URL for backwards compatibility

**Other Pages (Profile Photos, Events - Dual Upload):**
- When users upload profile photos or event photos:
  1. **Image Compression**: Images are compressed using canvas before upload
  2. **Dual Upload**: Compressed images are uploaded to BOTH:
     - Firebase Storage (for redundancy)
     - ImageKit (for optimized delivery)
  3. **Database Storage**: Both URLs are stored in Firestore

#### Fetch/Display Flow
When displaying images:

1. **Priority**: ImageKit URLs are prioritized if available
2. **Fallback**: If ImageKit URL is missing, Firebase URL is used
3. **Backwards Compatibility**: Existing images (with only Firebase URLs) continue to work

## Modified Files

### New Files
- `src/imagekit.js` - ImageKit configuration and utilities
- `IMAGEKIT_SETUP.md` - This documentation

### Updated Files

#### Upload Logic
- `src/utils/imageUtils.js` - Added `uploadToBothServices()` function
- `src/pages/GalleryPage.jsx` - **ImageKit ONLY** upload for gallery photos
- `src/pages/EditProfilePage.jsx` - Dual upload (Firebase + ImageKit) for profile photos
- `src/pages/EventsPage.jsx` - Dual upload for event cover & gallery photos

#### Display Logic
- `src/pages/YearbookPage.jsx` - Display ImageKit profile photos
- `src/pages/ProfilePage.jsx` - Display ImageKit profile photos
- `src/components/Navbar.jsx` - Display ImageKit profile photos
- `src/components/ui/event-card.jsx` - Display ImageKit event photos

#### Configuration
- `.env.example` - Added ImageKit environment variables
- `package.json` - Added ImageKit dependencies

## Database Schema Updates

### Gallery Photos (ImageKit Only)
```javascript
{
  imagekitUrl: "imagekit_url",              // Primary ImageKit URL
  url: "imagekit_url",                      // Same as imagekitUrl (for compatibility)
  caption: "...",
  category: "...",
  // ... other fields
}

// Old photos (Firebase only) - still work:
{
  url: "firebase_storage_url",              // Legacy field
  caption: "...",
  // ... other fields
}
```

### Profile Photos
```javascript
{
  profilePhoto: "firebase_storage_url",        // Existing field
  profilePhotoImageKit: "imagekit_url",        // New field
  name: "...",
  // ... other fields
}
```

### Event Photos
```javascript
{
  photoURL: "firebase_storage_url",              // Existing cover photo
  photoURLImageKit: "imagekit_url",              // New ImageKit cover photo
  additionalPhotoURLs: ["url1", "url2"],         // Existing gallery
  additionalPhotoURLsImageKit: ["url1", "url2"], // New ImageKit gallery
  // ... other fields
}
```

## Benefits

1. **Performance**: ImageKit provides automatic image optimization and CDN delivery
2. **Transformations**: Can apply on-the-fly transformations (resize, crop, quality)
3. **Bandwidth Savings**: Optimized images reduce bandwidth usage
4. **Backwards Compatible**: Existing Firebase images continue to work
5. **Gallery Optimization**: Gallery page uses ImageKit exclusively for new uploads (faster, more efficient)
6. **Redundancy**: Profile and event photos stored in two places for reliability

## Troubleshooting

### ImageKit Upload Fails
- Check that your environment variables are set correctly
- Verify your ImageKit private key is correct
- Check browser console for error messages
- The app will continue to work with Firebase-only uploads if ImageKit fails

### Images Not Displaying
- Check browser console for CORS errors
- Verify ImageKit URL endpoint is correct
- Ensure images were successfully uploaded (check Firestore documents)

## Future Enhancements

1. Add image transformations for thumbnails and responsive sizes
2. Implement lazy loading with ImageKit's blur-up technique
3. Add support for video uploads via ImageKit
4. Migrate existing Firebase images to ImageKit
