var express = require('express');
var router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config();

// Initialize SQLite database
// let db = new sqlite3.Database("/Users/ericfletcher/coffeefacts.db");
// Uncomment the line below for a different database path
// let db = new sqlite3.Database("/home/iamericfletcher/coffeefacts.db");
let db = new sqlite3.Database(process.env.DBPATH);

// Configure JWT authentication settings
const jwtCheck = auth({
    audience: 'http://localhost:3002',
    issuerBaseURL: 'https://dev-zrsam7livd1kfvrr.us.auth0.com/',
    tokenSigningAlg: 'RS256'
});

// Public route to GET facts from database
router.get('/public', function (req, res, next) {
    // SQL query to fetch required columns
    db.all("SELECT id, fact, source, submitted_on FROM facts", function (err, rows) {
        if (err) {
            // Handle errors and send a 500 status
            return res.status(500).json({"error": err.message});
        }
        // Send fetched rows as JSON response
        res.json(rows);
    });
});

// Private route to GET facts, with JWT authentication
router.get('/private', jwtCheck, function (req, res, next) {
    // SQL query to fetch all columns
    db.all("SELECT * FROM facts", function (err, rows) {
        if (err) {
            // Handle errors and send a 500 status
            return res.status(500).json({"error": err.message});
        }
        // Send fetched rows as JSON response
        res.json(rows);
    });
});

module.exports = router;
