const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const User = require('./models/User'); // Assuming you have a User model

// Middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware
app.use(bodyParser.json());  // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/secret_santa', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Set up session for user authentication
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Logout Route
app.post('/logout', (req, res) => {
    console.log('Before logout:', req.session);  // Log session before logout
    req.session.destroy(err => {
        if (err) {
            console.error('Error during session destruction:', err); // Log if there's an error
            return res.status(500).json({ error: 'Logout failed' });
        }
        console.log('After logout:', req.session);  // Log session after logout
        res.json({ message: 'Logged out successfully' });
    });
});

// Route to handle user registration
app.post('/register', async (req, res) => {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email || !role) {
        return res.status(400).json({ error: 'Please provide all required fields (username, password, email, and role).' });
    }

    try {
        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'This email is already registered. Please use a different email.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role
        });

        await newUser.save();

        res.status(201).json({ message: 'Registration successful!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error registering user. Please try again later.' });
    }
});



// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        req.session.role = user.role;  // Ensure role is set for the session

        // Redirect based on the user's role
        if (user.role === 'organizer') {
            return res.redirect('/organizer');  // Redirect to the organizer page
        } else {
            return res.redirect('/wishlist');  // Redirect to the wishlist page for regular users
        }
    } else {
        res.status(400).json({ error: 'Invalid username or password.' });
    }
});

// Route to render the wishlist page if the user is logged in
app.get('/wishlist', (req, res) => {
    if (req.session.role === 'user') {
        res.sendFile(path.join(__dirname, 'public', 'wishlist.html'));  // Serve the wishlist page
    } else {
        res.status(403).send('Access denied');  // Access denied if not a regular user
    }
});

// Add to Wish List
app.post('/wishlist', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { item } = req.body;
    console.log(`Received wishlist item from user ${req.session.userId}:`, item); // Log incoming item

    try {
        await User.findByIdAndUpdate(req.session.userId, { $push: { wishlist: item } });
        console.log(`Updated wishlist for user ${req.session.userId} with item: ${item}`); // Log success
        res.json({ message: 'Item added to wishlist' });
    } catch (error) {
        console.error('Failed to update wishlist:', error); // Log any error that occurs
        res.status(400).json({ error: 'Failed to update wishlist' });
    }
});

// Serve the organizer page
app.get('/organizer', (req, res) => {
    if (req.session.role === 'organizer') {
        res.sendFile(path.join(__dirname, 'public', 'organizer.html'));  // Serve the organizer page
    } else {
        res.status(403).send('Access denied');  // Access denied if not an organizer
    }
});

// Get user's wishlist
app.get('/wishlist/view', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const user = await User.findById(req.session.userId);
        res.json({ wishlist: user.wishlist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});


// Set Up static middle ware
app.use(express.static(path.join(__dirname, 'public')));


// Serve HTML pages
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/register', (req, res) => res.sendFile(__dirname + '/public/register.html'));
app.get('/login', (req, res) => res.sendFile(__dirname + '/public/login.html'));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
