// src/routes/api/admin/books/+server.js
import { json } from '@sveltejs/kit';

// Function to create a slug from a title
function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
}

export async function GET({ platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        const result = await platform.env.DB_book.prepare("SELECT * FROM books ORDER BY title").all();
        
        return json(result.results);
    } catch (error) {
        console.error('Error fetching books:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}

export async function POST({ request, platform }) {
    try {
        if (!platform?.env?.DB_book) {
            return json({ 
                success: false, 
                error: 'Database not available' 
            }, { status: 500 });
        }
        
        const formData = await request.formData();
        
        // Extract form data
        const title = formData.get('title');
        const author = formData.get('author');
        const description = formData.get('description') || '';
        const published_year = formData.get('published_year') || null;
        const published = formData.get('published') === 'true';
        const coverImageFile = formData.get('coverImage');
        
        // Generate slug from title
        const slug = createSlug(title);
        
        let coverImageId = null;
        
        // Handle image upload if provided
        if (coverImageFile && coverImageFile.size > 0) {
            // Upload the image to Cloudflare Images directly
            const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
            const apiKey = process.env.CLOUDFLARE_API_TOKEN;
            
            if (!accountId || !apiKey) {
                return json({ 
                    success: false, 
                    error: 'Cloudflare credentials not configured' 
                }, { status: 500 });
            }
            
            const cloudflareFormData = new FormData();
            cloudflareFormData.append('file', coverImageFile);
            
            const imageResponse = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: cloudflareFormData,
                }
            );
            
            if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                coverImageId = imageData.result.id;
            } else {
                const errorData = await imageResponse.json();
                console.error('Cloudflare Images error:', errorData);
                return json({ 
                    success: false, 
                    error: `Failed to upload image: ${errorData.errors?.[0]?.message || 'Unknown error'}` 
                }, { status: 500 });
            }
        }
        
        // Insert the new book - let SQLite auto-generate the ID
        const result = await platform.env.DB_book.prepare(`
            INSERT INTO books (title, author, description, published_year, slug, published, coverImageId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            title,
            author,
            description,
            published_year,
            slug,
            published ? 1 : 0,
            coverImageId
        ).run();
        
        return json({ 
            success: true, 
            message: 'Book added successfully',
            id: result.lastInsertRowid,
            slug: slug
        });
    } catch (error) {
        console.error('Error adding book:', error);
        return json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
