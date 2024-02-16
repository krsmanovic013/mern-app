const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const HttpError = require("../models/errorModel");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const path = require("path");

exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return next(new HttpError("Fill all fields", 422));
    }

    const newEmail = email.toLowerCase();
    const emailExists = await User.findOne({ email: newEmail });

    if (emailExists) {
      return next(new HttpError("Email already exists", 422));
    }

    if (password.trim().length < 6) {
      return next(new HttpError("Password must be at least 6 characters", 422));
    }

    if (password !== confirmPassword) {
      return next(new HttpError("Passwords do not match", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });

    res.status(201).json({
      status: "succes",
      message: `New user ${newUser.email} registered`,
    });
  } catch (error) {
    return next(new HttpError("User registration failed", 422));
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new HttpError("Fill all fields", 422));
    }

    const newEmail = email.toLowerCase();
    const user = await User.findOne({ email: newEmail });

    if (!user) {
      return next(new HttpError("Invalid credentials", 422));
    }

    const comparePass = await bcrypt.compare(password, user.password);

    if (!comparePass) {
      return next(new HttpError("Invalid credentials", 422));
    }

    const { _id: id, name } = user;

    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login failed. Please check your credemtials", 422)
    );
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select(["-password", "-__v"]);

    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    res.status(200).json({ status: "succes", user });
  } catch (error) {
    return next(new HttpError("User not found", 404));
  }
};

exports.getAuthors = async (req, res, next) => {
  try {
    const users = await User.find().select(["-password", "-__v"]);

    res.status(200).json({ status: "succes", users });
  } catch (error) {
    return next(new HttpError("User not found", 404));
  }
};

exports.changeAvatar = async (req, res, next) => {
  try {
    if (!req.files.avatar) {
      return next(new HttpError("Please choose an image.", 422));
    }

    const user = await User.findById(req.user.id);

    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (err) => {
        if (err) {
          return next(new HttpError(err));
        }
      });
    }

    const { avatar } = req.files;

    if (avatar.size > 500000) {
      return next(
        new HttpError("Profile picture too big. Should be less tham 500kb", 422)
      );
    }

    let fileName = avatar.name;
    let splittedFileName = fileName.split(".");
    let newFileName =
      splittedFileName[0] +
      uuid() +
      "." +
      splittedFileName[splittedFileName.length - 1];

    avatar.mv(
      path.join(__dirname, "..", "uploads", newFileName),
      async (err) => {
        if (err) {
          return next(new HttpError(err));
        }

        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFileName },
          { new: true }
        );

        if (!updatedAvatar) {
          return next(new HttpError("Avatar couldn't be updated", 422));
        }

        res.status(200).json({ status: "succes", updatedAvatar });
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;

    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new HttpError("User not found", 403));
    }

    const emailExists = await User.findOne({ email });

    if (emailExists && emailExists._id !== req.user.id) {
      return next(new HttpError("Email already exist", 422));
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return next(new HttpError("Invalid current password", 422));
    }

    if (newPassword !== confirmNewPassword) {
      return next(new HttpError("Passwords do not match", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );

    res.status(200).json({ status: "succes", newInfo });
  } catch (error) {
    return next(new HttpError(error));
  }
};
