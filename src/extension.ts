import * as vscode from "vscode";
import { ChatProvider } from "./chatProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Playwright-BDD Assistant is now active!");

  // Register the chat provider
  const chatProvider = new ChatProvider(context);

  // Register command to open chat
  const openChatCommand = vscode.commands.registerCommand(
    "playwright-bdd-assistant.openChat",
    () => {
      chatProvider.openChat();
    }
  );

  context.subscriptions.push(openChatCommand);
}

export function deactivate() {
  console.log("Playwright-BDD Assistant is now deactivated!");
}
