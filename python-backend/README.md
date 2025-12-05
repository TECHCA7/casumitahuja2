# Python PDF Backend

This is a Flask-based API for PDF manipulation and OCR tasks.

## Setup

1.  **Install Python 3.8+**
2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Environment Variables:**
    Create a `.env` file in this directory:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

## Running the Server

```bash
python main.py
```

The server will start at `http://localhost:5000`.

## API Endpoints

*   `POST /api/pdf/merge` - Merge multiple PDFs
*   `POST /api/pdf/split` - Split PDF (params: `pages` e.g. "1-5, 8")
*   `POST /api/pdf/unlock` - Unlock PDF (params: `password`)
*   `POST /api/pdf/to-excel` - Convert PDF to Excel
*   `POST /api/pdf/to-word` - Convert PDF to Word
*   `POST /api/pdf/compress` - Compress PDF
*   `POST /api/ocr/gemini` - OCR using Gemini Vision
