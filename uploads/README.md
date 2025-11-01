# Uploads Directory

This directory stores temporary uploaded files during batch processing:
- CSV/JSON manifest files
- User-provided book cover images

**Important:** Files are automatically cleaned up after processing. This directory should be excluded from version control.

## Structure
```
uploads/
├── manifest-*.csv        # Uploaded CSV manifests
├── manifest-*.json       # Uploaded JSON manifests
└── images-*.jpg|png      # User-uploaded book cover images
```

## Cleanup
Files older than 24 hours should be automatically purged via cleanup script (see scripts/cleanup-uploads.sh).
