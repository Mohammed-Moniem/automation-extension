import { Browser, chromium, Page } from "playwright";

export interface PageElement {
  role: string;
  name_or_label: string;
  suggested_locator: string;
  text_content?: string;
  tag_name: string;
  attributes: Record<string, string>;
}

export interface PageAnalysis {
  url: string;
  title: string;
  high_level_actions: string[];
  key_elements: PageElement[];
  page_structure: string;
  form_fields: PageElement[];
  interactive_elements: PageElement[];
  navigation_elements: PageElement[];
  content_elements: PageElement[];
}

export class PlaywrightPageAnalyzer {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async analyzePage(url: string): Promise<PageAnalysis> {
    await this.initialize();

    const page = await this.browser!.newPage();

    try {
      // Navigate to the page
      await page.goto(url, { waitUntil: "networkidle" });

      // Get basic page info
      const title = await page.title();

      // Extract all interactive elements
      const elements = await this.extractElements(page);

      // Extract content elements
      const contentElements = await this.extractContentElements(page);

      // Categorize elements
      const formFields = elements.filter(
        (el) =>
          ["textbox", "input", "textarea", "combobox", "listbox"].includes(
            el.role
          ) ||
          ["input", "textarea", "select"].includes(el.tag_name.toLowerCase())
      );

      const interactiveElements = elements.filter(
        (el) =>
          ["button", "link", "checkbox", "radio", "switch"].includes(el.role) ||
          ["button", "a"].includes(el.tag_name.toLowerCase())
      );

      const navigationElements = elements.filter(
        (el) =>
          el.role === "link" ||
          (el.tag_name.toLowerCase() === "a" && el.attributes.href) ||
          el.role === "navigation"
      );

      // Get page structure
      const pageStructure = await this.getPageStructure(page);

      // Infer high-level actions
      const highLevelActions = this.inferActions(
        formFields,
        interactiveElements,
        contentElements
      );

      return {
        url,
        title,
        high_level_actions: highLevelActions,
        key_elements: elements,
        page_structure: pageStructure,
        form_fields: formFields,
        interactive_elements: interactiveElements,
        navigation_elements: navigationElements,
        content_elements: contentElements,
      };
    } finally {
      await page.close();
    }
  }

  private async extractElements(page: Page): Promise<PageElement[]> {
    const elements: PageElement[] = [];

    // Get all interactive elements
    const locators = [
      "input",
      "button",
      "select",
      "textarea",
      "a[href]",
      '[role="button"]',
      '[role="textbox"]',
      '[role="combobox"]',
      '[role="checkbox"]',
      '[role="radio"]',
      "[data-testid]",
      "[aria-label]",
    ];

    for (const selector of locators) {
      const elementHandles = await page.$$(selector);

      for (const handle of elementHandles) {
        try {
          const element = await this.extractElementInfo(handle, page);
          if (element) {
            elements.push(element);
          }
        } catch (error) {
          // Skip elements that can't be analyzed
          continue;
        }
      }
    }

    // Remove duplicates based on suggested_locator
    const uniqueElements = elements.filter(
      (element, index, self) =>
        index ===
        self.findIndex((e) => e.suggested_locator === element.suggested_locator)
    );

    return uniqueElements;
  }

