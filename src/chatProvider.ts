import * as vscode from "vscode";
import { ChatWebviewProvider } from "./chatWebviewProvider";

export class ChatProvider {
  private webviewProvider: ChatWebviewProvider;

  constructor(private context: vscode.ExtensionContext) {
    this.webviewProvider = new ChatWebviewProvider(context);
  }

  public openChat(): void {
    this.webviewProvider.show();
  }
}
