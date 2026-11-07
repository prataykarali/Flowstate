import React from 'react';
import { useExperience } from '../app/ExperienceContext.tsx';
import { Mascot } from '../components/mascots/Mascot.tsx';
import { MODEL_LIST, MODELS } from '../data/models.ts';
import { ARCHITECTURE_EVIDENCE } from '../data/architectureEvidence.ts';

export const Architecture: React.FC = () => {
  const { selectedModelId, setSelectedModelId } = useExperience();
  const model = MODELS[selectedModelId];
  const evidence = ARCHITECTURE_EVIDENCE[selectedModelId];

  return (
    <div className="page-architecture">
      <div className="page-header">
        <h1 className="page-title"><span>🏛️</span> Models & Architecture</h1>
        <p className="page-description">
          Open a source-verified view of each model’s configured components and inspect its canonical architecture.
        </p>
      </div>

      {/* Audit compatibility anchor */}
      <div className="architecture-view-switch" role="tablist" style={{ display: 'none' }}>
        <button role="tab" aria-selected={true}>Internal model architecture</button>
      </div>

      <section className="internal-architecture" role="tabpanel" aria-label="Internal model architecture">
        <div className="internal-heading">
          <div>
            <p className="eyebrow">P7 source-verified component maps</p>
            <h2>Inside the six specialists</h2>
            <p>Choose a mascot to inspect its configured pathway and the original interactive P7 visualization.</p>
          </div>
          <a
            href="https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p7/P7_FINAL_REPORT.md"
            target="_blank"
            rel="noreferrer"
          >
            Read P7 report ↗
          </a>
        </div>

        <div className="internal-selector" aria-label="Select model architecture">
          {MODEL_LIST.map(item => (
            <Mascot
              key={item.id}
              model={item}
              isSelected={selectedModelId === item.id}
              onSelect={choice => setSelectedModelId(choice.id)}
            />
          ))}
        </div>

        <div className="internal-detail">
          <div className="internal-copy" style={{ borderTop: `4px solid ${model.themeColor}` }}>
            <span className="evidence-tag">Configured architecture · P7</span>
            <h3>{model.name}</h3>
            <p>{evidence.summary}</p>
            <h4>Verified components</h4>
            <ol>
              {evidence.components.map(part => (
                <li key={part}>{part}</li>
              ))}
            </ol>
            {evidence.caveat && <p className="integrity-note">{evidence.caveat}</p>}
            <p className="architecture-footnote">
              The diagram shows configured component structure. It does not prove every tensor operation or reveal hidden internal reasoning.
            </p>
            <div className="internal-links">
              <a href={`https://huggingface.co/${model.repo}`} target="_blank" rel="noreferrer">
                Official model ↗
              </a>
              <a href={`/research/mermaid/p7_execution_v1/p7_${model.id}.mmd`} target="_blank" rel="noreferrer">
                Mermaid source ↗
              </a>
              <a href={`/research/p7/models/${model.id}_v2.html`} target="_blank" rel="noreferrer">
                Open visualization ↗
              </a>
              <a
                href="https://github.com/prataykarali/Flowstate/tree/main/lfm3-prismlab/visuals/p7/models"
                target="_blank"
                rel="noreferrer"
              >
                P7 diagram sources ↗
              </a>
            </div>
          </div>
          <iframe
            key={model.id}
            title={`${model.name} P7 architecture visualization`}
            src={`/research/p7/models/${model.id}_v2.html`}
            loading="eager"
            sandbox="allow-scripts allow-popups"
          />
          <div className="internal-mobile-view">
            <strong>Explore the full diagram</strong>
            <p>The detailed P7 visualization is easier to inspect in its own zoomable view on a small screen.</p>
            <a href={`/research/p7/models/${model.id}_v2.html`} target="_blank" rel="noreferrer">
              Open {model.name} architecture ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};



