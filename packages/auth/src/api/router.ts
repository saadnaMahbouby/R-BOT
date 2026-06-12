import { prepareLogin } from "./prepareLogin";
import { sendUpdateEmailVerifCodeEmail } from "./sendUpdateEmailVerifCodeEmail";
import { updateUserEmail } from "./updateUserEmail";

export const authRouter = {
  sendUpdateEmailVerifCodeEmail,
  updateUserEmail,
  prepareLogin,
};
