import React, { useRef } from 'react';
import type { LiveTask } from '../../lib/api.ts';
import type { ModelMeta } from '../../data/models.ts';
import {
  IconChat,
  IconImage,
  IconAudio,
  IconSummarize,
  IconDecision,
  IconSend,
  IconStop,
  IconClose,
  IconWarning
} from './Icons.tsx';

interface PlaygroundComposerProps {
  prompt: string;
  onChangePrompt: (value: string) => void;
  task: LiveTask;
  onChangeTask: (task: LiveTask) => void;
  image: File | null;
  onChangeImage: (file: File | null) => void;
  audio: File | null;
  onChangeAudio: (file: File | null) => void;
  imagePreviewUrl: string | null;
  onSend: () => void;
  onStop?: () => void;
  isGenerating: boolean;
  activeModel: ModelMeta;
  routingMode: 'auto' | 'manual';
  promptSuggestions: string[];
  onSelectPromptPreset: (prompt: string, task?: LiveTask) => void;
  disabled?: boolean;
}

const TASK_SHORTCUTS: { id: LiveTask; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: 'chat', label: 'Chat', icon: IconChat },
  { id: 'ocr', label: 'Analyze Image', icon: IconImage },
  { id: 'transcribe', label: 'Understand Audio', icon: IconAudio },
  { id: 'summarize', label: 'Summarize', icon: IconSummarize },
  { id: 'decision', label: 'Make Decision', icon: IconDecision }
];

