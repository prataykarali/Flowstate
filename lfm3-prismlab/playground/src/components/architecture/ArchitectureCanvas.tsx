import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  type ArchitectureModelDefinition,
  type ArchitectureComponentNode,
  type ArchitectureLayerItem
} from '../../data/architecture/index.ts';

interface ArchitectureCanvasProps {
  model: ArchitectureModelDefinition;
  selectedNodeId: string | null;
  onSelectNode: (node: ArchitectureComponentNode) => void;
  onSelectLayer: (layer: ArchitectureLayerItem) => void;
  modalityFilter: string;
  isPlayingTrace: boolean;
  zoomScale: number;
  panOffset: { x: number; y: number };
  onUpdateTransform: (scale: number, offset: { x: number; y: number }) => void;
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  model,
  selectedNodeId,
  onSelectNode,
  onSelectLayer,
  modalityFilter,
  isPlayingTrace,
  zoomScale,
  panOffset,
  onUpdateTransform
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ViewBox dimensions
  const vbWidth = 1180;
  const vbHeight = 980;

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background, not interactive elements
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('canvas-bg-target')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    // Bound pan
    const boundX = Math.max(-500, Math.min(500, newX));
    const boundY = Math.max(-400, Math.min(400, newY));
    onUpdateTransform(zoomScale, { x: boundX, y: boundY });
  }, [isDragging, dragStart, zoomScale, onUpdateTransform]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.55, Math.min(2.4, zoomScale + delta));
    onUpdateTransform(newScale, panOffset);
  };

  // Filter matching
  const nodeMatchesFilter = (node: ArchitectureComponentNode) => {
    if (modalityFilter === 'all') return true;
    if (node.role === modalityFilter || node.role === 'shared' || node.role === 'output') return true;
    if (modalityFilter === 'decision' && node.role === 'decision') return true;
    return false;
  };

  const edgeMatchesFilter = (edge: { role: string; from: string; to: string }) => {
    if (modalityFilter === 'all') return true;
    const fromNode = model.components.find(c => c.id === edge.from);
    const toNode = model.components.find(c => c.id === edge.to);
    if (!fromNode || !toNode) return false;
    return nodeMatchesFilter(fromNode) && nodeMatchesFilter(toNode);
  };

  // Toggle group expansion
  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroupId(prev => (prev === groupId ? null : groupId));
  };

  return (
    <div
      ref={containerRef}
      className={`arch-canvas-viewport ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      role="region"
      aria-label={`${model.name} Interactive Architecture Diagram`}
    >
      {/* Canvas Watermark / Provenance Notice */}
      <div className="canvas-watermark">
        <span className="watermark-pill">P7 Confirmed Structural Blueprint</span>
        <span className="watermark-sub">Hover or click nodes to inspect verified configuration &amp; tensors</span>
      </div>

      <div
        className="arch-canvas-transform-layer canvas-bg-target"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
      >
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          className="arch-svg-root"
          role="img"
          aria-label={`${model.name} Neural Architecture Diagram`}
        >
          <defs>
            {/* Ambient Gradients */}
            <radialGradient id="archBgGrad" cx="50%" cy="10%" r="85%">
              <stop offset="0%" stopColor="#141a38" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#0b0e22" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#060816" stopOpacity="0.15" />
            </radialGradient>

            <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#75efdc" floodOpacity="0.3" />
            </filter>
            <filter id="decisionGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#c084fc" floodOpacity="0.35" />
            </filter>
            <filter id="activeNodeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ffe182" floodOpacity="0.5" />
            </filter>
            <filter id="flowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#52efd0" floodOpacity="0.6" />
            </filter>

            {/* Grid Pattern */}
            <pattern id="archGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#75efdc" opacity="0.08" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width={vbWidth} height={vbHeight} fill="url(#archBgGrad)" className="canvas-bg-target" />
          <rect width={vbWidth} height={vbHeight} fill="url(#archGrid)" className="canvas-bg-target" />

          {/* Connectors (Edges) */}
          <g className="arch-edges-layer">
            {model.edges.map(edge => {
              const fromNode = model.components.find(c => c.id === edge.from);
              const toNode = model.components.find(c => c.id === edge.to);
              if (!fromNode || !toNode) return null;

              const isVisible = edgeMatchesFilter(edge);
              const isSelectedPath =
                selectedNodeId === edge.from || selectedNodeId === edge.to;

              // Cubic bezier curve path
              const dx = toNode.x - fromNode.x;
              const dy = toNode.y - fromNode.y;
              const cx1 = fromNode.x + dx * 0.15;
              const cy1 = fromNode.y + dy * 0.55;
              const cx2 = toNode.x - dx * 0.15;
              const cy2 = toNode.y - dy * 0.55;
              const pathD = `M ${fromNode.x} ${fromNode.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toNode.x} ${toNode.y}`;

              const edgeColor =
                edge.role === 'vision'
                  ? '#52efd0'
                  : edge.role === 'audio'
                  ? '#57d6ee'
                  : edge.role === 'decision'
                  ? '#d6a0ff'
                  : edge.role === 'output'
                  ? '#ffd766'
                  : '#67baff';

              return (
                <g key={edge.id} className={`edge-group ${isVisible ? '' : 'is-dimmed'}`}>
                  {/* Outer glow stroke for active edge */}
                  {isSelectedPath && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#ffe182"
                      strokeWidth="5"
                      opacity="0.4"
                    />
                  )}

                  {/* Main path */}
                  <path
                    id={`edge-${model.id}-${edge.id}`}
                    d={pathD}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={isSelectedPath ? '3' : '2'}
                    strokeDasharray={edge.style === 'dashed' ? '5 6' : undefined}
                    opacity={isVisible ? (isSelectedPath ? 0.95 : 0.65) : 0.12}
                    className="arch-edge-path"
                  />

                  {/* Edge note or uncertainty marker */}
                  {edge.note && (
                    <text
                      x={(fromNode.x + toNode.x) / 2 + 12}
                      y={(fromNode.y + toNode.y) / 2}
                      fill="#ffd766"
                      fontSize="9.5"
                      fontFamily="monospace"
                      opacity={isVisible ? 0.9 : 0.1}
                    >
                      {edge.note}
                    </text>
                  )}

                  {/* Flowing conceptual particle along edge */}
                  {isPlayingTrace && !reducedMotion && isVisible && (
                    <circle r="4" fill={edgeColor} filter="url(#flowGlow)">
                      <animateMotion
                        dur={edge.role === 'vision' ? '2.4s' : edge.role === 'audio' ? '2.8s' : '2.0s'}
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* Component Nodes */}
          <g className="arch-nodes-layer">
            {model.components.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isVisible = nodeMatchesFilter(node);
              const isExpanded = expandedGroupId === node.id;

              // Dimensions
              const width = node.isExpandable && isExpanded ? 340 : 260;
              const baseHeight = node.isExpandable && isExpanded ? 240 : 86;
              const nodeX = node.x - width / 2;
              const nodeY = node.y - baseHeight / 2;

              const roleColor =
                node.role === 'vision'
                  ? '#52efd0'
                  : node.role === 'audio'
                  ? '#57d6ee'
                  : node.role === 'decision'
                  ? '#d6a0ff'
                  : node.role === 'output'
                  ? '#ffd766'
                  : '#67baff';

              return (
                <g
                  key={node.id}
                  transform={`translate(${nodeX}, ${nodeY})`}
                  className={`arch-node-group ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''} ${isVisible ? '' : 'is-dimmed'}`}
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelectNode(node)}
                  aria-label={`${node.title} (${node.provenance})`}
                >
                  {/* Card base box */}
                  <rect
                    width={width}
                    height={baseHeight}
                    rx="16"
                    className="arch-node-box"
                    fill={node.isUncertain ? 'rgba(38, 20, 50, 0.85)' : 'rgba(16, 24, 48, 0.85)'}
                    stroke={isSelected ? '#ffe182' : isHovered ? roleColor : 'rgba(255, 255, 255, 0.16)'}
                    strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1.2'}
                    strokeDasharray={node.isUncertain ? '4 4' : undefined}
                    filter={isSelected ? 'url(#activeNodeGlow)' : node.role === 'decision' ? 'url(#decisionGlow)' : 'url(#nodeGlow)'}
                  />

                  {/* Left accent bar */}
                  <rect
                    x="0"
                    y="0"
                    width="6"
                    height={baseHeight}
                    rx="3"
                    fill={roleColor}
                  />

                  {/* Node Header */}
                  <g transform="translate(16, 24)">
                    {/* Role Pill */}
                    <rect
                      x="0"
                      y="-12"
                      width={node.role.length * 7 + 16}
                      height="16"
                      rx="4"
                      fill={roleColor}
                      opacity="0.2"
                    />
                    <text
                      x="8"
                      y="0"
                      fill={roleColor}
                      fontSize="9"
                      fontWeight="800"
                      letterSpacing="0.05em"
                    >
                      {node.role.toUpperCase()}
                    </text>

                    {/* Uncertainty tag */}
                    {node.isUncertain && (
                      <g transform={`translate(${node.role.length * 7 + 24}, -12)`}>
                        <rect width="84" height="16" rx="4" fill="rgba(248, 113, 113, 0.25)" stroke="#f87171" strokeWidth="0.8" />
                        <text x="5" y="11" fill="#fca5a5" fontSize="8" fontWeight="800">
                          UNDER AUDIT
                        </text>
                      </g>
                    )}

                    {/* Node Title */}
                    <text
                      x="0"
                      y="22"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="750"
                      className="node-title-svg"
                    >
                      {node.title.length > 28 ? node.title.slice(0, 26) + '…' : node.title}
                    </text>

                    {/* Subtitle / Tensor Shape */}
                    <text
                      x="0"
                      y="40"
                      fill="#b8c9e4"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {node.tensorShape || node.configKey || 'Configured Node'}
                    </text>
                  </g>

                  {/* Expand/Collapse Button for Multilayer Components */}
                  {node.isExpandable && (
                    <g
                      transform={`translate(${width - 34}, 14)`}
                      onClick={e => toggleGroupExpand(node.id, e)}
                      className="expand-group-btn"
                      cursor="pointer"
                    >
                      <circle cx="10" cy="10" r="12" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" />
                      <text x="6" y="14" fill="#ffffff" fontSize="12" fontWeight="800">
                        {isExpanded ? '▲' : '▼'}
                      </text>
                    </g>
                  )}

                  {/* Expanded Sub-layers View */}
                  {node.isExpandable && isExpanded && node.layers && (
                    <g transform="translate(16, 85)">
                      <line x1="0" y1="0" x2={width - 32} y2="0" stroke="rgba(255, 255, 255, 0.1)" />
                      <text x="0" y="16" fill="#75efdc" fontSize="10" fontWeight="800">
                        Configured Layer Topology ({node.layers.length} Layers)
                      </text>

                      {/* Mini layers grid */}
                      <g transform="translate(0, 24)">
                        {node.layers.slice(0, 24).map((l, i) => {
                          const col = i % 8;
                          const row = Math.floor(i / 8);
                          const lx = col * 38;
                          const ly = row * 34;

                          return (
                            <g
                              key={l.index}
                              transform={`translate(${lx}, ${ly})`}
                              onClick={e => {
                                e.stopPropagation();
                                onSelectLayer(l);
                              }}
                              cursor="pointer"
                              className="mini-layer-cell"
                            >
                              <rect
                                width="34"
                                height="28"
                                rx="5"
                                fill="rgba(0, 0, 0, 0.4)"
                                stroke={l.color}
                                strokeWidth="1"
                              />
                              <text x="17" y="18" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="750">
                                L{l.index}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Canvas Navigation Hint */}
      <div className="canvas-footer-hints">
        <span className="hint-item">🖱️ Drag to pan</span>
        <span className="hint-divider">·</span>
        <span className="hint-item">🔍 Scroll / Pinch to zoom</span>
        <span className="hint-divider">·</span>
        <span className="hint-item">✨ Click any node to inspect parameters</span>
      </div>
    </div>
  );
};
