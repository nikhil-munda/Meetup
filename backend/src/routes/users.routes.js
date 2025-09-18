import { Router } from "express";
import { login, register } from "../controllers/user.controller.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
// Add handlers for these routes or remove them if not needed
// router.route("/add_to_activity").post(handlerFunction);
// router.route("/get_all_activities").get(handlerFunction);

export default router;