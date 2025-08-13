import OpenAI from "openai";
import { PageAnalysis } from "./playwrightAnalyzer";

export interface ScenarioStep {
  type: "Given" | "When" | "Then" | "And" | "But";
  text: string;
}

export interface BDDScenario {
  name: string;
  tags: string[];
  steps: ScenarioStep[];
}

export interface BDDFeature {
  name: string;
  description?: string;
  tags: string[];
  scenarios: BDDScenario[];
}

export class OpenAIScenarioGenerator {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(apiKey?: string) {
    // Try to get API key from parameter, environment, or throw error
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OpenAI API key is required. Provide it as a parameter or set OPENAI_API_KEY environment variable."
      );
    }

    this.openai = new OpenAI({
      apiKey: key,
    });

    // Configure model settings from environment or defaults
    this.model = process.env.OPENAI_MODEL || "gpt-4";
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || "0.7");
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || "2000");
  }

  // Static method to create instance with environment variables
  static fromEnvironment(): OpenAIScenarioGenerator {
    return new OpenAIScenarioGenerator();
  }

  async generateScenarios(
    userStory: string,
    pageAnalysis: PageAnalysis
  ): Promise<BDDFeature> {
    const prompt = this.buildPrompt(userStory, pageAnalysis);

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a senior QA automation engineer and BDD expert specializing in comprehensive web application testing. Your job is to analyze web pages and generate high-quality Gherkin scenarios for Playwright automation.

                        Guidelines:
                        - Generate 3-7 realistic test scenarios based on the user story and page analysis
                        - Use proper Gherkin syntax (Given/When/Then/And/But)
                        - Focus on testable, specific actions and assertions
                        - Use the actual element names and locators from the page analysis
                        - Include both positive and negative test cases where appropriate
                        - Add relevant tags like @smoke, @regression, @critical, @negative, @content-verification
                        - Make scenarios atomic and independent
                        
                        SCENARIO TYPES TO INCLUDE:
                        1. **Functional Testing**: User interactions, form submissions, navigation
                        2. **Content Verification**: Checking headings, paragraphs, lists, tables, images
                        3. **Data Validation**: Form validations, error handling, success messages
                        4. **Visual Testing**: Element visibility, image loading, table data display
                        5. **User Experience**: Navigation flows, accessibility, responsive behavior
                        
                        CONTENT VERIFICATION PATTERNS:
                        - Headings: "Then I should see the heading 'Welcome to Dashboard'"
                        - Paragraphs: "Then I should see text containing 'User profile updated successfully'"
                        - Lists: "Then I should see a list containing 'Item 1', 'Item 2', 'Item 3'"
                        - Tables: "Then I should see a table with at least 3 rows of data"
                        - Images: "Then I should see the profile image with alt text 'User Avatar'"
                        
                        Response format: Valid JSON only, following this exact structure:
                        {
                          "name": "Feature Name",
                          "description": "Brief description",
                          "tags": ["@tag1", "@tag2"],
                          "scenarios": [
                            {
                              "name": "Scenario name",
                              "tags": ["@tag1"],
                              "steps": [
                                {"type": "Given", "text": "I am on the login page"},
                                {"type": "When", "text": "I fill in email field"},
                                {"type": "Then", "text": "I should see success message"}
                              ]
                            }
                          ]
                        }`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse JSON response
      const feature = JSON.parse(content) as BDDFeature;
      return feature;
    } catch (error) {
      console.error("Error generating scenarios:", error);
      // Fallback to simple scenario generation
      return this.generateFallbackScenarios(userStory, pageAnalysis);
    }
  }

  private buildPrompt(userStory: string, pageAnalysis: PageAnalysis): string {
    const formFieldsInfo = pageAnalysis.form_fields
      .map(
        (field) =>
          `- ${field.role}: "${field.name_or_label}" (${field.suggested_locator})`
      )
      .join("\n");

    const interactiveElementsInfo = pageAnalysis.interactive_elements
      .map(
        (element) =>
          `- ${element.role}: "${element.name_or_label}" (${element.suggested_locator})`
      )
      .join("\n");

    const contentElementsInfo = pageAnalysis.content_elements
      .map(
        (element) =>
          `- ${element.role}: "${element.name_or_label}" (${element.suggested_locator})`
      )
      .join("\n");

    const navigationElementsInfo = pageAnalysis.navigation_elements
      .map(
        (element) =>
          `- ${element.role}: "${element.name_or_label}" (${element.suggested_locator})`
      )
      .join("\n");

    return `
USER STORY:
${userStory}

PAGE ANALYSIS:
URL: ${pageAnalysis.url}
Title: ${pageAnalysis.title}
High-level actions: ${pageAnalysis.high_level_actions.join(", ")}

FORM FIELDS:
${formFieldsInfo || "None detected"}

INTERACTIVE ELEMENTS (buttons, links, checkboxes, etc.):
${interactiveElementsInfo || "None detected"}

CONTENT ELEMENTS (headings, paragraphs, lists, tables, images):
${contentElementsInfo || "None detected"}

NAVIGATION ELEMENTS:
${navigationElementsInfo || "None detected"}

PAGE STRUCTURE:
${pageAnalysis.page_structure.substring(0, 1000)}

INSTRUCTIONS:
Generate comprehensive BDD scenarios that test the functionality described in the user story. Use the actual elements found on the page analysis.

Focus on:
1. **User interactions** - filling forms, clicking buttons, navigating links
2. **Content verification** - checking headings, paragraphs, lists, tables, images are displayed correctly
3. **Data validation** - verifying form inputs, error messages, success states
4. **Navigation flows** - testing page transitions and routing
5. **Visual elements** - ensuring images load, tables display data, lists show items
6. **Error scenarios** - invalid inputs, missing data, network issues

For content verification, use these patterns:
- "Then I should see the heading '{heading_text}'"
- "Then I should see the paragraph containing '{paragraph_text}'"
- "Then I should see a list with {number} items"
- "Then I should see a table with {number} rows"
- "Then I should see the image with alt text '{alt_text}'"

Include realistic test scenarios with proper Given/When/Then structure and appropriate tags.
`;
  }

  private generateFallbackScenarios(
    userStory: string,
    pageAnalysis: PageAnalysis
  ): BDDFeature {
    // Simple fallback when OpenAI fails
    const isLoginPage =
      userStory.toLowerCase().includes("login") ||
      pageAnalysis.form_fields.some((field) =>
        field.name_or_label.toLowerCase().includes("password")
      );

    if (isLoginPage) {
      return {
        name: "User Authentication",
        description: "Test user login functionality",
        tags: ["@smoke", "@auth"],
        scenarios: [
          {
            name: "Successful login with valid credentials",
            tags: ["@positive", "@critical"],
            steps: [
              { type: "Given", text: `I navigate to "${pageAnalysis.url}"` },
              {
                type: "When",
                text: "I fill in the email field with valid email",
              },
              {
                type: "And",
                text: "I fill in the password field with valid password",
              },
              { type: "And", text: "I click the login button" },
              { type: "Then", text: "I should be redirected to the dashboard" },
              { type: "And", text: "I should see a welcome message" },
            ],
          },
          {
            name: "Failed login with invalid credentials",
            tags: ["@negative"],
            steps: [
              { type: "Given", text: `I navigate to "${pageAnalysis.url}"` },
              {
                type: "When",
                text: "I fill in the email field with invalid email",
              },
              {
                type: "And",
                text: "I fill in the password field with invalid password",
              },
              { type: "And", text: "I click the login button" },
              { type: "Then", text: "I should see an error message" },
              { type: "And", text: "I should remain on the login page" },
            ],
          },
        ],
      };
    }

    // Generic page testing
    return {
      name: "Page Functionality",
      description: "Test basic page functionality",
      tags: ["@smoke"],
      scenarios: [
        {
          name: "Page loads successfully",
          tags: ["@positive"],
          steps: [
            { type: "Given", text: `I navigate to "${pageAnalysis.url}"` },
            {
              type: "Then",
              text: `I should see the page title "${pageAnalysis.title}"`,
            },
            { type: "And", text: "The page should load completely" },
          ],
        },
      ],
    };
  }

  async generateStepDefinitions(
    feature: BDDFeature,
    pageAnalysis: PageAnalysis
  ): Promise<string> {
    const prompt = `
Generate TypeScript step definitions for these BDD scenarios using Playwright and playwright-bdd.

FEATURE:
${JSON.stringify(feature, null, 2)}

PAGE ELEMENTS:
${pageAnalysis.key_elements
  .map((el) => `${el.name_or_label}: ${el.suggested_locator}`)
  .join("\n")}

CONTENT ELEMENTS:
${pageAnalysis.content_elements
  .map((el) => `${el.role} - ${el.name_or_label}: ${el.suggested_locator}`)
  .join("\n")}

Requirements:
- Use playwright-bdd syntax with createBdd(test)
- Include proper TypeScript types
- Use the actual locators from the page analysis
- Handle common patterns like form filling, button clicking, navigation
- Include content verification steps for headings, paragraphs, lists, tables, images
- Include proper error handling and assertions
- Make steps reusable across scenarios
- Add steps for visual element verification and data validation

CONTENT VERIFICATION PATTERNS TO INCLUDE:
- Heading verification: page.getByRole('heading', { name: 'text' })
- Text content: page.getByText('text') or page.locator('p').filter({ hasText: 'text' })
- List verification: page.locator('ul li, ol li') for list items
- Table verification: page.locator('table tr') for table rows
- Image verification: page.getByAltText('alt text')

Return only the TypeScript code, no explanations.
`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a Playwright automation expert. Generate clean, production-ready TypeScript step definitions using playwright-bdd.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for code generation
        max_tokens: 1500,
      });

      return (
        completion.choices[0]?.message?.content ||
        this.getFallbackStepDefinitions()
      );
    } catch (error) {
      console.error("Error generating step definitions:", error);
      return this.getFallbackStepDefinitions();
    }
  }

  private getFallbackStepDefinitions(): string {
    return `import { test, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd(test);

// Navigation steps
Given('I navigate to {string}', async ({ page }, url: string) => {
    await page.goto(url);
});

Given('I am on the {string} page', async ({ page }, pageName: string) => {
    // Implementation depends on page routing
    await page.waitForLoadState('networkidle');
});

// Form interaction steps
When('I fill in the {string} field with {string}', async ({ page }, fieldName: string, value: string) => {
    await page.getByLabel(fieldName).fill(value);
});

When('I fill in {string} with {string}', async ({ page }, fieldName: string, value: string) => {
    await page.getByLabel(fieldName).fill(value);
});

When('I click the {string} button', async ({ page }, buttonName: string) => {
    await page.getByRole('button', { name: buttonName }).click();
});

When('I click {string}', async ({ page }, elementName: string) => {
    await page.getByRole('button', { name: elementName }).click();
});

When('I click the link {string}', async ({ page }, linkText: string) => {
    await page.getByRole('link', { name: linkText }).click();
});

// Content verification steps
Then('I should see the heading {string}', async ({ page }, headingText: string) => {
    await expect(page.getByRole('heading', { name: headingText })).toBeVisible();
});

Then('I should see text containing {string}', async ({ page }, text: string) => {
    await expect(page.getByText(text)).toBeVisible();
});

Then('I should see the paragraph containing {string}', async ({ page }, text: string) => {
    await expect(page.locator('p').filter({ hasText: text })).toBeVisible();
});

Then('I should see a list containing {string}', async ({ page }, itemText: string) => {
    await expect(page.locator('ul li, ol li').filter({ hasText: itemText })).toBeVisible();
});

Then('I should see a list with {int} items', async ({ page }, itemCount: number) => {
    const listItems = page.locator('ul li, ol li');
    await expect(listItems).toHaveCount(itemCount);
});

Then('I should see a table with at least {int} rows', async ({ page }, minRows: number) => {
    const tableRows = page.locator('table tr');
    await expect(tableRows).toHaveCount({ gte: minRows });
});

Then('I should see a table with {int} rows', async ({ page }, rowCount: number) => {
    const tableRows = page.locator('table tr');
    await expect(tableRows).toHaveCount(rowCount);
});

Then('I should see the image with alt text {string}', async ({ page }, altText: string) => {
    await expect(page.getByAltText(altText)).toBeVisible();
});

Then('I should see an image', async ({ page }) => {
    await expect(page.locator('img')).toBeVisible();
});

// General assertion steps
Then('I should see {string}', async ({ page }, text: string) => {
    await expect(page.getByText(text)).toBeVisible();
});

Then('I should be redirected to the {string}', async ({ page }, pageName: string) => {
    await expect(page).toHaveURL(new RegExp(pageName));
});

Then('I should see the page title {string}', async ({ page }, title: string) => {
    await expect(page).toHaveTitle(title);
});

Then('I should see an error message', async ({ page }) => {
    await expect(page.getByRole('alert')).toBeVisible();
});

Then('I should remain on the {string} page', async ({ page }, pageName: string) => {
    await expect(page).toHaveURL(new RegExp(pageName));
});

Then('The page should load completely', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
});

// Element visibility and interaction verification
Then('{string} should be visible', async ({ page }, elementName: string) => {
    await expect(page.getByText(elementName)).toBeVisible();
});

Then('{string} should be clickable', async ({ page }, elementName: string) => {
    await expect(page.getByRole('button', { name: elementName })).toBeEnabled();
});

Then('the form should be submitted successfully', async ({ page }) => {
    await expect(page.getByText(/success|submitted|saved/i)).toBeVisible();
});`;
  }
}