  private async extractContentElements(page: Page): Promise<PageElement[]> {
    const elements: PageElement[] = [];

    // Headings
    const headings = await page.$$("h1, h2, h3, h4, h5, h6");
    for (const heading of headings) {
      try {
        const tagName = await heading.evaluate((el) =>
          el.tagName.toLowerCase()
        );
        const textContent = (await heading.textContent())?.trim();
        const id = await heading.getAttribute("id");
        const className = await heading.getAttribute("class");

        if (textContent) {
          elements.push({
            role: "heading",
            name_or_label: textContent,
            suggested_locator: this.generateContentLocator(
              "heading",
              textContent,
              tagName,
              id,
              className
            ),
            tag_name: tagName,
            text_content: textContent,
            attributes: { id: id || "", class: className || "" },
          });
        }
      } catch (error) {
        continue;
      }
    }

    // Paragraphs
    const paragraphs = await page.$$("p");
    for (const paragraph of paragraphs) {
      try {
        const textContent = (await paragraph.textContent())?.trim();
        const id = await paragraph.getAttribute("id");
        const className = await paragraph.getAttribute("class");

        if (textContent && textContent.length > 10) {
          const preview =
            textContent.length > 50
              ? textContent.substring(0, 50) + "..."
              : textContent;
          elements.push({
            role: "paragraph",
            name_or_label: preview,
            suggested_locator: this.generateContentLocator(
              "paragraph",
              textContent,
              "p",
              id,
              className
            ),
            tag_name: "p",
            text_content: textContent,
            attributes: { id: id || "", class: className || "" },
          });
        }
      } catch (error) {
        continue;
      }
    }

    // Lists
    const lists = await page.$$("ul, ol");
    for (const list of lists) {
      try {
        const tagName = await list.evaluate((el) => el.tagName.toLowerCase());
        const items = await list.$$("li");
        const id = await list.getAttribute("id");
        const className = await list.getAttribute("class");

        if (items.length > 0) {
          const firstItemText = (await items[0].textContent())?.trim() || "";
          const listType = tagName === "ul" ? "unordered" : "ordered";

          elements.push({
            role: "list",
            name_or_label: `${listType} list with ${items.length} items`,
            suggested_locator: this.generateContentLocator(
              "list",
              firstItemText,
              tagName,
              id,
              className
            ),
            tag_name: tagName,
            text_content: `List with ${items.length} items. First item: ${firstItemText}`,
            attributes: {
              id: id || "",
              class: className || "",
              type: listType,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }

    // Tables
    const tables = await page.$$("table");
    for (const table of tables) {
      try {
        const captionElement = await table.$("caption");
        const caption = captionElement
          ? await captionElement.textContent()
          : null;
        const rows = await table.$$("tr");
        const id = await table.getAttribute("id");
        const className = await table.getAttribute("class");

        elements.push({
          role: "table",
          name_or_label: caption || `Table with ${rows.length} rows`,
          suggested_locator: this.generateContentLocator(
            "table",
            caption || "",
            "table",
            id,
            className
          ),
          tag_name: "table",
          text_content: `Table with ${rows.length} rows`,
          attributes: { id: id || "", class: className || "" },
        });
      } catch (error) {
        continue;
      }
    }

    // Images
    const images = await page.$$("img");
    for (const img of images) {
      try {
        const alt = await img.getAttribute("alt");
        const src = await img.getAttribute("src");
        const id = await img.getAttribute("id");
        const className = await img.getAttribute("class");

        if (alt || src) {
          elements.push({
            role: "image",
            name_or_label: alt || `Image: ${src?.split("/").pop()}`,
            suggested_locator: this.generateContentLocator(
              "image",
              alt || "",
              "img",
              id,
              className
            ),
            tag_name: "img",
            text_content: alt || "",
            attributes: {
              id: id || "",
              class: className || "",
              src: src || "",
              alt: alt || "",
            },
          });
        }
      } catch (error) {
        continue;
      }
    }

    return elements;
  }

  private async extractElementInfo(
    handle: any,
    page: Page
  ): Promise<PageElement | null> {
    try {
      const tagName = await handle.tagName();
      const attributes: Record<string, string> = {};

      // Get common attributes
      const attrNames = [
        "id",
        "class",
        "name",
        "type",
        "placeholder",
        "aria-label",
        "data-testid",
        "href",
        "role",
      ];
      for (const attr of attrNames) {
        const value = await handle.getAttribute(attr);
        if (value) {
          attributes[attr] = value;
        }
      }

      const textContent = await handle.textContent();
      const role = await this.inferRole(handle, tagName, attributes);
      const nameOrLabel = await this.getElementName(
        handle,
        attributes,
        textContent
      );
      const suggestedLocator = this.generateLocator(
        role,
        nameOrLabel,
        attributes,
        tagName
      );

      return {
        role,
        name_or_label: nameOrLabel,
        suggested_locator: suggestedLocator,
        text_content: textContent?.trim() || "",
        tag_name: tagName.toLowerCase(),
        attributes,
      };
    } catch (error) {
      return null;
    }
  }

  private async inferRole(
    handle: any,
    tagName: string,
    attributes: Record<string, string>
  ): Promise<string> {
    if (attributes.role) {
      return attributes.role;
    }

    const tag = tagName.toLowerCase();

    switch (tag) {
      case "button":
        return "button";
      case "a":
        return "link";
      case "input":
        switch (attributes.type) {
          case "text":
          case "email":
          case "password":
          case "search":
            return "textbox";
          case "checkbox":
            return "checkbox";
          case "radio":
            return "radio";
          case "submit":
            return "button";
          default:
            return "textbox";
        }
      case "select":
        return "combobox";
      case "textarea":
        return "textbox";
      default:
        return "generic";
    }
  }

  private async getElementName(
    handle: any,
    attributes: Record<string, string>,
    textContent: string | null
  ): Promise<string> {
    // Priority order for naming elements
    if (attributes["aria-label"]) {
      return attributes["aria-label"];
    }

    if (attributes["data-testid"]) {
      return attributes["data-testid"];
    }

    if (attributes.placeholder) {
      return attributes.placeholder;
    }

    if (textContent && textContent.trim()) {
      return textContent.trim();
    }

    if (attributes.name) {
      return attributes.name;
    }

    if (attributes.id) {
      return attributes.id;
    }

    // For links, try to get href
    if (attributes.href) {
      return attributes.href;
    }

    return "unnamed element";
  }

  private generateLocator(
    role: string,
    name: string,
    attributes: Record<string, string>,
    tagName: string
  ): string {
    // Generate Playwright locator based on best practices

    if (attributes["data-testid"]) {
      return `page.getByTestId('${attributes["data-testid"]}')`;;
    }

    if (attributes["aria-label"]) {
      return `page.getByLabel('${attributes["aria-label"]}')`;;
    }

    if (role === "button" && name && name !== "unnamed element") {
      return `page.getByRole('button', { name: '${name}' })`;;
    }

    if (role === "link" && name && name !== "unnamed element") {
      return `page.getByRole('link', { name: '${name}' })`;;
    }

    if (role === "textbox" && attributes.placeholder) {
      return `page.getByPlaceholder('${attributes.placeholder}')`;;
    }

    if (role === "textbox" && attributes["aria-label"]) {
      return `page.getByLabel('${attributes["aria-label"]}')`;;
    }

    if (attributes.name) {
      return `page.locator('[name="${attributes.name}"]')`;;
    }

    if (attributes.id) {
      return `page.locator('#${attributes.id}')`;;
    }

    // Fallback to generic locator
    return `page.locator('${tagName.toLowerCase()}')`;;
  }

  private generateContentLocator(
    role: string,
    text: string,
    tagName: string,
    id?: string | null,
    className?: string | null
  ): string {
    // Priority order for content locators

    // 1. Use ID if available
    if (id) {
      return `page.locator('#${id}')`;;
    }

    // 2. Use getByRole for semantic elements
    if (role === "heading" && text) {
      return `page.getByRole('heading', { name: '${text.replace(
        /'/g,
        "\\'";
      )}' })`;;
    }

    // 3. Use getByText for text content
    if (text && (role === "paragraph" || role === "text")) {
      const shortText = text.length > 20 ? text.substring(0, 20) : text;
      return `page.getByText('${shortText.replace(/'/g, "\\'")}')`;;
    }

    // 4. Use getByAltText for images
    if (role === "image" && text) {
      return `page.getByAltText('${text.replace(/'/g, "\\'")}')`;;
    }

    // 5. Use specific tag + class combination
    if (className) {
      return `page.locator('${tagName}.${className.split(" ")[0]}')`;;
    }

    // 6. Use tag with text content
    if (text && text.length < 50) {
      return `page.locator('${tagName}:has-text("${text.replace(
        /"/g,
        '\\"'
      )}")')`;;
    }

    // 7. Fallback to tag selector
    return `page.locator('${tagName}')`;;
  }

  private async getPageStructure(page: Page): Promise<string> {
    // Get a simplified structure of the page
    const structure = await page.evaluate(() => {
      const getStructure = (element: Element, depth: number = 0): string => {
        if (depth > 3) return ""; // Limit depth

        const tag = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : "";
        const classes = element.className
          ? `.${element.className.split(" ").join(".")}`
          : "";
        const text = element.textContent?.trim().substring(0, 30) || "";

        let result = `${"  ".repeat(depth)}${tag}${id}${classes}`;
        if (text && depth < 2) {
          result += ` "${text}"`;
        }
        result += "\n";

        // Only include important structural elements
        if (
          [
            "main",
            "section",
            "article",
            "nav",
            "header",
            "footer",
            "form",
            "div",
          ].includes(tag)
        ) {
          Array.from(element.children)
            .slice(0, 5)
            .forEach((child) => {
              result += getStructure(child, depth + 1);
            });
        }

        return result;
      };

      return getStructure(document.body);
    });

    return structure;
  }

  private inferActions(
    formFields: PageElement[],
    interactiveElements: PageElement[],
    contentElements: PageElement[]
  ): string[] {
    const actions: string[] = [];

    if (formFields.length > 0) {
      actions.push("fill form fields");
    }

    const submitButtons = interactiveElements.filter(
      (el) =>
        el.name_or_label.toLowerCase().includes("submit") ||
        el.name_or_label.toLowerCase().includes("sign in") ||
        el.name_or_label.toLowerCase().includes("login") ||
        el.name_or_label.toLowerCase().includes("save")
    );

    if (submitButtons.length > 0) {
      actions.push("submit form");
    }

    const links = interactiveElements.filter((el) => el.role === "link");
    if (links.length > 0) {
      actions.push("navigate via links");
    }

    const buttons = interactiveElements.filter(
      (el) =>
        el.role === "button" &&
        !submitButtons.some(
          (sb) => sb.suggested_locator === el.suggested_locator
        )
    );

    if (buttons.length > 0) {
      actions.push("interact with buttons");
    }

    // Content verification actions
    const headings = contentElements.filter((el) => el.role === "heading");
    if (headings.length > 0) {
      actions.push("verify page headings");
    }

    const paragraphs = contentElements.filter((el) => el.role === "paragraph");
    if (paragraphs.length > 0) {
      actions.push("verify text content");
    }

    const lists = contentElements.filter((el) => el.role === "list");
    if (lists.length > 0) {
      actions.push("verify list content");
    }

    const tables = contentElements.filter((el) => el.role === "table");
    if (tables.length > 0) {
      actions.push("verify table data");
    }

    const images = contentElements.filter((el) => el.role === "image");
    if (images.length > 0) {
      actions.push("verify images");
    }

    return actions;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
