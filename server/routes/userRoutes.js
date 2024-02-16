const { Router } = require("express");
const {
  registerUser,
  getUser,
  loginUser,
  getAuthors,
  changeAvatar,
  editUser,
} = require("../controllers/userControllers");

const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.get("/:id", getUser);
router.get("/", getAuthors);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/change-avatar", authMiddleware, changeAvatar);
router.patch("/edit-user", authMiddleware, editUser);

module.exports = router;
