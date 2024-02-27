const { register, login } = require("../Controllers/AuthControllers");
const {
  checkUser,
  setNotes,
  deleteNotes,
  editNote,
  archiveNotes,
  unarchiveNotes,
  resetPassword,
  changePassword,
} = require("../Middlewares/AuthMiddlewares");

const router = require("express").Router();

router.post("/", checkUser);
router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", resetPassword);
// router.post("/reset-password", (req, res) => {
//   console.log(req.body.email);
// });
router.post("/change-password", changePassword);
router.post("/post", setNotes);
router.delete("/:id", deleteNotes);
router.post("/edit", editNote);
router.post("/archive", archiveNotes);
router.post("/unarchive", unarchiveNotes);

module.exports = router;
