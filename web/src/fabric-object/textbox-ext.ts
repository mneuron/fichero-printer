import * as fabric from "fabric";

interface UniqueTextboxExtProps {
  fontAutoSize: boolean;
  textOrientation: TextOrientation;
  sourceText: string;
}

export type TextOrientation = "horizontal" | "stacked";

const TEXTBOX_PROPS: Array<keyof UniqueTextboxExtProps> = ["fontAutoSize", "textOrientation", "sourceText"];

export const textboxExtDefaultValues: Partial<fabric.TClassProperties<TextboxExt>> = {
  fontAutoSize: false,
  textOrientation: "horizontal",
  sourceText: "",
};

export interface TextboxExtProps extends fabric.TextboxProps, UniqueTextboxExtProps {}
export interface SerializedTextboxExtProps extends fabric.SerializedTextboxProps, UniqueTextboxExtProps {}

export class TextboxExt<
    Props extends fabric.TOptions<TextboxExtProps> = Partial<TextboxExtProps>,
    SProps extends SerializedTextboxExtProps = SerializedTextboxExtProps,
    EventSpec extends fabric.ITextEvents = fabric.ITextEvents,
  >
  extends fabric.Textbox<Props, SProps, EventSpec>
  implements UniqueTextboxExtProps
{
  declare fontAutoSize: boolean;
  declare textOrientation: TextOrientation;
  declare sourceText: string;

  private widthBeforeEditing?: number;

  constructor(text: string, options?: Props) {
    super(text, options);
    Object.assign(this, textboxExtDefaultValues);
    this.setOptions(options);
    this.sourceText = options?.sourceText ?? text;
    this.applyTextOrientation();

    this.setControlsVisibility({
      mb: false,
      mt: false,
    });
  }

  private stackText(text: string): string {
    return text
      .split("\n")
      .map((line) => Array.from(line).join("\n"))
      .join("\n");
  }

  private applyTextOrientation(): void {
    const displayText = this.textOrientation === "stacked" ? this.stackText(this.sourceText) : this.sourceText;
    super.set("text", displayText);
  }

  getSourceText(): string {
    return this.sourceText ?? this.text ?? "";
  }

  setTextContent(text: string): void {
    this.sourceText = text;
    this.applyTextOrientation();
  }

  setTextOrientation(orientation: TextOrientation): void {
    if (this.textOrientation === orientation) return;
    this.sourceText = this.getSourceText();
    this.textOrientation = orientation;
    this.applyTextOrientation();
  }

  /** Set text and reduce fontSize until text fits to the given width */
  setAndShrinkText(text: string, maxWidth: number, maxLines?: number) {
    this.setTextContent(text);
    const linesLimit = maxLines ?? this._splitTextIntoLines(this.text).lines.length;

    let linesCount = this._splitTextIntoLines(this.text).lines.length;

    while ((linesCount > linesLimit || this.width > maxWidth) && this.fontSize > 2) {
      this.fontSize -= 1;
      this.set({ width: maxWidth });
      linesCount = this._splitTextIntoLines(this.text).lines.length;
    }
  }

  /** Reduce fontSize until text fits to the given width */
  shrinkText(maxWidth: number, maxLines: number) {
    let linesCount = this._splitTextIntoLines(this.text).lines.length;

    while ((linesCount > maxLines || this.width > maxWidth) && this.fontSize > 2) {
      this.fontSize -= 1;
      this.set({ width: maxWidth });
      linesCount = this._splitTextIntoLines(this.text).lines.length;
    }
  }

  override enterEditingImpl() {
    if (this.textOrientation === "stacked") {
      super.set("text", this.sourceText);
    }
    super.enterEditingImpl();
    this.widthBeforeEditing = this.width;
  }

  override exitEditingImpl() {
    this.sourceText = this.text;
    super.exitEditingImpl();
    this.applyTextOrientation();
    this.widthBeforeEditing = undefined;
  }

  override updateFromTextArea(): void {
    super.updateFromTextArea();
    this.sourceText = this.text;

    if (this.widthBeforeEditing !== undefined && this.fontAutoSize) {
      const lines = this.text.split("\n").length;
      this.shrinkText(this.widthBeforeEditing, lines);
    }
  }

  override toObject<T extends Omit<Props & fabric.TClassProperties<this>, keyof SProps>, K extends keyof T = never>(
    propertiesToInclude: K[] = [],
  ): Pick<T, K> & SProps {
    return super.toObject([...propertiesToInclude, ...TEXTBOX_PROPS] as (keyof T)[]);
  }
}
