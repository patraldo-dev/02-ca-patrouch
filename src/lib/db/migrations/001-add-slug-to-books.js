// src/lib/db/migrations/001-add-slug-column.js
export async function up(queryInterface, Sequelize) {
  // Check if books table exists
  const tableExists = await queryInterface.sequelize.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='books';`
  );

  if (tableExists[0].length === 0) {
    console.log('Books table does not exist, skipping migration');
    return;
  }

  // Get table information
  const tableInfo = await queryInterface.sequelize.query(`PRAGMA table_info(books);`);
  
  // Check if slug column already exists
  const hasSlugColumn = tableInfo[0].some(column => column.name === 'slug');
  
  if (!hasSlugColumn) {
    // Add slug column
    await queryInterface.addColumn('books', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    console.log('Added slug column to books table');
  } else {
    console.log('Slug column already exists, skipping');
  }
}

export async function down(queryInterface, Sequelize) {
  // Check if table exists
  const tableExists = await queryInterface.sequelize.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='books';`
  );

  if (tableExists[0].length === 0) {
    return;
  }

  // Get table information
  const tableInfo = await queryInterface.sequelize.query(`PRAGMA table_info(books);`);
  
  // Check if slug column exists
  const hasSlugColumn = tableInfo[0].some(column => column.name === 'slug');
  
  if (hasSlugColumn) {
    // Remove slug column
    await queryInterface.removeColumn('books', 'slug');
    console.log('Removed slug column from books table');
  }
}
