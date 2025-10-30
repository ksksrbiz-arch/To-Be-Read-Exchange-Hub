# Batch Upload User Guide

## 📚 To-Be-Read Exchange Hub - Batch Book Upload

This guide will walk you through uploading large quantities of books using the batch upload feature, which includes automatic AI metadata enrichment and intelligent shelf placement.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [CSV Format Specification](#csv-format-specification)
3. [Image Upload Guidelines](#image-upload-guidelines)
4. [AI Enrichment](#ai-enrichment)
5. [Shelf Allocation](#shelf-allocation)
6. [Monitoring Progress](#monitoring-progress)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### Step 1: Prepare Your Data

Create a CSV file with your book information. Minimum required: **one identifier** (ISBN, UPC, ASIN, or title).

**Example:** `my-books.csv`
```csv
isbn,title,author,condition,quantity
9780743273565,The Great Gatsby,F. Scott Fitzgerald,Good,5
9780061120084,To Kill a Mockingbird,Harper Lee,Like New,3
```

### Step 2: Gather Cover Images (Optional)

- Name images by ISBN: `isbn_9780743273565.jpg`
- Or by row number: `1.jpg` (first book), `2.jpg` (second book)
- Supported formats: JPEG, PNG, WebP
- Max size: 10MB per image

### Step 3: Upload

1. Navigate to `/batch-upload.html` in your browser
2. Drag & drop your CSV manifest and images into the upload zone
3. Click "Start Upload"
4. Monitor real-time progress on the status dashboard

---

## CSV Format Specification

### Required Columns

At least **ONE** of the following:
- `isbn` - ISBN-10 or ISBN-13 (with or without hyphens)
- `upc` - Universal Product Code
- `asin` - Amazon Standard Identification Number
- `title` - Book title

### Optional Columns

| Column | Description | Example | Max Length |
|--------|-------------|---------|------------|
| `author` | Author name | F. Scott Fitzgerald | 255 chars |
| `publisher` | Publisher name | Scribner | 255 chars |
| `condition` | Physical condition | Good, Like New, New | See below |
| `quantity` | Number of copies | 5 | 1-1000 |
| `description` | Book description | A classic American novel... | No limit |
| `genre` | Book genre | Fiction, Non-Fiction | 100 chars |
| `format` | Physical format | Hardcover, Paperback, eBook | 50 chars |
| `shelf_location` | Manual shelf override | A-12 | 20 chars |

### Condition Values

Must be **one of** (case-sensitive):
- `New` - Brand new, never opened
- `Like New` - Appears unread, perfect condition
- `Very Good` - Minor wear, all pages intact
- `Good` - Normal wear, fully readable
- `Acceptable` - Heavy wear but complete
- `Poor` - Damaged but readable

### CSV Example

```csv
isbn,upc,asin,title,author,publisher,condition,quantity,description,genre,format,shelf_location
9780743273565,,,The Great Gatsby,F. Scott Fitzgerald,Scribner,Good,5,A classic American novel about the Jazz Age,Fiction,Hardcover,
,012345678905,,To Kill a Mockingbird,Harper Lee,J.B. Lippincott,Like New,3,A gripping tale of racial injustice,Fiction,Paperback,
,,B00ZV9PXP2,Digital Fortress,Dan Brown,St. Martin's Press,New,10,A techno-thriller,Thriller,eBook,
9781234567890,,,Educational Physics,Dr. Jane Smith,Academic Press,Very Good,2,Comprehensive physics guide,Non-Fiction,Hardcover,B-05
```

**Download Template:** Click "📄 Download CSV Template" on the batch upload page

---

## Image Upload Guidelines

### Naming Conventions

#### Option 1: Match by ISBN
```
isbn_9780743273565.jpg
isbn_9780061120084.png
```

#### Option 2: Match by Row Number
```
1.jpg     ← First book in CSV
2.jpg     ← Second book in CSV
3.png     ← Third book in CSV
```

### Image Requirements

- **Formats:** JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp)
- **Max File Size:** 10MB per image
- **Max Count:** 100 images per batch
- **Resolution:** Recommended 600x900px minimum

### AI Image Generation Fallback

If no image is provided and `ENABLE_AI_IMAGE_GEN=true` in environment:
- System automatically generates cover image using DALL-E 3
- Prompt includes title, author, and genre
- Generated images saved to uploads directory

---

## AI Enrichment

### How It Works

When a book has incomplete metadata (missing title, author, genre, etc.), the system automatically:

1. **Tries traditional APIs** (Open Library, Google Books)
2. **Falls back to AI providers** in cost order:
   - **Gemini** (cheapest) → **Claude** → **OpenAI**
3. **Extracts metadata** including:
   - Title, author, publisher
   - Genre, description
   - Publication year, page count
   - ISBN-13 conversion

### Enrichment Status

Track enrichment in batch status:
- `enriched` - Count of books enriched by AI
- `enrichment_status` - Per-book status (`pending`, `completed`, `failed`)
- `enrichment_source` - Which AI provider was used

### AI Provider Configuration

Set in `.env` file:

```bash
# Provider order (cheapest first)
AI_PROVIDER_ORDER=gemini,claude,openai

# API Keys
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# Models
GEMINI_MODEL=gemini-1.5-flash
CLAUDE_MODEL=claude-3-haiku-20240307
OPENAI_MODEL=gpt-4o-mini

# Image generation
ENABLE_AI_IMAGE_GEN=false
```

---

## Shelf Allocation

### Automatic Placement Algorithm

Books are placed using this priority order:

1. **Manual Override** - If `shelf_location` provided in CSV
2. **Genre Match** - Shelves with matching `genre_preference`
3. **Author Alphabetical** - Within genre, alphabetical by author last name
4. **Nearest Available** - Closest shelf with capacity
5. **Overflow Shelf** - Auto-created `OVERFLOW-XX` if all full

### Shelf Capacity Tracking

Monitor in real-time at `/api/batch/inventory/status`:

```json
{
  "success": true,
  "capacity": [
    {
      "shelf": "A",
      "section": "12",
      "max_capacity": 100,
      "current_count": 75,
      "utilization": 75.0,
      "available": 25,
      "genre_preference": "Fiction",
      "location_notes": "Main floor, west wall"
    }
  ]
}
```

### Overflow Handling

When a shelf reaches capacity:
- System creates new shelf `OVERFLOW-01`, `OVERFLOW-02`, etc.
- Capacity: 200 books per overflow shelf
- Location notes: "Temporary overflow storage"

---

## Monitoring Progress

### Real-Time Status Dashboard

After upload, the UI automatically polls `/api/batch/{id}` every 2 seconds:

**Progress Metrics:**
- **Total Books** - Number uploaded
- **Processed** - Books completed (success + failed)
- **Successful** - Books successfully added to inventory
- **Failed** - Books with errors
- **AI Enriched** - Books enriched by AI
- **Shelf Allocated** - Books assigned shelf locations

**Progress Bar:** Shows 0-100% completion

### Viewing Queue

Click "View Incoming Queue" to see:
- All books in current batch
- Processing status per book (✅ completed, ⏳ pending, ❌ failed)
- Shelf allocation
- Enrichment status

---

## Troubleshooting

### Common Errors

#### "Manifest file is required"
**Cause:** No CSV/JSON file uploaded  
**Solution:** Ensure you select a `.csv` or `.json` file

#### "Batch too large (max 1000 books)"
**Cause:** More than 1000 rows in CSV  
**Solution:** Split into multiple batches of ≤1000 books each

#### "Invalid ISBN format"
**Cause:** ISBN doesn't pass checksum validation  
**Solution:** Verify ISBN is correct, remove hyphens, ensure 10 or 13 digits

#### "Row X: At least one identifier required"
**Cause:** Row missing ISBN, UPC, ASIN, and title  
**Solution:** Add at least one identifier to that row

#### "File too large"
**Cause:** File exceeds 10MB limit  
**Solution:** Compress images or split into multiple uploads

### Error Logs

Failed books appear in the status dashboard:

```
⚠️ Errors Found:

Row 5: Invalid ISBN format: invalid-isbn
ISBN: invalid-isbn

Row 12: At least one identifier (ISBN/UPC/ASIN/title) required
```

### Recovery

- **Partial Success:** Successful books are added to inventory, failed books remain in error log
- **Re-upload Failed Books:** Export error rows, fix issues, re-upload as new batch
- **Manual Entry:** Add failed books manually via single-book endpoint

---

## Best Practices

### Data Quality

✅ **Clean ISBNs:** Remove hyphens, verify checksums  
✅ **Consistent Conditions:** Use exact values (Good, Like New, etc.)  
✅ **Complete Metadata:** More fields = better organization  
✅ **Validate Before Upload:** Test with small batch (10 books) first

### Performance

✅ **Optimal Batch Size:** 100-500 books per batch  
✅ **Compress Images:** Use JPEG with 80% quality  
✅ **Avoid Duplicates:** Check existing inventory first  
✅ **Off-Peak Uploads:** Large batches during low-traffic hours

### Image Management

✅ **Consistent Naming:** Use ISBN naming for reliability  
✅ **Standard Dimensions:** 600x900px or 800x1200px  
✅ **Acceptable Quality:** 70-90 JPEG quality  
✅ **Automatic Fallback:** Let AI generate missing covers

### Cost Optimization

✅ **Provider Order:** Cheapest first (Gemini → Claude → OpenAI)  
✅ **Rich Metadata:** Provide more fields to avoid AI calls  
✅ **Disable Image Gen:** If not needed, set `ENABLE_AI_IMAGE_GEN=false`  
✅ **Monitor Usage:** Track `enriched_count` per batch

---

## API Reference

### Endpoints

**POST /api/batch/upload**
- Upload CSV/JSON + images
- Returns: `batch_id`, `total_books`

**GET /api/batch/{id}**
- Monitor batch progress
- Returns: status, counts, errors

**GET /api/batch/inventory/status**
- View shelf capacities
- Returns: all shelves with utilization

**GET /api/batch/queue**
- View incoming queue
- Filters: `batch_id`, `status`, `limit`

### Authentication

Include Bearer token or API key:

```bash
Authorization: Bearer <your_jwt_token>
# OR
X-API-Key: <your_api_key>
```

---

## Need Help?

- **API Documentation:** Visit `/api-docs` for interactive Swagger UI
- **Sample Data:** Download template from batch upload page
- **Support:** Contact API support team

---

**Happy Uploading! 📚**
