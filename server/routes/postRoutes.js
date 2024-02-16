const { Router } = require("express");
const {
  getPosts,
  getPost,
  getCatPosts,
  getUserPosts,
  createPost,
  editPost,
  deletePost,
} = require("../controllers/postControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.get("/", getPosts);
router.get("/:id", getPost);
router.get("/categories/:category", getCatPosts);
router.get("/users/:id", getUserPosts);
router.post("/", authMiddleware, createPost);
router.patch("/:id", authMiddleware, editPost);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;
