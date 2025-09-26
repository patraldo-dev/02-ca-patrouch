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
        const coverImage = formData.get('coverImage');
        
        // Generate slug from title
        const slug = createSlug(title);
        
        let coverImageId = null;
        
        // Handle image upload if provided
        if (coverImage && coverImage.size > 0) {
            // In a real implementation, you would upload the image to a storage service
            // and get back an ID. For now, we'll simulate this.
            // This is where you would integrate with your image upload service.
            // For example, using Cloudflare Images, AWS S3, etc.
            
            // For now, we'll just use a placeholder ID
            coverImageId = 'uploaded-image-' + Date.now();
            
            // In a real implementation, you would upload the image:
            // const imageResponse = await fetch('https://api.example.com/upload', {
            //     method: 'POST',
            //     body: formData
            // });
            // const imageData = await imageResponse.json();
            // coverImageId = imageData.id;
        }
        
        // Insert the new book
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
