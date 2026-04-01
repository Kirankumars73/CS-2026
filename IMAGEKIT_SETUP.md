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
When users upload images (Gallery, Profile Photos, Events):

1. **Image Compression**: Images are compressed using canvas before upload
2. **Dual Upload**: Compressed images are uploaded to BOTH:
   - Firebase Storage (primary, for backwards compatibility)
   - ImageKit (for optimized delivery and transformations)
3. **Database Storage**: Both URLs are stored in Firestore:
   - `url` or `photoURL` - Firebase URL
   - `imagekitUrl` or `photoURLImageKit` - ImageKit URL

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
- `src/pages/GalleryPage.jsx` - Updated image upload and display
- `src/pages/EditProfilePage.jsx` - Updated profile photo upload
- `src/pages/EventsPage.jsx` - Updated event cover & gallery photo uploads

#### Display Logic
- `src/pages/YearbookPage.jsx` - Display ImageKit profile photos
- `src/pages/ProfilePage.jsx` - Display ImageKit profile photos
- `src/components/Navbar.jsx` - Display ImageKit profile photos
- `src/components/ui/event-card.jsx` - Display ImageKit event photos

#### Configuration
- `.env.example` - Added ImageKit environment variables
- `package.json` - Added ImageKit dependencies

## Database Schema Updates

### Gallery Photos
```javascript
{
  url: "firebase_storage_url",          // Existing field
  imagekitUrl: "imagekit_url",          // New field
  caption: "...",
  category: "...",
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
5. **Redundancy**: Images stored in two places for reliability

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
