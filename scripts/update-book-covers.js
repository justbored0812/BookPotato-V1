// Script to update existing books with cover images from their ISBNs
const fetch = require('node-fetch');

// Function to fetch book cover from ISBN
async function fetchBookCover(isbn) {
  if (!isbn || isbn.length < 10) return null;
  
  try {
    // Try Google Books API first
    const googleResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const googleData = await googleResponse.json();
    
    if (googleData.items && googleData.items.length > 0) {
      const book = googleData.items[0].volumeInfo;
      const imageUrl = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail;
      if (imageUrl) {
        console.log(`📖 Found Google Books cover for ${isbn}: ${imageUrl}`);
        return imageUrl;
      }
    }
    
    // Fallback to Open Library API
    const openLibResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const openLibData = await openLibResponse.json();
    
    const bookKey = `ISBN:${isbn}`;
    if (openLibData[bookKey]) {
      const book = openLibData[bookKey];
      const imageUrl = book.cover?.medium || book.cover?.large || book.cover?.small;
      if (imageUrl) {
        console.log(`📖 Found Open Library cover for ${isbn}: ${imageUrl}`);
        return imageUrl;
      }
    }
    
    console.log(`❌ No cover found for ISBN ${isbn}`);
    return null;
  } catch (error) {
    console.error(`❌ Error fetching cover for ISBN ${isbn}:`, error.message);
    return null;
  }
}

// Update a book with cover image
async function updateBookCover(bookId, imageUrl) {
  try {
    const response = await fetch(`http://localhost:5000/api/books/${bookId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=YOUR_SESSION_ID' // Will be replaced
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        coverImageUrl: imageUrl
      })
    });
    
    if (response.ok) {
      console.log(`✅ Updated book ${bookId} with cover image`);
      return true;
    } else {
      console.error(`❌ Failed to update book ${bookId}:`, response.statusText);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating book ${bookId}:`, error.message);
    return false;
  }
}

// Main function to update all books
async function updateAllBookCovers() {
  const books = [
    { id: 14, isbn: '9783442178582', title: 'Die 1%-Methode' },
    { id: 15, isbn: '9789386850645', title: 'Keepers of the Kalachakra' },
    { id: 16, isbn: '9780349124391', title: 'The Land of Stories 03: A Grimm Warning' },
    { id: 17, isbn: '9780141325491', title: 'The Lost Hero' },
    { id: 18, isbn: '9781423140597', title: 'Heroes of Olympus, The, Book Two: The Son of Neptune' },
    { id: 19, isbn: '9781423140603', title: 'Heroes of Olympus, The , Book Three: The Mark of Athena' },
    { id: 20, isbn: '9781423146728', title: 'The House of Hades' },
    { id: 21, isbn: '9780141325507', title: 'The Kane Chronicles' },
    { id: 22, isbn: '9780141335674', title: 'The Throne of Fire' },
    { id: 23, isbn: '9780141335704', title: 'The Serpent\'s Shadow' }
  ];
  
  console.log(`🚀 Starting to update ${books.length} books with cover images...`);
  
  let updated = 0;
  for (const book of books) {
    console.log(`\n🔍 Processing: ${book.title} (ID: ${book.id}, ISBN: ${book.isbn})`);
    
    const imageUrl = await fetchBookCover(book.isbn);
    if (imageUrl) {
      const success = await updateBookCover(book.id, imageUrl);
      if (success) updated++;
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Update complete! Successfully updated ${updated} out of ${books.length} books.`);
}

// Export the function if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { updateAllBookCovers, fetchBookCover };
}

// Run if called directly
if (require.main === module) {
  updateAllBookCovers().catch(console.error);
}