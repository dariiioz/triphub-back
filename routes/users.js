const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { checkBodyMiddleware } = require("../middlewares/checkBody");

router.post(
    "/register",
    checkBodyMiddleware(["username", "email", "password"]),
    async (req, res) => {
        const { username, email, password } = req.body;

        //check if user exist
        const userExist = await checkIfUserEmailExist(email);
        if (userExist) {
            res.json({ result: false, error: "Email already exists." });
            return;
        }

        //check if username exist
        const usernameExist = await checkIfUsernameExist(username);
        if (usernameExist) {
            res.json({ result: false, error: "Username already exists." });
            return;
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        //create token
        const token = crypto.randomUUID();

        //prepare new user
        const newUser = new User({
            email: email,
            username: username,
            password: hashedPassword,
            token: token,
        });

        //save in db new user
        const user = await newUser.save();

        //http response
        res.json({
            result: true,
            user: {
                username: user.username,
                email: user.email,
                token: user.token,
            },
        });
    }
);

async function checkIfUserEmailExist(email) {
    const user = await User.findOne({ email: email });
    return user ? true : false;
}

async function checkIfUsernameExist(username) {
    const user = await User.findOne({ username: username });
    return user ? true : false;
}

router.post(
    "/login",
    checkBodyMiddleware(["email", "password"]),
    async (req, res) => {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({
                result: false,
                error: "Invalid email or password.",
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({
                result: false,
                error: "Invalid email or password.",
            });
        }

        res.json({
            result: true,
            user: {
                username: user.username,
                email: user.email,
                token: user.token,
            },
        });
    }
);

router.get("/me", checkBodyMiddleware(["token"]), async (req, res) => {
    const { token } = req.body;
    const user = await User.findOne({ token: token });
    if (!user) {
        return res.status(400).json({
            result: false,
            error: "Invalid token.",
        });
    }

    res.json({
        result: true,
        user: {
            username: user.username,
            email: user.email,
            token: user.token,
        },
    });
});

router.put(
    "/updatePassword",
    checkBodyMiddleware(["token", "newPassword", "oldPassword"]),
    async (req, res) => {
        const { token, newPassword, oldPassword } = req.body;
        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(400).json({
                result: false,
                error: "Invalid token.",
            });
        }

        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({
                result: false,
                error: "Invalid old password.",
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({
            result: true,
            user: {
                username: user.username,
                email: user.email,
                token: user.token,
            },
        });
    }
);

router.post(
    "/addDocument",
    checkBodyMiddleware(["token", "title", "link_doc", "serial_phone"]),
    async (req, res) => {
        const { token, title, link_doc, tripId, serial_phone } = req.body;
        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(400).json({
                result: false,
                error: "Invalid token.",
            });
        }

        user.documents.push({
            title: title,
            link_doc: link_doc,
            linked_trip: tripId,
            serial_phone: serial_phone,
        });

        await user.save();

        const updatedUser = await User.findOne({ token: token });
        res.json({
            result: true,
            documents: updatedUser.documents,
        });
    }
);

router.get("/documents", checkBodyMiddleware(["token"]), async (req, res) => {
    const { token } = req.body;
    const user = await User.findOne({ token: token });
    if (!user) {
        return res.status(400).json({
            result: false,
            error: "Invalid token.",
        });
    }

    res.json({
        result: true,
        documents: user.documents,
    });
});

router.delete(
    "/deleteDocument",
    checkBodyMiddleware(["token", "documentId"]),
    async (req, res) => {
        const { token, documentId } = req.body;
        const user = await User.findOne({
            token: token,
        });
        if (!user) {
            return res.status(400).json({
                result: false,
                error: "Invalid token.",
            });
        }

        user.documents = user.documents.filter(
            (document) => document._id != documentId
        );
        await user.save();

        const updatedUser = await User.findOne({ token: token });
        res.json({
            result: true,
            documents: updatedUser.documents,
        });
    }
);

router.delete(
    "/deleteAccount",
    checkBodyMiddleware(["token"]),
    async (req, res) => {
        const { token } = req.body;
        const user = await User.findOne({ token: token });
        if (!user) {
            return res.status(400).json({
                result: false,
                error: "Invalid token.",
            });
        }

        await user.delete();

        res.json({
            result: true,
        });
    }
);

module.exports = router;
