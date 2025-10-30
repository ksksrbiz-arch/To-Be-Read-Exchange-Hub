# 📦 Batch Book Upload System

Enterprise-grade batch upload system with AI-powered enrichment, image handling, and intelligent shelf placement.

## 🌟 Features

### Core Capabilities
- **Multi-format Support**: CSV, JSON manifests
- **Image Upload**: Attach cover images (matches by ISBN/UPC or row number)
- **AI Enrichment**: Automatic metadata completion using OpenAI/Claude/Gemini
- **Smart Placement**: Intelligent shelf allocation with capacity tracking
- **Queue Processing**: Asynchronous background processing with real-time progress
- **Error Handling**: Detailed error reporting with partial success support

### AI Integration
- **Multi-provider Fallback**: Gemini → Claude → OpenAI (cheapest first)
- **Cost Optimization**: Configurable provider order
- **Image Generation**: Optional AI cover generation when none available (DALL-E)
- **Metadata Fields**: Title, author, publisher, description, genre, pages, format

### Inventory Management
- **Shelf Capacity Tracking**: Real-time space monitoring
- **Overflow Handling**: Automatic overflow shelf creation
- **Genre-based Placement**: Prefer shelves by genre when available
- **Author Alphabetical**: Fallback to author last name sorting

## 🚀 Quick Start

### 1. Configure AI Providers (Optional)

Add to `.env`:

```bash
# AI Enrichment (leave blank to disable)
AI_PROVIDER_ORDER=gemini,claude,openai
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_claude_key_here
OPENAI_API_KEY=your_openai_key_here

# AI Image Generation (optional)
ENABLE_AI_IMAGE_GEN=false
```

### 2. Run Database Migration

```bash
npm run db:init
```

This creates new tables:
- `shelf_capacity` - Tracks shelf utilization
- `batch_uploads` - Batch processing metadata
- `incoming_books` - Processing queue

### 3. Access Batch Upload UI

Navigate to: `http://localhost:3000/batch-upload.html`

Or use the API directly (see below).

## 📝 CSV Format

### Template Download

Click "Download CSV Template" in the UI or use this format:

```csv
isbn,upc,asin,title,author,condition,quantity,description,genre
9780123456789,,,The Great Book,John Doe,Good,5,A fascinating novel about...,Fiction
,978654321,,,Jane Smith,Like New,3,Educational text on...,Non-Fiction
,,B00ABCDEF,Tech Guide,Bob Johnson,New,2,Comprehensive guide to...,Technology
```

### Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `isbn` | One of ISBN/UPC/ASIN/title | ISBN-10 or ISBN-13 | `9780743273565` |
| `upc` | One of ISBN/UPC/ASIN/title | Universal Product Code | `012345678901` |
| `asin` | One of ISBN/UPC/ASIN/title | Amazon Standard ID | `B00XYZ12AB` |
| `title` | If no ID provided | Book title | `The Great Gatsby` |
| `author` | No | Author name(s) | `F. Scott Fitzgerald` |
| `condition` | No (default: Good) | Book condition | `New`, `Like New`, `Good`, `Fair`, `Poor` |
| `quantity` | Yes | Number of copies | `5` |
| `description` | No | Full description | `A classic American novel...` |
| `genre` | No | Primary genre | `Fiction`, `Mystery`, `Biography` |

**Note**: If missing ISBN/UPC/ASIN, AI enrichment will use title + author to find metadata.

## 🖼️ Image Upload

### Naming Convention

Match images to books using:

1. **ISBN**: `isbn_9780123456789.jpg`
2. **UPC**: `upc_012345678901.jpg`
3. **Row Number**: `1.jpg` (first book), `2.jpg` (second book)

### Supported Formats

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)

### Size Limits

- Max file size: 10MB per image
- Max images per batch: 100

## 🔌 API Reference

### POST /api/batch/upload

Upload batch with manifest and images.

**Request**:
```http
POST /api/batch/upload
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="manifest"; filename="books.csv"
Content-Type: text/csv

[CSV content]

--boundary
Content-Disposition: form-data; name="images"; filename="isbn_9780123456789.jpg"
Content-Type: image/jpeg

[Image binary]
--boundary--
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "message": "Batch queued for processing",
  "batch_id": 123,
  "total": 50,
  "processed": 50,
  "successful": 48,
  "failed": 2,
  "errors": [
    {
      "row": 15,
      "book": { "isbn": "invalid", "title": "Bad Book" },
      "error": "Invalid ISBN format"
    }
  ]
}
```

### GET /api/batch/:id

Check batch processing status.

**Response**:
```json
{
  "success": true,
  "batch": {
    "id": 123,
    "filename": "books.csv",
    "total_books": 50,
    "processed_books": 45,
    "successful_books": 43,
    "failed_books": 2,
    "status": "processing",
    "created_at": "2025-10-30T12:00:00Z",
    "queue_status": {
      "pending": 5,
      "processing": 0,
      "completed": 43,
      "failed": 2
    },
    "progress": 90
  }
}
```

### GET /api/batch/inventory/status

Get inventory health report.

**Response**:
```json
{
  "success": true,
  "totals": {
    "total_books": 1234,
    "total_copies": 5678,
    "available_copies": 4500
  },
  "shelves": [
    {
      "shelf_location": "A",
      "book_count": 150,
      "total_capacity": 200,
      "avg_utilization": 75.0
    }
  ],
  "over_capacity": [],
  "alerts": {
    "over_capacity_count": 0,
    "needs_attention": false
  }
}
```

