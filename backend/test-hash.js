// test-hash.js
const bcrypt = require('bcrypt');
const hash = '$2b$10$rQJ8p8q9pRZKFy2yXvE0AuV1kFG2vNcY7QH5mJ3oL9K4bN6mA1sWq';
bcrypt.compare('admin123', hash).then(match => {
    console.log('Password match:', match);
});