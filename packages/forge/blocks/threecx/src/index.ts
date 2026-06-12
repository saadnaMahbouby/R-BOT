import { createBlock } from "@typebot.io/forge"
import { send3CXMessage } from "./actions/send3CXMessage"
import { send3CXMessageHandler } from "./handlers/send3CXMessageHandler"
import { ThreeCXLogo } from "./logo"

export const threecxBlock = createBlock({
  id: "threecx",
  name: "3CX WhatsApp",
  tags: ["communication", "whatsapp", "3cx"],
  LightLogo: ThreeCXLogo,
  actions: [send3CXMessage],
})

export default threecxBlock
export { send3CXMessageHandler }
