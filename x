<div class="book-info">
    <h3>{book.title}</h3>
    
    <p class="book-author">{$t('pages.home.featured.book.by')} {book.author}</p>
    
    {#if book.avg_rating}
        <div class="book-rating">
            <span class="rating-stars">⭐ {parseFloat(book.avg_rating).toFixed(1)}</span>
            {#if book.review_count}
                <span class="rating-count">
                    {$t('pages.home.featured.book.reviewCount', { 
                        count: book.review_count,
                        plural: book.review_count === 1 ? '' : 's'
                    })}
                </span>
            {/if}
        </div>
    {/if}
    
    <!-- Single, clear call-to-action button -->
    <a href={`/books/${book.slug}`} class="read-more-btn">
        {$t('pages.home.featured.book.readMore')}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </a>
</div>