export const PlaygroundComposer: React.FC<PlaygroundComposerProps> = ({
  prompt,
  onChangePrompt,
  task,
  onChangeTask,
  image,
  onChangeImage,
  audio,
  onChangeAudio,
  imagePreviewUrl,
  onSend,
  onStop,
  isGenerating,
  activeModel,
  routingMode,
  promptSuggestions,
  onSelectPromptPreset,
  disabled = false
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && !disabled && (prompt.trim() || image || audio)) {
        onSend();
      }
    }
  };

  const modelSupportsImage = activeModel.inputModalities.includes('image') || activeModel.inputModalities.includes('video');
  const modelSupportsAudio = activeModel.inputModalities.includes('audio');

  const showImageWarning = routingMode === 'manual' && image && !modelSupportsImage;
  const showAudioWarning = routingMode === 'manual' && audio && !modelSupportsAudio;
  const availableTasks = routingMode === 'auto' ? TASK_SHORTCUTS : TASK_SHORTCUTS.filter(shortcut => {
    if (activeModel.outputModalities.includes('decision')) return shortcut.id === 'decision';
    if (shortcut.id === 'decision') return false;
    if (shortcut.id === 'ocr') return modelSupportsImage;
    if (shortcut.id === 'transcribe') return modelSupportsAudio;
    return true;
  });

  return (
    <footer className="play-composer-card" aria-label="Playground message composer">
      <div className="composer-heading">
        <span>01 / INPUT CONSOLE</span>
        <h2>Shape an Inference Request</h2>
        <p>Choose a task, add your question, then run a recorded example or a local model.</p>
      </div>
      {/* Task Shortcut Pills Row */}
      <div className="composer-tasks-bar" role="radiogroup" aria-label="Task paradigm shortcuts">
        <span className="tasks-label">Select task</span>
        <div className="tasks-pills-row">
          {availableTasks.map(t => {
            const Icon = t.icon;
            const isSelected = task === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`task-shortcut-pill ${isSelected ? 'is-active' : ''}`}
                onClick={() => onChangeTask(t.id)}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="composer-preset-section">
        <div className="composer-section-heading"><span>Prompt inspiration for {activeModel.name}</span><button type="button" onClick={() => onSelectPromptPreset(promptSuggestions[0], task)}>Reset default</button></div>
        <div className="composer-preset-list">{promptSuggestions.map(suggestion => <button type="button" key={suggestion} className={prompt === suggestion ? 'is-active' : ''} onClick={() => onSelectPromptPreset(suggestion, task)}>{suggestion}</button>)}</div>
      </div>

      {/* Attachment Previews & Warning Advisories (if any) */}
      {(image || audio) && (
        <div className="composer-attachments-bar">
          {image && (
            <div className={`attachment-chip ${showImageWarning ? 'is-warning' : ''}`}>
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Upload thumbnail" className="attachment-chip-thumb" />
              ) : (
                <IconImage size={15} />
              )}
              <span className="attachment-chip-name">{image.name}</span>
              <span className="attachment-chip-size">{(image.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                className="btn-attachment-remove"
                onClick={() => onChangeImage(null)}
                title="Remove image"
                aria-label="Remove image"
              >
                <IconClose size={12} />
              </button>
            </div>
          )}

          {audio && (
            <div className={`attachment-chip ${showAudioWarning ? 'is-warning' : ''}`}>
              <IconAudio size={15} />
              <span className="attachment-chip-name">{audio.name}</span>
              <span className="attachment-chip-size">{(audio.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                className="btn-attachment-remove"
                onClick={() => onChangeAudio(null)}
                title="Remove audio"
                aria-label="Remove audio"
              >
                <IconClose size={12} />
              </button>
            </div>
          )}

          {/* Compatibility warnings in Manual Mode */}
          {(showImageWarning || showAudioWarning) && (
            <div className="composer-compatibility-advisory">
              <IconWarning size={14} />
              <span>
                {showImageWarning && showAudioWarning
                  ? `${activeModel.characterName} does not support image or audio attachments. Switch to Omni Pup or enable Smart Auto.`
                  : showImageWarning
                  ? `${activeModel.characterName} does not support image input. Switch to Spectra / Omni Pup or enable Smart Auto.`
                  : `${activeModel.characterName} does not support audio input. Switch to Echo / Omni Pup or enable Smart Auto.`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Primary Input & Actions Bar */}
      <div className="composer-section-heading composer-prompt-heading"><label htmlFor="playground-prompt">Prompt specification</label><span>{prompt.length} / 1,000</span></div>
      <div className="composer-input-row">
        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="visually-hidden"
          onChange={e => {
            const f = e.target.files?.[0] || null;
            onChangeImage(f);
            if (f && task === 'chat') onChangeTask('ocr');
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/wav,audio/x-wav,.wav"
          className="visually-hidden"
          onChange={e => {
            const f = e.target.files?.[0] || null;
            onChangeAudio(f);
            if (f && task === 'chat') onChangeTask('transcribe');
          }}
        />

        {/* Media Attach Buttons */}
        <div className="composer-media-actions">
          <button
            type="button"
            className={`btn-media-attach ${image ? 'has-file' : ''}`}
            disabled={routingMode === 'manual' && !modelSupportsImage}
            onClick={() => imageInputRef.current?.click()}
            title={
              routingMode === 'manual' && !modelSupportsImage
                ? `${activeModel.characterName} has no vision encoder (attachment will be flagged in manual mode)`
                : 'Attach image (PNG or JPEG, ≤ 5 MB)'
            }
          >
            <IconImage size={16} />
            <span>Image</span>
          </button>

          <button
            type="button"
            className={`btn-media-attach ${audio ? 'has-file' : ''}`}
            disabled={routingMode === 'manual' && !modelSupportsAudio}
            onClick={() => audioInputRef.current?.click()}
            title={
              routingMode === 'manual' && !modelSupportsAudio
                ? `${activeModel.characterName} has no audio encoder (attachment will be flagged in manual mode)`
                : 'Attach audio (WAV, ≤ 5 MB)'
            }
          >
            <IconAudio size={16} />
            <span>Audio</span>
          </button>
        </div>

        {/* Text Input Area */}
        <div className="composer-textarea-wrapper">
          <textarea
            id="playground-prompt"
            ref={textareaRef}
            rows={1}
            maxLength={1000}
            value={prompt}
            onChange={e => onChangePrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              task === 'ocr'
                ? 'Ask a question about the attached image, or extract its text…'
                : task === 'transcribe'
                ? 'Provide an instruction for acoustic transcription or speech analysis…'
                : task === 'decision'
                ? 'Describe the case or evidence for categorical decision classification…'
                : task === 'summarize'
                ? 'Paste the passage or dialogue you would like summarized…'
                : `Ask ${activeModel.characterName} anything… (Enter to send, Shift+Enter for newline)`
            }
            className="composer-textarea"
          />

          {prompt.length > 0 && (
            <button
              type="button"
              className="btn-composer-clear"
              onClick={() => onChangePrompt('')}
              title="Clear input text"
              aria-label="Clear input text"
            >
              <IconClose size={13} />
            </button>
          )}
        </div>

        {/* Character Count & Send / Stop Button */}
        <div className="composer-submit-group">
          <span className={`composer-char-count ${prompt.length > 900 ? 'is-warning' : ''}`}>
            {prompt.length}/1000
          </span>

          {isGenerating ? (
            <button
              type="button"
              className="btn-composer-stop"
              onClick={onStop}
              title="Stop response generation"
            >
              <IconStop size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-composer-send"
              disabled={disabled || (!prompt.trim() && !image && !audio)}
              onClick={onSend}
              title="Send request to model (Enter)"
            >
              <IconSend size={15} />
              <span>Send</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
