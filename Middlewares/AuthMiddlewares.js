require("dotenv").config();
const User = require("../Models/UserModel");
const Note = require("../Models/NoteModel");
const jwt = require("jsonwebtoken");
const ArchivedNoteModel = require("../Models/ArchivedNoteModel");
const nodemailer = require("nodemailer");

module.exports.checkUser = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        res.json({ status: false });
        next();
      } else {
        const user = await User.findById(decodedToken.id);
        const populatedUser = await User.findOne({
          _id: decodedToken.id,
        })
          .populate("notes")
          .populate("archivedNotes");
        if (user)
          res.json({
            status: true,
            user: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            notes: populatedUser.notes,
            archivedNotes: populatedUser.archivedNotes,
          });
        else res.json({ status: false });
        next();
      }
    });
  } else {
    res.json({ status: false });
    next();
  }
};

module.exports.resetPassword = async (req, res, next) => {
  console.log(req.body.email);
  try {
    const { email } = req.body;
    console.log(req.body.email);

    const user = await User.findOne({ email });
    console.log(user);

    if (!user) {
      console.log("user not found");
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log(resetToken);
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      to: email,
      subject: "Password Reset Instructions - Talking Me",
      html: `
        <h1>Talking Me</h1>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}">
          <button style="background-color: #007bff; color: white; padding: 10px 15px; border: none; cursor: pointer;">
            Reset Password
          </button>
        </a>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending reset email:", error);
        return res.status(500).json({ message: "Email sending failed" });
      } else {
        return res.json({
          message: "Password reset instructions sent to your email.",
        });
      }
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports.changePassword = async (req, res, next) => {
  try {
    const { password, recievedToken } = req.body;

    const decoded = jwt.verify(recievedToken, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    const userId = decoded.userId;
    const user = await User.findById(userId);
    console.log("Retrieved User:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt();
    user.password = password;
    await user.save();

    return res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports.setNotes = async (req, res, next) => {
  const token = req.cookies.auth_token;
  const title = req.body.title;
  const content = req.body.content;
  console.log(title);

  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const foundUser = await User.findOne({ _id: decodedToken.id });

      // Create a new note document
      const newNote = new Note({
        title,
        content,
      });
      await newNote.save();

      // Update the user's notes array with the note's ObjectId
      foundUser.notes.push(newNote._id);
      await foundUser.save();

      // Populate the notes array with the actual note documents
      const populatedUser = await User.findOne({
        _id: decodedToken.id,
      })
        .populate("notes")
        .populate("archivedNotes");
      res.json({ notes: populatedUser.notes });
    } catch (err) {
      res.json({ err });
    }
  }
};

module.exports.deleteNotes = (req, res, next) => {
  const token = req.cookies.auth_token;
  const id = req.params.id;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        res.json({ err });
        next();
      } else {
        const foundUser = await User.findOne({ _id: decodedToken.id });
        foundUser.notes.pull(id);
        await foundUser.save();
        const populatedUser = await User.findOne({
          _id: decodedToken.id,
        })
          .populate("notes")
          .populate("archivedNotes");

        res.json({ notes: populatedUser.notes });
        next();
      }
    });
  }
};

module.exports.editNote = (req, res, next) => {
  const token = req.cookies.auth_token;
  const { title, content, id } = req.body;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        res.json({ err });
        next();
      } else {
        const updatedNote = await Note.findByIdAndUpdate(
          id,
          { title, content },
          { new: true }
        );

        res.json({ status: "updated" });
        next();
      }
    });
  }
};

module.exports.archiveNotes = async (req, res, next) => {
  const token = req.cookies.auth_token;
  const noteId = req.body.id;

  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const foundUser = await User.findOne({ _id: decodedToken.id });

      const index = foundUser.notes.indexOf(noteId);
      if (index !== -1) {
        foundUser.notes.splice(index, 1);

        const noteToArchive = await Note.findById(noteId);

        const archivedNote = new ArchivedNoteModel({
          title: noteToArchive.title,
          content: noteToArchive.content,
        });

        await archivedNote.save();

        foundUser.archivedNotes.push(archivedNote._id);

        await foundUser.save();

        const populatedUser = await User.findOne({
          _id: decodedToken.id,
        })
          .populate("notes")
          .populate("archivedNotes");

        res.json({ user: populatedUser });
      } else {
        res
          .status(404)
          .json({ message: "Note not found in user's notes array" });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(401).json({ message: "Unauthorized access" });
  }
};

module.exports.unarchiveNotes = async (req, res, next) => {
  const token = req.cookies.auth_token;
  const noteId = req.body.id;

  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const foundUser = await User.findOne({ _id: decodedToken.id });

      const index = foundUser.archivedNotes.indexOf(noteId);

      if (index !== -1) {
        foundUser.archivedNotes.splice(index, 1);

        const archivedNote = await ArchivedNoteModel.findById(noteId);

        const newNote = new Note({
          title: archivedNote.title,
          content: archivedNote.content,
        });

        await newNote.save();

        foundUser.notes.push(newNote._id);

        await foundUser.save();

        const populatedUser = await User.findOne({
          _id: decodedToken.id,
        })
          .populate("notes")
          .populate("archivedNotes");

        const unpopulatedUser = populatedUser.toObject();
        delete unpopulatedUser.notes;
        delete unpopulatedUser.archivedNotes;

        res.json({ user: unpopulatedUser });
      } else {
        res
          .status(404)
          .json({ message: "Note not found in user's archivedNotes array" });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(401).json({ message: "Unauthorized access" });
  }
};
