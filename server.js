// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Assignment = require('./models/Assignment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Route to handle creating Secret Santa assignments
app.post('/create-assignments', async (req, res) => {
    const { names } = req.body;

    if (names.length < 2) {
        return res.status(400).json({ error: 'Please enter at least 2 names.' });
    }

    // Clear previous assignments
    await Assignment.deleteMany({});

    // Generate Secret Santa pairs and codes
    let recipients = [...names];
    let codeMap = []; // Store giver and code pairs for response

    for (const name of names) {
        const availableRecipients = recipients.filter(r => r !== name);
        if (availableRecipients.length === 0) {
            return res.status(500).json({ error: 'Failed to assign unique Secret Santas. Try again.' });
        }

        const recipient = availableRecipients[Math.floor(Math.random() * availableRecipients.length)];
        const code = Math.random().toString(36).substr(2, 8);

        await Assignment.create({ giver: name, recipient, code });

        codeMap.push({ giver: name, code });
        recipients = recipients.filter(r => r !== recipient);
    }

    res.json({ message: 'Assignments created successfully!', codes: codeMap });
});


// Serve the main index.html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// Route to retrieve a Secret Santa assignment by code
app.get('/assignment/:code', async (req, res) => {
    const { code } = req.params;
    const assignment = await Assignment.findOne({ code });

    if (assignment) {
        res.json({ giver: assignment.giver, recipient: assignment.recipient });
    } else {
        res.status(404).json({ error: 'Invalid code' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
