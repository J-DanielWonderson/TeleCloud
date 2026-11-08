declare module 'mammoth' {
  export interface ConversionResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ConversionResult>;
}
