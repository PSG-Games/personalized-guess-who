/**
 * Type definitions for the card assembly and game card pipeline
 */

/**
 * Text block extracted from OCR
 * Represents a single line or paragraph of text with confidence and position
 */
export interface TextBlock {
  text: string;
  confidence: number; // 0-100 scale
  boundingBox: {
    x: number; // left edge in pixels
    y: number; // top edge in pixels
    width: number; // width in pixels
    height: number; // height in pixels
  };
}

/**
 * Face detected in the image
 * Represents a single detected face with confidence and position
 */
export interface Face {
  id: string;
  confidence: number; // 0-1 scale
  boundingBox: {
    x: number; // left edge in pixels
    y: number; // top edge in pixels
    width: number; // width in pixels
    height: number; // height in pixels
  };
}

/**
 * Draft card created by pairing a face with text (name)
 * Ready for user review and correction in the next step
 */
export interface DraftCard {
  faceId: string;
  face: Face;
  matchedName: string | null;
  matchedTextIndex: number | null; // index of the text block that was paired
  confidence: number; // 0-1 scale: how confident is this pairing?
  pairingReason: 'proximity' | 'orphan'; // 'proximity' if paired via distance, 'orphan' if no nearby text
  traits?: string[]; // custom inside-joke traits added by the user during review
}

/**
 * Final card after user edits and trait entry (Task 7)
 * Represents a complete game card with all information
 */
export interface Character {
  id: string;
  faceId: string;
  face: Face;
  name: string;
  traits?: string[]; // custom inside-joke traits
  imageUrl: string; // reference to the original image
}
