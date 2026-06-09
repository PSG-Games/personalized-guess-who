import { useState, useEffect } from 'react';
import { performOCR, type TextBlock } from '../../lib/ocr';
import { detectFaces, type Face } from '../../lib/faceDetection';
import { assembleDraftCards, type DraftCard } from '../../lib/cardAssembly';
import ExtractionReview from './ExtractionReview';
import './ocr-results.css';

export interface OCRResultsProps {
  imageDataUrl: string;
  filename: string;
  onReviewComplete?: (cards: DraftCard[]) => void;
}

export default function OCRResults({ imageDataUrl, filename, onReviewComplete }: OCRResultsProps) {
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [draftCards, setDraftCards] = useState<DraftCard[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runDetection = async () => {
      setIsProcessing(true);
      setError(null);

      try {
        // Run OCR and face detection in parallel
        const [ocrResults, faceResults] = await Promise.all([
          performOCR(imageDataUrl),
          detectFaces(imageDataUrl),
        ]);

        setTextBlocks(ocrResults);
        setFaces(faceResults);

        // Assemble draft cards from the results
        const cards = assembleDraftCards(ocrResults, faceResults);
        setDraftCards(cards);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
        setError(errorMessage);
        setTextBlocks([]);
        setFaces([]);
        setDraftCards([]);
      } finally {
        setIsProcessing(false);
      }
    };

    runDetection();
  }, [imageDataUrl]);

  return (
    <section className="ocr-results" aria-label="Detection and pairing results">
      <h3 className="ocr-results-title">Processing Results</h3>

      {isProcessing && (
        <div className="ocr-processing" role="status" aria-live="polite">
          <div className="ocr-spinner"></div>
          <p>Detecting faces and extracting text...</p>
        </div>
      )}

      {error && !isProcessing && (
        <div className="ocr-error" role="alert">
          <p className="ocr-error-message">{error}</p>
          <p className="ocr-error-hint">
            Try uploading a clearer image or a different file format.
          </p>
        </div>
      )}

      {!isProcessing && !error && faces.length === 0 && textBlocks.length === 0 && (
        <div className="ocr-no-text" role="status">
          <p>No faces or text found in the image.</p>
        </div>
      )}

      {!isProcessing && !error && (faces.length > 0 || textBlocks.length > 0) && (
        <div className="ocr-results-container">
          <div className="ocr-image-container">
            <figure className="ocr-figure">
              <img src={imageDataUrl} alt={`Detection image: ${filename}`} className="ocr-image" />
              <figcaption>Image with detected faces and extracted text</figcaption>
            </figure>
          </div>

          <div className="detection-summary">
            <h4>Detection Summary</h4>
            <ul className="summary-list">
              <li>
                <strong>Faces detected:</strong> {faces.length}
              </li>
              <li>
                <strong>Text blocks extracted:</strong> {textBlocks.length}
              </li>
              <li>
                <strong>Draft cards created:</strong> {draftCards.length}
              </li>
              <li>
                <strong>Paired:</strong>{' '}
                {draftCards.filter((c) => c.matchedName).length}
              </li>
              <li>
                <strong>Unpaired (orphans):</strong>{' '}
                {draftCards.filter((c) => !c.matchedName).length}
              </li>
            </ul>
          </div>

          {draftCards.length > 0 && (
            <ExtractionReview
              draftCards={draftCards}
              onCardsApproved={onReviewComplete || (() => {})}
            />
          )}

          <details className="detailed-results" open>
            <summary>Detailed Results</summary>

            {textBlocks.length > 0 && (
              <div className="ocr-text-list">
                <h5>Extracted Text Blocks ({textBlocks.length})</h5>
                <ul className="ocr-blocks">
                  {textBlocks.map((block, index) => (
                    <li key={index} className="ocr-block">
                      <div className="ocr-block-content">
                        <p className="ocr-block-text">{block.text}</p>
                        <p className="ocr-block-confidence">
                          Confidence: <span className="ocr-confidence-value">{block.confidence}%</span>
                        </p>
                      </div>
                      <details className="ocr-block-details">
                        <summary>Position Details</summary>
                        <dl className="ocr-bbox-info">
                          <dt>X:</dt>
                          <dd>{block.boundingBox.x.toFixed(1)}</dd>
                          <dt>Y:</dt>
                          <dd>{block.boundingBox.y.toFixed(1)}</dd>
                          <dt>Width:</dt>
                          <dd>{block.boundingBox.width.toFixed(1)}</dd>
                          <dt>Height:</dt>
                          <dd>{block.boundingBox.height.toFixed(1)}</dd>
                        </dl>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {faces.length > 0 && (
              <div className="faces-list">
                <h5>Detected Faces ({faces.length})</h5>
                <ul className="face-items">
                  {faces.map((face, index) => (
                    <li key={index} className="face-item">
                      <p className="face-info">
                        <strong>Face {index + 1}:</strong> Confidence{' '}
                        {Math.round(face.confidence * 100)}%
                      </p>
                      <details className="face-details">
                        <summary>Position Details</summary>
                        <dl className="bbox-info">
                          <dt>X:</dt>
                          <dd>{face.boundingBox.x.toFixed(1)}</dd>
                          <dt>Y:</dt>
                          <dd>{face.boundingBox.y.toFixed(1)}</dd>
                          <dt>Width:</dt>
                          <dd>{face.boundingBox.width.toFixed(1)}</dd>
                          <dt>Height:</dt>
                          <dd>{face.boundingBox.height.toFixed(1)}</dd>
                        </dl>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </details>
        </div>
      )}
    </section>
  );
}
