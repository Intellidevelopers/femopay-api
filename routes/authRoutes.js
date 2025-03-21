const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: User Signup
 *     description: Create a new user account
 *     parameters:
 *       - in: body
 *         name: user
 *         description: User data
 *         schema:
 *           type: object
 *           required:
 *             - name
 *             - email
 *             - password
 *           properties:
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             password:
 *               type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists
 */
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ name, email, password: hashedPassword });

        await user.save();
        res.status(201).json({ msg: "User created successfully" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User Login
 *     description: Authenticate user and return token
 *     parameters:
 *       - in: body
 *         name: user
 *         description: User credentials
 *         schema:
 *           type: object
 *           required:
 *             - email
 *             - password
 *           properties:
 *             email:
 *               type: string
 *             password:
 *               type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get User Profile
 *     description: Retrieve authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", async (req, res) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ msg: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        res.status(200).json(user);
    } catch (err) {
        res.status(401).json({ msg: "Invalid token" });
    }
});

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all registered users
 *     description: Returns a list of all users (excluding passwords).
 *     responses:
 *       200:
 *         description: List of users retrieved successfully.
 *       500:
 *         description: Server error.
 */

// Get all registered users
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({}, "-password"); // Exclude passwords for security
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
