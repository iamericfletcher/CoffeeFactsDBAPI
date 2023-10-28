const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const {auth} = require('express-oauth2-jwt-bearer');
require('dotenv').config();

let db = new sqlite3.Database(process.env.DBPATH);
// let db = new sqlite3.Database(process.env.TESTDBPATH);

// Middleware to count route usage
function countRoutes(req, res, next) {
    const route = req.path;

    // Increment counter in database
    db.run("INSERT OR IGNORE INTO routeCounts (route_name, access_count) VALUES (?, 0)", [route], function (err) {
        if (err) return console.log(err);

        db.run("UPDATE routeCounts SET access_count = access_count + 1 WHERE route_name = ?", [route], function (err) {
            if (err) return console.log(err);
        });
    });

    next();
}

const jwtCheck = auth({
    audience: 'http://localhost:3002',
    issuerBaseURL: 'https://dev-zrsam7livd1kfvrr.us.auth0.com/',
    tokenSigningAlg: 'RS256'
});

router.use(countRoutes); // Apply the route count middleware to all routes

router.get('/public', function (req, res) {
    db.all("SELECT id, fact, source, submitted_on FROM facts", function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

router.get('/private', jwtCheck, function (req, res) {
    db.all("SELECT * FROM facts", function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

router.post('/addFact', jwtCheck, function (req, res) {
    const {fact, source, user_id} = req.body;
    const sql = `INSERT INTO facts (fact, source, user_id) VALUES (?, ?, ?)`;
    db.run(sql, [fact, source, user_id], function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        return res.status(201).json({"id": this.lastID});
    });
});

// PUT route to edit a fact by ID
router.put('/editFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const {fact, source} = req.body;
    const sql = "UPDATE facts SET fact = ?, source = ? WHERE id = ?";

    db.run(sql, [fact, source, id], function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json({"success": true});
    });
});


// GET route to fetch a fact by ID for editing
router.get('/editFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = "SELECT * FROM facts WHERE id = ?";

    db.get(sql, [id], function (err, row) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(row);
    });
});

router.delete('/deleteFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = `DELETE FROM facts WHERE id = ?`;
    db.run(sql, id, function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        return res.status(200).json({"id": id});
    });
});


module.exports = router;
