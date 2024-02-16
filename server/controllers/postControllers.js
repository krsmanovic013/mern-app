const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");

exports.createPost = async (req, res, next) => {
  try {
    const { title, category, description } = req.body;

    if (!title || !category || !description || !req.files) {
      return next(
        new HttpError("Fill in all fields and choose thumbnail"),
        422
      );
    }
    const { thumbnail } = req.files;

    if (thumbnail.size > 2000000) {
      return next(new HttpError("Thumbail must be less than 2mb"));
    }
    let fileName = thumbnail.name;
    let splitted = fileName.split(".");
    let newFileName =
      splitted[0] + uuid() + "." + splitted[splitted.length - 1];
    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newFileName),
      async (error) => {
        if (error) {
          return next(new HttpError(error));
        }
        const newPost = await Post.create({
          title,
          category,
          description,
          thumbnail: newFileName,
          creator: req.user.id,
        });

        if (!newPost) {
          return next(new HttpError("Post couldn't be created.", 422));
        }

        const currentUser = await User.findById(req.user.id);
        const userPostCount = currentUser.posts + 1;
        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

        res.status(200).json({ status: "succes", newPost });
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: "succes",
      posts,
    });
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return next(new HttpError("Post not found", 404));
    }

    res.status(200).json({ status: "succes", post });
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;

    const posts = await Post.find({ category }).sort({ createdAt: -1 });

    res.status(200).json({ status: "succes", posts });
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });

    res.status(200).json({ status: "succes", posts });
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.editPost = async (req, res, next) => {
  try {
    let updatedPost;
    let fileName;
    let newFilename;

    const postId = req.params.id;
    const { title, category, description } = req.body;

    if (!title || !category || description.length < 12) {
      return next(new HttpError("Fill in all fields", 422));
    }
    const oldPost = await Post.findById(postId);
    if (req.user.id == oldPost.creator) {
      if (!req.files) {
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { title, category, description },
          { new: true }
        );
      } else {
        fs.unlink(
          path.join(__dirname, "..", "uploads", oldPost.thumbnail),
          async (err) => {
            if (err) {
              return next(new HttpError(err));
            }
          }
        );

        const { thumbnail } = req.files;

        if (thumbnail.size > 2000000) {
          return next(
            new HttpError("Thumbnail too big. Should be less than 2mb")
          );
        }

        fileName = thumbnail.name;
        let splitted = fileName.split(".");
        newFilename =
          splitted[0] + uuid() + "." + splitted[splitted.length - 1];
        thumbnail.mv(
          path.join(__dirname, "..", "uploads", newFilename),
          async (err) => {
            if (err) {
              return next(new HttpError(err));
            }

            updatedPost = await Post.findByIdAndUpdate(
              postId,
              {
                title,
                category,
                description,
                thumbnail: newFilename,
              },
              { new: true }
            );
          }
        );
      }
    }

    if (!updatedPost) {
      new HttpError("Couldn't updated post.", 400);
    }

    res.status(200).json({ status: "succes", updatedPost });
  } catch (error) {
    return next(new HttpError(error));
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);

    if (!post) {
      return next(new HttpError("Post does not exist", 404));
    }

    const fileName = post?.thumbnail;

    if (req.user.id == post.creator) {
      fs.unlink(
        path.join(__dirname, "..", "uploads", fileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          } else {
            await Post.findByIdAndDelete(postId);

            const user = await User.findById(req.user.id);

            const newPostsCount = user.posts - 1;

            await User.findByIdAndUpdate(req.user.id, { posts: newPostsCount });
            res.status(200).json(`Post ${postId} deleted successfully.`);
          }
        }
      );
    } else {
      return next(new HttpError("Post could not be deleted.", 403));
    }
  } catch (error) {
    return next(new HttpError(error));
  }
};
