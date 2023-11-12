const rateLimit = require('express-rate-limit');
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const {auth} = require('express-oauth2-jwt-bearer');
require('dotenv').config();

// let db = new sqlite3.Database(process.env.DBPATH);
let db = new sqlite3.Database(process.env.TESTDBPATH);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply to all requests
router.use(limiter);

// Middleware to count route usage
function countRoutes(req, res, next) {
    let route = req.path;

    // If route includes '/editFact/' or '/deleteFact/', trim off the '/:id' portion
    if (route.includes('/editFact/') || route.includes('/deleteFact/')) {
        route = '/' + route.split('/')[1];
    }

    // Increment counter in database
    db.run("INSERT OR IGNORE INTO routeCounts (route_name, access_count) VALUES (?, 0)", [route], function (err) {
        if (err) return console.log(err);

        db.run("UPDATE routeCounts SET access_count = access_count + 1 WHERE route_name = ?", [route], function (err) {
            if (err) return console.log(err);
        });
    });
    next();
}

// Middleware to check for valid JWT
const jwtCheck = auth({
    audience: process.env.AUDIENCE,
    issuerBaseURL: process.env.ISSUERBASEURL,
    tokenSigningAlg: process.env.TOKENSIGNINGALG
});


router.use(countRoutes); // Apply the route count middleware to all routes

router.get('/public', function (req, res) {
    db.all("SELECT id, fact, source, submitted_on FROM facts WHERE is_approved = 1", function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

router.get('/private', jwtCheck, function (req, res) {
    // SQL statement to select all facts from the database where
    // db.all("SELECT * FROM facts WHERE is_approved = 1", function (err, rows) {
    db.all("SELECT * FROM facts", function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

router.post('/addFact', jwtCheck, function (req, res) {
    const {fact, source, user_id} = req.body;
    const sql = `INSERT INTO facts (fact, source, user_id)
                 VALUES (?, ?, ?)`;
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
    const sql = "UPDATE facts SET fact = ?, source = ?, is_approved = 0, last_user_edit_on = DATETIME() WHERE id = ?";

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
        return res.status(200).json({"id": id, "user_id": req.user_id});
    });
});


// Route for getting all unapproved facts from the database for the admin panel on the frontend
router.get('/unapprovedFacts', jwtCheck, function (req, res) {
    const sql = "SELECT * FROM facts WHERE is_approved = 0";

    db.all(sql, function (err, rows) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json(rows);
    });
});

// Route for approving a fact by ID
router.put('/adminApproveFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = "UPDATE facts SET is_approved = 1, admin_approved_on = DATETIME() WHERE id = ?";

    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json({"success": true});
    });
});

// Route for deleting a fact by ID
router.delete('/adminRejectFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = "UPDATE facts SET is_approved = 2, admin_rejected_for_review_on = DATETIME() WHERE id = ?";
    // const sql = `DELETE FROM facts WHERE id = ?`;
    db.run(sql, id, function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json({"success": true});
    });
});

// Router for admin to delete a fact by ID
router.delete('/adminDeleteFact/:id', jwtCheck, function (req, res) {
    const id = req.params.id;
    const sql = `DELETE
                 FROM facts
                 WHERE id = ?`;
    db.run(sql, id, function (err) {
        if (err) {
            return res.status(500).json({"error": err.message});
        }
        res.json({"success": true});
    });
});


module.exports = router;