### GET /api/batch/queue

View incoming book queue.

**Query Parameters**:
- `status`: Filter by status (`pending`, `processing`, `completed`, `failed`)
- `batch_id`: Filter by batch ID
- `limit`: Max results (default: 50)

**Response**:
```json
{
  "success": true,
  "count": 25,
  "queue": [
    {
      "id": 456,
      "batch_id": 123,
      "isbn": "9780123456789",
      "title": "Sample Book",
      "author": "John Doe",
      "condition": "Good",
      "quantity": 5,
      "assigned_shelf": "D",
      "assigned_section": "12",
      "processing_status": "completed",
      "enrichment_attempts": 1,
      "created_at": "2025-10-30T12:05:00Z",
      "processed_at": "2025-10-30T12:06:15Z"
    }
  ]
}
```

## 🧠 AI Enrichment Workflow

### Fallback Chain

1. **Traditional APIs** (Free):
   - Open Library API
   - Google Books API

2. **AI Providers** (If missing data):
   - Gemini 1.5 Flash (cheapest)
   - Claude 3 Haiku
   - GPT-4o-mini

### Cost Per 1000 Books (Estimate)

Assuming 30% require AI enrichment:

| Provider | Cost/1K tokens | Books Needing AI | Total Cost |
|----------|----------------|------------------|------------|
| Gemini | $0.0001 | 300 books | ~$0.03 |
| Claude | $0.0008 | 300 books | ~$0.24 |
| OpenAI | $0.0015 | 300 books | ~$0.45 |

**Recommendation**: Use Gemini as primary for maximum cost efficiency.

### AI-Enhanced Fields

When traditional APIs fail, AI providers fill:
- Title
- Author
- Publisher
- Description (2-3 sentences)
- Genre
- Page count
- Format (Hardcover/Paperback/eBook)

## 📊 Shelf Placement Logic

### Priority Order

1. **Manual Preference**: If preferred shelf specified and has space
2. **Genre Match**: Shelves with matching genre preference
3. **Author Alphabetical**: First letter of author's last name
4. **Overflow**: Nearest shelf with space or create overflow shelf

### Capacity Management

- Default capacity: 100 books per shelf/section
- Auto-creates new sections when full
- Overflow shelves: `A-OVERFLOW`, `B-OVERFLOW`, etc.
- Capacity: 200 books (double normal)

### Example Placement

```javascript
// Book: "Pride and Prejudice" by Jane Austen, Genre: Classic Fiction
// 1. Check genre shelves → No "Classic Fiction" preference
// 2. Author alphabetical → Last name "Austen" → Shelf A
// 3. Check capacity → Shelf A-1 has 95/100 → Assign to A-1
// 4. Update capacity → Shelf A-1 now 100/100
```

## ⚠️ Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "At least one identifier required" | No ISBN/UPC/ASIN/title | Add at least one identifier |
| "Invalid quantity" | Quantity < 1 or non-numeric | Use positive integer |
| "Batch too large" | > 1000 books | Split into multiple batches |
| "CSV parsing failed" | Malformed CSV | Check for quote escaping, encoding |
| "AI enrichment failed" | All providers failed | Check API keys, network |

### Partial Success

Batches support partial success:
- Valid books are processed
- Invalid books are logged with errors
- Batch completes with mixed status

## 🔍 Monitoring

### Check Queue Status

```bash
curl http://localhost:3000/api/batch/queue?status=pending&limit=10
```

### Monitor Inventory

```bash
curl http://localhost:3000/api/batch/inventory/status
```

### Track Specific Batch

```bash
curl http://localhost:3000/api/batch/123
```

## 🛠️ Troubleshooting

### Images Not Uploading

- Check file size < 10MB
- Verify MIME type (image/jpeg, image/png, image/webp)
- Ensure filename matches ISBN or row number

### AI Enrichment Failing

- Verify API keys in `.env`
- Check provider order: `AI_PROVIDER_ORDER=gemini,claude,openai`
- Test individual provider keys
- Review logs for rate limiting or quota errors

### Slow Processing

- Reduce batch size (recommend 100-500 books per batch)
- Disable AI image generation: `ENABLE_AI_IMAGE_GEN=false`
- Increase database connection pool

### Books Misplaced

- Review genre preferences: `SELECT * FROM shelf_capacity WHERE genre_preference IS NOT NULL`
- Check capacity: `SELECT shelf_location, current_count, max_capacity FROM shelf_capacity`
- Manually override: Specify `shelf_location` in CSV

## 📚 Best Practices

1. **Start Small**: Test with 10-20 books before large batches
2. **Use ISBNs**: Fastest and most accurate enrichment
3. **Include Images**: Better customer experience
4. **Monitor Costs**: Track AI provider usage
5. **Regular Cleanup**: Archive completed batches periodically
6. **Backup Data**: Export batches before large uploads

## 🔐 Security

- File uploads restricted to authenticated users
- API key authentication required
- File type validation (whitelist only)
- Size limits enforced
- SQL injection prevention (parameterized queries)
- XSS protection on all inputs

## 📄 License

ISC License - See LICENSE file

---

Built with ❤️ for book communities
