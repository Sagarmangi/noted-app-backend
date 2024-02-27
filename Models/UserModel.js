const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  notes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
  ],
  archivedNotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArchivedNote",
    },
  ],
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    // Skip rehashing password if it's not modified
    return next();
  }

  try {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return next(err);
  }

  //   const salt = await bcrypt.genSalt();
  //   this.password = await bcrypt.hash(this.password, salt);
  //   next();
});

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user;
    }
    throw Error("incorrect password");
  }
  throw Error("incorrect email");
};

module.exports = mongoose.model("User", userSchema);
