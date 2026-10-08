"use client";

import { useRef, useState, useEffect } from 'react';
import { Button, Modal, Spinner } from 'react-bootstrap';
import { Trash, CheckCircle } from 'react-bootstrap-icons';

interface SignaturePadProps {
  show: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => Promise<void> | void;
  agreementId?: string | number;
}

export default function SignaturePad({ show, onClose, onSave }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasValidSignature, setHasValidSignature] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = ctx;
  };

  useEffect(() => {
    if (!show) return;
    setHasValidSignature(false);
    isDrawingRef.current = false;
    lastPoint.current = null;
    ctxRef.current = null;

    // Poll until modal is fully visible and canvas has real dimensions
    let attempts = 0;
    const poll = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas && canvas.getBoundingClientRect().width > 0) {
        clearInterval(poll);
        initCanvas();
      }
      if (++attempts > 40) clearInterval(poll);
    }, 50);

    return () => clearInterval(poll);
  }, [show]);

  // Get coords relative to canvas — works on both mouse and touch
  const getCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // scaleX/Y handles any CSS scaling (canvas internal px vs display px)
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startStroke = (clientX: number, clientY: number) => {
    if (saving) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = getCoords(clientX, clientY);
    isDrawingRef.current = true;
    lastPoint.current = { x, y };
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw a dot so single taps are visible
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasValidSignature(true);
  };

  const continueStroke = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || saving) return;
    const ctx = ctxRef.current;
    if (!ctx || !lastPoint.current) return;
    const { x, y } = getCoords(clientX, clientY);
    const prev = lastPoint.current;
    // Quadratic bezier midpoint smoothing
    const midX = (prev.x + x) / 2;
    const midY = (prev.y + y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    lastPoint.current = { x, y };
  };

  const endStroke = (clientX?: number, clientY?: number) => {
    if (!isDrawingRef.current) return;
    const ctx = ctxRef.current;
    if (ctx && clientX !== undefined && clientY !== undefined && lastPoint.current) {
      const { x, y } = getCoords(clientX, clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx?.closePath();
    isDrawingRef.current = false;
    lastPoint.current = null;
  };

  // ── Mouse ──
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    startStroke(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    continueStroke(e.clientX, e.clientY);
  };
  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    endStroke(e.clientX, e.clientY);
  };
  const onMouseLeave = () => endStroke();

  // ── Touch ──
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    startStroke(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    continueStroke(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    endStroke(t.clientX, t.clientY);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || saving) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasValidSignature(false);
  };

  const handleSave = async () => {
    if (saving || !canvasRef.current || !hasValidSignature) return;
    try {
      setSaving(true);
      await onSave(canvasRef.current.toDataURL('image/png'));
    } catch {
      alert('Failed to save signature. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveButtonEnabled = hasValidSignature && !saving;

  return (
    <Modal
      show={show}
      onHide={() => { if (!saving) onClose(); }}
      size="lg"
      fullscreen={isMobile ? true : undefined}
      centered={!isMobile}
      backdrop={saving ? 'static' : true}
      keyboard={!saving}
    >
      <Modal.Header closeButton={!saving} className={isMobile ? 'border-0' : ''}>
        <Modal.Title className={isMobile ? 'fs-5' : ''}>
          Sign Agreement
          {saving && <small className="ms-2 text-muted">(Saving...)</small>}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={isMobile ? 'p-0' : ''} style={{ overflow: 'hidden' }}>
        <div className={isMobile ? 'p-3' : 'text-center mb-3'}>
          <h5 className={isMobile ? 'fs-6' : ''}>
            {saving ? 'Saving your signature...' : 'Please sign below'}
          </h5>
          <p className="text-muted small mb-0">
            {isMobile ? 'Use your finger to sign' : 'Click and drag to draw your signature'}
            {!hasValidSignature && ' (Draw to enable Save)'}
          </p>
        </div>

        <div
          className={isMobile ? '' : 'border border-2 rounded mx-3'}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width: '100%',
              height: isMobile ? 'calc(100vh - 280px)' : '300px',
              backgroundColor: '#fff',
              cursor: saving ? 'not-allowed' : 'crosshair',
              touchAction: 'none',
              display: 'block',
              border: isMobile ? '1px solid #ddd' : 'none',
              borderRadius: '4px',
            }}
          />
        </div>

        <div className={
          isMobile
            ? 'position-fixed bottom-0 start-0 end-0 p-3 bg-white shadow-lg'
            : 'p-3'
        }>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={clearCanvas}
              disabled={saving}
              className={isMobile ? 'flex-grow-1' : ''}
            >
              <Trash size={16} className="me-1" />
              Clear
            </Button>

            {isMobile && hasValidSignature && !saving && (
              <div className="text-center small text-muted">Signature ready</div>
            )}

            <Button
              variant={saveButtonEnabled ? 'success' : 'secondary'}
              onClick={handleSave}
              disabled={!saveButtonEnabled}
              size={isMobile ? 'sm' : undefined}
              className={isMobile ? 'flex-grow-1' : ''}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2"
                    style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="me-1" />
                  {isMobile ? 'Save' : 'Save Signature'}
                </>
              )}
            </Button>
          </div>

          {!isMobile && (
            <small className="text-muted d-block mt-2">
              {saving
                ? 'Please wait while we save your signature...'
                : !hasValidSignature
                ? 'Draw your signature to enable Save button'
                : 'Signature ready — click Save Signature'}
            </small>
          )}
        </div>
      </Modal.Body>

      {!isMobile && !saving && (
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}
