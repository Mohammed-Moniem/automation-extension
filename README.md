# Playwright-BDD Automation Chat Assistant

A VS Code extension that provides an AI-powered chat assistant for generating BDD test scenarios and Playwright automation code with intelligent project structure detection.

## Features

- 🎭 **Interactive Chat Interface**: Communicate with an AI assistant through a clean, VS Code-integrated chat interface
- 📝 **BDD Scenario Generation**: Automatically generate Gherkin scenarios based on your testing goals
- 🔍 **Smart Page Analysis**: Analyze web pages to identify testable elements, content, and actions using real Playwright browser automation
- 🚀 **TypeScript Step Definitions**: Generate clean, Playwright-compatible TypeScript step definitions
- 📁 **Intelligent File Management**: Automatically detect existing project structure and create files in appropriate locations
- ⚡ **Seamless Integration**: Works with any Playwright-BDD project structure
- 🧠 **AI-Powered**: Uses OpenAI GPT-4 for intelligent scenario generation with fallback options

## Getting Started

1. **Install the Extension**
   - Install from VS Code Marketplace (coming soon)
   - Or install from VSIX file

2. **Set Up OpenAI API Key (Optional)**
   - Create a `.env` file in your project root
   - Add `OPENAI_API_KEY=your_api_key_here`
   - Or configure in VS Code settings

3. **Open the Chat Assistant**
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run "Open Playwright-BDD Chat Assistant"

4. **Start Creating Tests**
   - Describe your testing story or goal
   - Provide the URL of the page you want to test
   - Review and approve generated scenarios
   - Files are automatically saved to your project's existing structure

## Intelligent Project Detection

The extension automatically detects and adapts to your project structure:

- ✅ Existing `features/` or `feature/` directories
- ✅ Custom structures like `tests/features/`, `e2e/features/`
- ✅ Playwright configuration files
- ✅ Step-first projects with existing `steps/` directories

## Example Usage

```
You: I want to test the login functionality for https://example.com/login

Assistant: I'll analyze the login page and create BDD scenarios for you!

*Analyzing page...*

Generated scenarios:
- User login with valid credentials
- User login with invalid credentials
- Password visibility toggle
- Remember me functionality
```

## Requirements

- VS Code 1.74.0 or higher
- Node.js 16+ (for extension development)
- Playwright 1.20+ (automatically handled)
- OpenAI API key (optional, for AI features)

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for "Playwright-BDD Chat Assistant"
4. Click Install

### From VSIX File
1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view
4. Click "..." → "Install from VSIX..."
5. Select the downloaded file

## Configuration

### OpenAI API Key
Set your OpenAI API key in one of these ways:

1. **Environment Variable** (Recommended)
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

2. **Project .env File**
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. **VS Code Settings**
   - Open Settings (`Cmd+,` / `Ctrl+,`)
   - Search for "playwright-bdd-assistant"
   - Set the API key

### Extension Settings

- `playwright-bdd-assistant.openaiApiKey`: Your OpenAI API key
- `playwright-bdd-assistant.model`: GPT model to use (default: gpt-4)
- `playwright-bdd-assistant.autoSave`: Auto-save generated files (default: true)
- `playwright-bdd-assistant.debugMode`: Enable debug logging (default: false)

## How It Works

1. **Page Analysis**: Uses Playwright to visit the provided URL and extract:
   - Interactive elements (buttons, inputs, links)
   - Page content (headings, text, images)
   - Form structures and validation
   - Navigation elements

2. **AI Generation**: Sends page structure to OpenAI GPT-4 with:
   - Your testing goals
   - Best practices for BDD scenarios
   - Playwright-specific patterns

3. **Smart File Creation**: Automatically:
   - Detects your project structure
   - Places files in appropriate directories
   - Follows naming conventions
   - Cleans and formats generated content

## Project Structure Detection

The extension intelligently detects various project structures:

```
📁 Your Project
├── features/                    # ✅ Standard features directory
├── tests/features/             # ✅ Nested features
├── e2e/features/               # ✅ E2E test structure
├── src/tests/features/         # ✅ Source-based tests
├── steps/                      # ✅ Step-first projects
└── playwright.config.js        # ✅ Playwright config detection
```

## Generated File Examples

### Feature File
```gherkin
Feature: User Authentication
  As a user
  I want to log into the application
  So that I can access my account

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter valid credentials
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message
```

### Step Definitions
```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { Page, expect } from '@playwright/test';

Given('I am on the login page', async function (this: { page: Page }) {
  await this.page.goto('/login');
});

When('I enter valid credentials', async function (this: { page: Page }) {
  await this.page.fill('[data-testid="email"]', 'user@example.com');
  await this.page.fill('[data-testid="password"]', 'password123');
});
```

## Troubleshooting

### Common Issues

**Extension not activating**
- Ensure VS Code version is 1.74.0+
- Check the Output panel for error messages
- Restart VS Code

**OpenAI API errors**
- Verify your API key is correct
- Check your OpenAI account has available credits
- Ensure network connectivity

**File creation issues**
- Check workspace folder permissions
- Ensure the project is opened as a folder, not individual files
- Verify disk space availability

**Page analysis failures**
- Check URL accessibility
- Ensure the target site allows automated access
- Try with a simpler page first

### Debug Mode
Enable debug mode in settings to see detailed logs:
1. Open VS Code Settings
2. Search for "playwright-bdd-assistant.debugMode"
3. Enable the setting
4. Check the Output panel → "Playwright-BDD Assistant"

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/automation-extension.git
   cd automation-extension
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run in development**
   ```bash
   npm run watch
   ```
   Then press F5 to launch the Extension Development Host

5. **Make your changes**
6. **Test thoroughly**
7. **Submit a pull request**

### Development Setup

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test

# Package extension
npm run package
```

## Architecture

```
src/
├── extension.ts              # Main extension entry point
├── playwrightBDDAssistant.ts # Core assistant logic
├── openaiService.ts          # OpenAI integration
├── playwrightAnalyzer.ts     # Page analysis engine
├── chatWebviewProvider.ts    # VS Code webview interface
└── utils/                    # Utility functions
```

## License

MIT License - see LICENSE file for details

## Support

- 📚 [Documentation](https://github.com/Mohammed-Moniem/automation-extension/wiki)
- 🐛 [Issue Tracker](https://github.com/Mohammed-Moniem/automation-extension/issues)
- 💬 [Discussions](https://github.com/Mohammed-Moniem/automation-extension/discussions)
- 📧 [Email Support](mailto:support@automation-extension.com)

## Roadmap

- [ ] VS Code Marketplace publication
- [ ] Visual test recorder integration
- [ ] Multi-language support (Java, Python, C#)
- [ ] Custom AI model support
- [ ] Team collaboration features
- [ ] CI/CD integration templates
- [ ] Advanced page object model generation

---

**Happy Testing! 🎭✨**