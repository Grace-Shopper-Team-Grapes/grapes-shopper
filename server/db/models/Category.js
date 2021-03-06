const Sequelize = require('sequelize');
const db = require('../db');

const Category = db.define('category', {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    notEmpty: true
  },
  slug: {
    type: Sequelize.STRING,
    allowNull: false,
    //since we are searching, editing, deleting by slug, these need to be unique
    unique: true
  },
  imageUrl: {
    type: Sequelize.TEXT,
    defaultValue: 'default-category.jpeg'
  },
  description: {
    type: Sequelize.TEXT
  },
  isPublished: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
});

Category.beforeValidate(category => {
  /*
   * Generate slug
   */
  if (!category.slug) {
    category.slug = category.name
      .replace(/\s/g, '-')
      .replace(/\W/g, '')
      .toLowerCase();
  } else {
    category.slug = category.slug.toLowerCase();
  }
});

module.exports = Category;
