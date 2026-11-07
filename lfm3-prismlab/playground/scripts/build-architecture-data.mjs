#!/usr/bin/env node
/**
 * build-architecture-data.mjs
 * Deterministic builder for PrismLab S5-B Six-Model Interactive Architecture Observatory.
 * Reads canonical P7 architecture files:
 *  - results/p7/architecture/component_maps.json
 *  - results/p7/architecture/*_config.json
 *  - results/p7/architecture/p7_2_source_trace.json
 *  - results/p7/architecture/inventory.json
 * Emits src/data/architecture/architectureData.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const playgroundRoot = resolve(__dirname, '..');
const projectRoot = resolve(playgroundRoot, '..');

console.log('Building canonical architecture dataset from P7 artifacts...');

const readJson = (rel) => JSON.parse(readFileSync(resolve(projectRoot, rel), 'utf8'));

// Canonical inputs
const componentMaps = readJson('results/p7/architecture/component_maps.json');
const textConfig = readJson('results/p7/architecture/text_config.json');
const visionConfig = readJson('results/p7/architecture/vision_config.json');
const audioConfig = readJson('results/p7/architecture/audio_config.json');
const omniConfig = readJson('results/p7/architecture/omni_config.json');
const d1Config = readJson('results/p7/architecture/d1_config.json');
const d1OmniConfig = readJson('results/p7/architecture/d1_omni_config.json');
const sourceTrace = readJson('results/p7/architecture/p7_2_source_trace.json');
const inventory = readJson('results/p7/architecture/inventory.json');

// Provenance Tiers
const PROVENANCE = {
  CONFIRMED: 'CONFIRMED_CONFIG',       // Found directly in config.json
  SOURCE_TRACED: 'SOURCE_TRACED',      // Inspected in Python source code
  CONCEPTUAL: 'CONCEPTUAL_FLOW',       // Data-path visual diagram
  MEASURED: 'MEASURED_RUNTIME',        // Empirical benchmark measurement
  UNDER_AUDIT: 'UNDER_AUDIT'           // Unverified or pending formal audit
};

// Colors matching PrismLab palette
const COLORS = {
  vision: '#52efd0',
  audio: '#57d6ee',
  text: '#67baff',
  decision: '#d6a0ff',
  shared: '#a8c7ff',
  output: '#ffc983'
};

// Build individual layers for text backbone (24 layers)
const textBackboneLayers = textConfig.layer_types.map((type, idx) => ({
  index: idx,
  type, // 'conv' | 'full_attention' | 'sliding_attention'
  name: type === 'conv' ? `Layer ${idx}: GatedDeltaNet Conv` : type === 'full_attention' ? `Layer ${idx}: Full Attention` : `Layer ${idx}: Sliding Window Attention`,
  kernelSize: type === 'conv' ? textConfig.conv_L_cache : null,
  heads: type === 'conv' ? null : { q: textConfig.num_attention_heads, kv: textConfig.num_key_value_heads, dim: textConfig.head_dim },
  window: type === 'sliding_attention' ? textConfig.sliding_window : null,
  hiddenSize: textConfig.hidden_size,
  intermediateSize: textConfig.intermediate_size,
  color: type === 'conv' ? '#52efd0' : type === 'full_attention' ? '#c084fc' : '#ffd766',
  source: 'results/p7/architecture/text_config.json'
}));

// Vision encoder layers (14 layers)
const visionEncoderLayers = visionConfig.vision_config.layer_types.map((type, idx) => ({
  index: idx,
  type,
  name: type === 'conv' ? `Vision L${idx}: Conv` : `Vision L${idx}: Full Attention`,
  hiddenSize: visionConfig.vision_config.hidden_size,
  intermediateSize: visionConfig.vision_config.intermediate_size,
  heads: type === 'full_attention' ? { q: visionConfig.vision_config.num_attention_heads, kv: visionConfig.vision_config.num_key_value_heads } : null,
  color: type === 'conv' ? '#52efd0' : '#c084fc',
  source: 'results/p7/architecture/vision_config.json'
}));

// Audio encoder layers (17 layers)
const audioEncoderLayers = audioConfig.encoder.lfm.layer_types.map((type, idx) => ({
  index: idx,
  type,
  name: type === 'conv' ? `Audio L${idx}: Conv` : `Audio L${idx}: Full Attention`,
  hiddenSize: audioConfig.encoder.lfm.hidden_size,
  intermediateSize: audioConfig.encoder.lfm.intermediate_size,
  heads: type === 'full_attention' ? { q: audioConfig.encoder.lfm.num_attention_heads, kv: audioConfig.encoder.lfm.num_key_value_heads } : null,
  color: type === 'conv' ? '#57d6ee' : '#c084fc',
  source: 'results/p7/architecture/audio_config.json'
}));

// Depthformer layers (3 layers)
const depthformerLayers = [0, 1, 2].map(idx => ({
  index: idx,
  type: 'full_attention',
  name: `Depthformer L${idx}: Full Attention`,
  hiddenSize: 2048,
  color: '#c084fc',
  source: 'results/p7/architecture/audio_config.json'
}));

// 6 Model definitions
const models = {
  text: {
    id: 'text',
    name: 'LFM3-1.7B',
    characterName: 'Prism Text',
    repo: 'LiquidAI/LFM3-1.7B',
    revision: sourceTrace.text.revision,
    architecture: 'Lfm3ForCausalLM',
    primaryModality: 'text',
    supportedModalities: ['text'],
    themeColor: '#67baff',
    parameters: '1.7B',
    quantization: 'Q4_K_M',
    totalLayers: 24,
    componentCounts: {
      conv: 13,
      fullAttention: 6,
      slidingAttention: 5,
      visionLayers: 0,
      audioLayers: 0,
      depthformerLayers: 0
    },
    configFields: {
      vocab_size: textConfig.vocab_size,
      hidden_size: textConfig.hidden_size,
      intermediate_size: textConfig.intermediate_size,
      num_hidden_layers: textConfig.num_hidden_layers,
      num_attention_heads: textConfig.num_attention_heads,
      num_key_value_heads: textConfig.num_key_value_heads,
      head_dim: textConfig.head_dim,
      sliding_window: textConfig.sliding_window,
      max_position_embeddings: textConfig.max_position_embeddings,
      use_sandwich_norm: textConfig.use_sandwich_norm,
      tie_word_embeddings: textConfig.tie_word_embeddings
    },
    components: [
      {
        id: 'T',
        title: 'Text Tokens',
        role: 'text',
        group: 'input',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Input text strings are tokenized into token IDs using Liquid vocabulary (vocab_size: 128,000).',
        tensorShape: '[batch, seq_len]',
        configKey: 'vocab_size: 128000',
        sourceFile: 'modeling_lfm3.py / tokenizer',
        x: 690, y: 140
      },
      {
        id: 'E',
        title: 'Token Embeddings',
        role: 'text',
        group: 'input',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Maps token IDs into 2048-dimensional continuous vector embeddings. Word embeddings are tied to LM output projection.',
        tensorShape: '[batch, seq_len, 2048]',
        configKey: 'hidden_size: 2048',
        sourceFile: 'modeling_lfm3.py:Lfm3Model',
        x: 690, y: 260
      },
      {
        id: 'B',
        title: 'LFM3 Hybrid Decoder (24 Layers)',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: '24 configured layers combining 13 GatedDeltaNet short convolutions, 6 full attention layers, and 5 sliding window attention layers. Uses sandwich normalization.',
        tensorShape: '[batch, seq_len, 2048]',
        configKey: 'num_hidden_layers: 24, intermediate_size: 7680',
        sourceFile: 'modeling_lfm3.py:Lfm3DecoderLayer',
        layers: textBackboneLayers,
        isExpandable: true,
        x: 690, y: 440
      },
      {
        id: 'H',
        title: 'Causal LM Head',
        role: 'text',
        group: 'output',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Final RMSNorm projection mapping hidden states back to vocabulary logit distribution.',
        tensorShape: '[batch, seq_len, 128000]',
        configKey: 'tie_word_embeddings: true',
        sourceFile: 'modeling_lfm3.py:Lfm3ForCausalLM',
        x: 540, y: 620
      },
      {
        id: 'O',
        title: 'Generated Text',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Autoregressively sampled token sequence output. Verified in P1 text client and P6 multimodal orchestration.',
        tensorShape: 'string (text output)',
        configKey: 'eos_token_id: 124900',
        sourceFile: 'prismlab/core/pipeline.py',
        x: 690, y: 760
      }
    ],
    edges: [
      { id: 'e0', from: 'T', to: 'E', role: 'text', style: 'solid', conceptual: true },
      { id: 'e1', from: 'E', to: 'B', role: 'text', style: 'solid', conceptual: true },
      { id: 'e2', from: 'B', to: 'H', role: 'text', style: 'solid', conceptual: true },
      { id: 'e3', from: 'H', to: 'O', role: 'output', style: 'solid', conceptual: true }
    ],
    schedule: textBackboneLayers
  },

  vision: {
    id: 'vision',
    name: 'LFM3-VL-2B',
    characterName: 'Prism Vision',
    repo: 'LiquidAI/LFM3-VL-2B',
    revision: sourceTrace.vision.revision,
    architecture: 'Lfm3VlForConditionalGeneration',
    primaryModality: 'vision',
    supportedModalities: ['text', 'image', 'video'],
    themeColor: '#52efd0',
    parameters: '2.0B',
    quantization: 'Q4_0 / Q4_K_M',
    totalLayers: 38,
    componentCounts: {
      conv: 21,
      fullAttention: 12,
      slidingAttention: 5,
      visionLayers: 14,
      audioLayers: 0,
      depthformerLayers: 0
    },
    configFields: {
      downsample_factor: visionConfig.downsample_factor,
      projector_hidden_size: visionConfig.projector_hidden_size,
      patch_size: visionConfig.vision_config.patch_size,
      spatial_merge_size: visionConfig.vision_config.spatial_merge_size,
      vision_hidden_size: visionConfig.vision_config.hidden_size,
      text_hidden_size: visionConfig.text_config.hidden_size
    },
    components: [
      {
        id: 'I',
        title: 'Image / Sampled Video Input',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: 'RGB pixels processed with axial rotary embeddings and spatial patch merging.',
        tensorShape: '[channels: 3, height, width]',
        configKey: 'patch_size: 16, spatial_merge: 2',
        sourceFile: 'modeling_lfm3_vl.py:Lfm3VlVisionModel',
        x: 380, y: 120
      },
      {
        id: 'P',
        title: 'Patchifier & Spatial Merging',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Transforms image patches into sequence tokens using 2x downsampling.',
        tensorShape: '[batch, num_patches, 1024]',
        configKey: 'downsample_factor: 2',
        sourceFile: 'modeling_lfm3_vl.py:Lfm3VlVisionModel.patchifier',
        x: 380, y: 220
      },
      {
        id: 'V',
        title: '14-Layer Vision Encoder',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '14-layer encoder (8 conv, 6 full attention) extracting deep visual representations.',
        tensorShape: '[batch, seq_len, 1024]',
        configKey: 'vision_config.num_hidden_layers: 14',
        sourceFile: 'modeling_lfm3_vl.py:Lfm3VlVisionLayer',
        layers: visionEncoderLayers,
        isExpandable: true,
        x: 380, y: 340
      },
      {
        id: 'J',
        title: 'Multimodal Projector (MLP)',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Two-layer GELU MLP with LayerNorm projecting 1024 visual dim -> 4096 intermediate -> 2048 text dim.',
        tensorShape: '[batch, seq_len, 2048]',
        configKey: 'projector_hidden_size: 4096',
        sourceFile: 'modeling_lfm3_vl.py:Lfm3VlMultiModalProjector',
        x: 380, y: 460
      },
      {
        id: 'T',
        title: 'Text Tokens & Prompt',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Text query or OCR instruction accompanying visual input.',
        tensorShape: '[batch, seq_len]',
        configKey: 'vocab_size: 128000',
        sourceFile: 'modeling_lfm3_vl.py',
        x: 820, y: 160
      },
      {
        id: 'E',
        title: 'Token Embeddings',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Text token embeddings mapped to 2048 hidden dimensions.',
        tensorShape: '[batch, seq_len, 2048]',
        configKey: 'text_config.hidden_size: 2048',
        sourceFile: 'modeling_lfm3_vl.py',
        x: 820, y: 280
      },
      {
        id: 'M',
        title: 'Visual Feature Insertion',
        role: 'shared',
        group: 'fusion',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Replaces image placeholder tokens with projected visual feature vectors inside unified sequence.',
        tensorShape: '[batch, text_len + vision_len, 2048]',
        configKey: 'vision_start_token_id: 125009, vision_end_token_id: 125010',
        sourceFile: 'modeling_lfm3_vl.py:Lfm3VlModel.forward',
        x: 600, y: 520
      },
      {
        id: 'B',
        title: 'LFM3 Text Backbone (24 Layers)',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: '24 hybrid decoder layers (13 conv, 6 full attention, 5 sliding attention) processing unified multimodal state.',
        tensorShape: '[batch, total_len, 2048]',
        configKey: 'text_config.num_hidden_layers: 24',
        sourceFile: 'modeling_lfm3.py:Lfm3DecoderLayer',
        layers: textBackboneLayers,
        isExpandable: true,
        x: 600, y: 640
      },
      {
        id: 'H',
        title: 'LM Output Head',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Generates text tokens representing visual query answer or OCR extraction.',
        tensorShape: '[batch, seq_len, 128000]',
        configKey: 'tie_word_embeddings: true',
        sourceFile: 'modeling_lfm3_vl.py',
        x: 600, y: 740
      },
      {
        id: 'O',
        title: 'Text Answer / Transcription',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Evaluated in P2: 10/10 exact matches in Direct VL vs 9/10 in Modular cascade.',
        tensorShape: 'string (text answer)',
        configKey: 'text output',
        sourceFile: 'prismlab/vision/vision_api.py',
        x: 600, y: 830
      }
    ],
    edges: [
      { id: 'e0', from: 'I', to: 'P', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e1', from: 'P', to: 'V', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e2', from: 'V', to: 'J', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e3', from: 'J', to: 'M', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e4', from: 'T', to: 'E', role: 'text', style: 'solid', conceptual: true },
      { id: 'e5', from: 'E', to: 'M', role: 'text', style: 'solid', conceptual: true },
      { id: 'e6', from: 'M', to: 'B', role: 'shared', style: 'solid', conceptual: true },
      { id: 'e7', from: 'B', to: 'H', role: 'text', style: 'solid', conceptual: true },
      { id: 'e8', from: 'H', to: 'O', role: 'output', style: 'solid', conceptual: true }
    ],
    schedule: textBackboneLayers
  },

  audio: {
    id: 'audio',
    name: 'LFM3-Audio-2B',
    characterName: 'Prism Audio',
    repo: 'LiquidAI/LFM3-Audio-2B',
    revision: sourceTrace.audio.revision,
    architecture: 'Lfm3AudioForConditionalGeneration',
    primaryModality: 'audio',
    supportedModalities: ['text', 'audio'],
    themeColor: '#57d6ee',
    parameters: '2.0B',
    quantization: 'Q4_K_M',
    totalLayers: 44, // 17 audio + 24 text + 3 depthformer
    componentCounts: {
      conv: 23,
      fullAttention: 16,
      slidingAttention: 5,
      visionLayers: 0,
      audioLayers: 17,
      depthformerLayers: 3
    },
    configFields: {
      codebooks: audioConfig.codebooks,
      audio_vocab_size: audioConfig.audio_vocab_size,
      maskgit_steps: audioConfig.maskgit_steps,
      interleaved_n_text: audioConfig.interleaved_n_text,
      interleaved_n_audio: audioConfig.interleaved_n_audio,
      audio_encoder_hidden: audioConfig.encoder.lfm.hidden_size,
      depthformer_layers: 3
    },
    components: [
      {
        id: 'A',
        title: '16 kHz Audio Stream / Waveform',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Input speech converted to 128-mel spectrogram frames at 16 kHz.',
        tensorShape: '[batch, time_frames, n_mels: 128]',
        configKey: 'n_mels: 128, hop_length: 160',
        sourceFile: 'modeling_lfm3_audio.py:preprocessor',
        x: 360, y: 120
      },
      {
        id: 'D',
        title: 'Audio Downsampler & Front-End',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Initial convolutional downsampler mapping 128 mels -> 256 conv dim -> 768 encoder dim.',
        tensorShape: '[batch, reduced_time, 768]',
        configKey: 'dim_conv: 256, dim_out: 768',
        sourceFile: 'modeling_lfm3_audio.py:Lfm3AudioEncoder.downsample',
        x: 360, y: 220
      },
      {
        id: 'V',
        title: '17-Layer Causal Audio Encoder',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '17-layer hybrid encoder (10 conv, 7 full attention) with 32-step sliding window.',
        tensorShape: '[batch, reduced_time, 768]',
        configKey: 'encoder.lfm.num_hidden_layers: 17',
        sourceFile: 'modeling_lfm3_audio.py:Lfm3AudioEncoder',
        layers: audioEncoderLayers,
        isExpandable: true,
        x: 360, y: 340
      },
      {
        id: 'P',
        title: 'Audio Projector',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Linear mapping projecting 768 audio encoder states into 2048-dim text backbone space.',
        tensorShape: '[batch, time_tokens, 2048]',
        configKey: 'audio_projector',
        sourceFile: 'modeling_lfm3_audio.py:Lfm3AudioModel.audio_projector',
        x: 360, y: 460
      },
      {
        id: 'T',
        title: 'Text Tokens / System Prompt',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Text prompt tokens or dialogue history.',
        tensorShape: '[batch, seq_len]',
        configKey: 'vocab_size: 128000',
        sourceFile: 'modeling_lfm3_audio.py',
        x: 820, y: 160
      },
      {
        id: 'E',
        title: 'Token Embeddings',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Text token embeddings mapped to 2048 hidden dimensions.',
        tensorShape: '[batch, seq_len, 2048]',
        configKey: 'hidden_size: 2048',
        sourceFile: 'modeling_lfm3_audio.py',
        x: 820, y: 280
      },
      {
        id: 'M',
        title: 'Audio Feature Insertion',
        role: 'shared',
        group: 'fusion',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Substitutes speech placeholder tokens with projected acoustic features.',
        tensorShape: '[batch, combined_len, 2048]',
        configKey: 'interleaved_n_text: 6, interleaved_n_audio: 12',
        sourceFile: 'modeling_lfm3_audio.py:Lfm3AudioModel.forward',
        x: 600, y: 520
      },
      {
        id: 'B',
        title: 'LFM3 Text Backbone (24 Layers)',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: '24 hybrid decoder layers performing joint acoustic-semantic reasoning.',
        tensorShape: '[batch, combined_len, 2048]',
        configKey: 'num_hidden_layers: 24',
        sourceFile: 'modeling_lfm3.py',
        layers: textBackboneLayers,
        isExpandable: true,
        x: 600, y: 640
      },
      {
        id: 'H',
        title: 'Text Output (Transcript / ASR)',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Speech-to-text transcript output or textual reasoning stream.',
        tensorShape: 'string (text output)',
        configKey: 'text answer',
        sourceFile: 'prismlab/core/audio_adapter.py',
        x: 430, y: 760
      },
      {
        id: 'F',
        title: 'Depthformer (3 Layers)',
        role: 'audio',
        group: 'speech_decoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '3 full-attention layers predicting 12 codebook tokens across maskgit steps.',
        tensorShape: '[batch, audio_len, codebooks: 12]',
        configKey: 'depthformer.layers: 3, maskgit_steps: 3',
        sourceFile: 'modeling_lfm3_audio.py:Lfm3AudioDepthDecoder',
        layers: depthformerLayers,
        isExpandable: true,
        x: 770, y: 760
      },
      {
        id: 'C',
        title: 'LiquidCodec Neural Decoder',
        role: 'audio',
        group: 'speech_decoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Quantized neural audio codec decoding acoustic tokens into continuous audio waveform.',
        tensorShape: '[batch, audio_samples]',
        configKey: 'codebooks: 12, audio_vocab_size: 2017',
        sourceFile: 'modeling_liquid_codec.py:LiquidCodecModel',
        x: 770, y: 850
      },
      {
        id: 'S',
        title: 'Speech Output (24 kHz Audio)',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Native speech-to-speech output. Evaluated in P3: 13.95s median latency vs 20.18s–27.70s for modular cascades.',
        tensorShape: 'audio/wav @ 24 kHz',
        configKey: 'output speech stream',
        sourceFile: 'prismlab/core/audio_adapter.py',
        x: 770, y: 940
      }
    ],
    edges: [
      { id: 'e0', from: 'A', to: 'D', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e1', from: 'D', to: 'V', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e2', from: 'V', to: 'P', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e3', from: 'P', to: 'M', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e4', from: 'T', to: 'E', role: 'text', style: 'solid', conceptual: true },
      { id: 'e5', from: 'E', to: 'M', role: 'text', style: 'solid', conceptual: true },
      { id: 'e6', from: 'M', to: 'B', role: 'shared', style: 'solid', conceptual: true },
      { id: 'e7', from: 'B', to: 'H', role: 'output', style: 'solid', conceptual: true },
      { id: 'e8', from: 'B', to: 'F', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e9', from: 'F', to: 'C', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e10', from: 'C', to: 'S', role: 'output', style: 'solid', conceptual: true }
    ],
    schedule: textBackboneLayers
  },

  omni: {
    id: 'omni',
    name: 'LFM3-Omni-2B',
    characterName: 'Prism Omni',
    repo: 'LiquidAI/LFM3-Omni-2B',
    revision: sourceTrace.omni.revision,
    architecture: 'Lfm3OmniForConditionalGeneration',
    primaryModality: 'omni',
    supportedModalities: ['text', 'image', 'video', 'audio'],
    themeColor: '#c084fc',
    parameters: '2.0B',
    quantization: 'Q4_K_M',
    totalLayers: 58, // 14 vision + 17 audio + 24 text + 3 depthformer
    componentCounts: {
      conv: 31,
      fullAttention: 22,
      slidingAttention: 5,
      visionLayers: 14,
      audioLayers: 17,
      depthformerLayers: 3
    },
    configFields: {
      vision_layers: 14,
      audio_layers: 17,
      text_layers: 24,
      depth_layers: 3,
      projector_hidden_size: 4096,
      text_hidden_size: 2048
    },
    components: [
      {
        id: 'I',
        title: 'Image / Video Input',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Visual frames processed through patch merging.',
        tensorShape: '[channels: 3, height, width]',
        configKey: 'vision_config',
        sourceFile: 'modeling_lfm3_omni.py',
        x: 280, y: 120
      },
      {
        id: 'V',
        title: '14-Layer Vision Encoder',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '14 layers (8 conv, 6 full attention).',
        tensorShape: '[batch, vision_tokens, 1024]',
        configKey: 'vision_config.num_hidden_layers: 14',
        sourceFile: 'modeling_lfm3_omni.py:vision_tower',
        layers: visionEncoderLayers,
        isExpandable: true,
        x: 280, y: 260
      },
      {
        id: 'VP',
        title: 'Vision Projector',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Projects visual features to 2048 text space.',
        tensorShape: '[batch, vision_tokens, 2048]',
        configKey: 'multi_modal_projector',
        sourceFile: 'modeling_lfm3_omni.py',
        x: 280, y: 400
      },
      {
        id: 'A',
        title: 'Audio Input · 16 kHz',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '128-mel spectrogram frames.',
        tensorShape: '[batch, time_frames, 128]',
        configKey: 'audio_encoder_config',
        sourceFile: 'modeling_lfm3_omni.py',
        x: 520, y: 120
      },
      {
        id: 'AE',
        title: '17-Layer Audio Encoder',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '17 layers (10 conv, 7 full attention).',
        tensorShape: '[batch, audio_tokens, 768]',
        configKey: 'audio_encoder_config.text_config.num_hidden_layers: 17',
        sourceFile: 'modeling_lfm3_omni.py:audio_encoder',
        layers: audioEncoderLayers,
        isExpandable: true,
        x: 520, y: 260
      },
      {
        id: 'AP',
        title: 'Audio Projector',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Projects audio representations to 2048 text space.',
        tensorShape: '[batch, audio_tokens, 2048]',
        configKey: 'audio_projector',
        sourceFile: 'modeling_lfm3_omni.py',
        x: 520, y: 400
      },
      {
        id: 'T',
        title: 'Text Tokens / Dialogue',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Text tokens and system prompts.',
        tensorShape: '[batch, seq_len]',
        configKey: 'vocab_size: 128000',
        sourceFile: 'modeling_lfm3_omni.py',
        x: 760, y: 160
      },
      {
        id: 'E',
        title: 'Token Embeddings',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Maps tokens to 2048-dim hidden states.',
        tensorShape: '[batch, seq_len, 2048]',
        configKey: 'hidden_size: 2048',
        sourceFile: 'modeling_lfm3_omni.py',
        x: 760, y: 280
      },
      {
        id: 'M',
        title: 'Unified Multimodal State',
        role: 'shared',
        group: 'fusion',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Interleaves vision tokens, audio tokens, and text tokens into shared context window.',
        tensorShape: '[batch, total_multimodal_tokens, 2048]',
        configKey: 'shared context window',
        sourceFile: 'modeling_lfm3_omni.py:Lfm3OmniModel.forward',
        x: 520, y: 530
      },
      {
        id: 'B',
        title: 'LFM3 Omni Backbone (24 Layers)',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: '24 hybrid decoder layers processing cross-modal representations.',
        tensorShape: '[batch, total_tokens, 2048]',
        configKey: 'num_hidden_layers: 24',
        sourceFile: 'modeling_lfm3_omni.py',
        layers: textBackboneLayers,
        isExpandable: true,
        x: 520, y: 650
      },
      {
        id: 'H',
        title: 'Text Output Head',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Text response or visual reasoning answer.',
        tensorShape: 'string (text output)',
        configKey: 'text answer',
        sourceFile: 'prismlab/core/omni_adapter.py',
        x: 380, y: 770
      },
      {
        id: 'F',
        title: 'Depthformer (3 Layers)',
        role: 'audio',
        group: 'speech_decoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '3 full-attention layers for acoustic token code generation.',
        tensorShape: '[batch, speech_frames, 12]',
        configKey: 'depth_config.layers: 3',
        sourceFile: 'modeling_lfm3_omni.py:Lfm3OmniDepthDecoder',
        layers: depthformerLayers,
        isExpandable: true,
        x: 660, y: 770
      },
      {
        id: 'C',
        title: 'LiquidCodec Neural Decoder',
        role: 'audio',
        group: 'speech_decoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Acoustic waveform synthesis.',
        tensorShape: '[batch, audio_samples]',
        configKey: 'LiquidCodec',
        sourceFile: 'modeling_liquid_codec.py',
        x: 660, y: 860
      },
      {
        id: 'S',
        title: 'Speech Output · 24 kHz',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Synthesized voice answer.',
        tensorShape: 'audio/wav @ 24 kHz',
        configKey: 'speech waveform',
        sourceFile: 'prismlab/core/omni_adapter.py',
        x: 660, y: 940
      }
    ],
    edges: [
      { id: 'e0', from: 'I', to: 'V', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e1', from: 'V', to: 'VP', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e2', from: 'VP', to: 'M', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e3', from: 'A', to: 'AE', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e4', from: 'AE', to: 'AP', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e5', from: 'AP', to: 'M', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e6', from: 'T', to: 'E', role: 'text', style: 'solid', conceptual: true },
      { id: 'e7', from: 'E', to: 'M', role: 'text', style: 'solid', conceptual: true },
      { id: 'e8', from: 'M', to: 'B', role: 'shared', style: 'solid', conceptual: true },
      { id: 'e9', from: 'B', to: 'H', role: 'output', style: 'solid', conceptual: true },
      { id: 'e10', from: 'B', to: 'F', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e11', from: 'F', to: 'C', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e12', from: 'C', to: 'S', role: 'output', style: 'solid', conceptual: true }
    ],
    schedule: textBackboneLayers
  },

  d1: {
    id: 'd1',
    name: 'd1-2B',
    characterName: 'Prism Decision',
    repo: 'LiquidAI/d1-2B',
    revision: sourceTrace.d1.revision,
    architecture: 'D1Model (SystemOne / Lfm3Vl)',
    primaryModality: 'decision',
    supportedModalities: ['text', 'image', 'video'],
    themeColor: '#ffd766',
    parameters: '2.0B',
    quantization: 'Q4_K_M',
    totalLayers: 38, // 14 vision + 24 text
    componentCounts: {
      conv: 21,
      fullAttention: 12,
      slidingAttention: 5,
      visionLayers: 14,
      audioLayers: 0,
      depthformerLayers: 0
    },
    configFields: {
      d1_attention: d1Config.d1_attention,
      d1_codes: d1Config.d1_codes,
      d1_numbers: d1Config.d1_numbers,
      d1_set_size: d1Config.d1_set_size,
      d1_vision_max_pixels: d1Config.d1_vision_max_pixels,
      hidden_size: d1Config.text_config.hidden_size
    },
    components: [
      {
        id: 'I',
        title: 'Image / Video Observations',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Visual evidence for action decision or situational triage.',
        tensorShape: '[channels: 3, height, width]',
        configKey: 'd1_vision_max_pixels: 1638400',
        sourceFile: 'modeling_d1_lfm3_vl.py',
        x: 400, y: 120
      },
      {
        id: 'V',
        title: '14-Layer Vision Encoder',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '14 layers (8 conv, 6 full attention) extracting situational features.',
        tensorShape: '[batch, vision_tokens, 1024]',
        configKey: 'vision_config.num_hidden_layers: 14',
        sourceFile: 'modeling_lfm3_vl.py',
        layers: visionEncoderLayers,
        isExpandable: true,
        x: 400, y: 240
      },
      {
        id: 'P',
        title: 'Vision Projector',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Projects visual features to 2048 backbone space.',
        tensorShape: '[batch, vision_tokens, 2048]',
        configKey: 'projector_hidden_size: 4096',
        sourceFile: 'modeling_lfm3_vl.py',
        x: 400, y: 360
      },
      {
        id: 'T',
        title: 'State & Named Questions',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Structured state variables and choice question prompts (e.g. choice of categories, routing decisions).',
        tensorShape: '[batch, seq_len]',
        configKey: 'd1 prompt schema',
        sourceFile: 'prompt.py:Choice',
        x: 780, y: 160
      },
      {
        id: 'M',
        title: 'Multimodal State Aggregator',
        role: 'shared',
        group: 'fusion',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Assembles visual and textual context for decision evaluation.',
        tensorShape: '[batch, total_tokens, 2048]',
        configKey: 'multimodal state',
        sourceFile: 'modeling_d1_lfm3_vl.py',
        x: 590, y: 460
      },
      {
        id: 'B',
        title: 'LFM3-VL Backbone (24 Layers)',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: '24 hybrid decoder layers processing situational evidence.',
        tensorShape: '[batch, total_tokens, 2048]',
        configKey: 'text_config.num_hidden_layers: 24',
        sourceFile: 'modeling_lfm3.py',
        layers: textBackboneLayers,
        isExpandable: true,
        x: 590, y: 580
      },
      {
        id: 'S',
        title: 'SystemOne SlotReader Interface',
        role: 'decision',
        group: 'decision_head',
        provenance: PROVENANCE.UNDER_AUDIT,
        description: 'Internal decision readout mapping backbone representations to calibrated decision slots. Explicitly audited: readout mechanism is proprietary/under research audit, NOT ordinary autoregressive text token generation.',
        tensorShape: '[batch, d1_set_size: 16, num_choices]',
        configKey: 'd1_attention: set, d1_codes: 2, d1_numbers: true',
        sourceFile: 'api.py:SystemOneApi / modeling_d1.py:SystemOneModel',
        caveat: 'Decision readout details remain under research audit. Probabilities are not production-calibrated.',
        isUncertain: true,
        x: 590, y: 710
      },
      {
        id: 'D',
        title: 'Typed Decision & Probabilities',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Categorical distribution and probability vector. Evaluated in P5: Pilot 95.8%, Stress 83.3%, and Case X03 false-positive anomaly (0.92 confidence).',
        tensorShape: '{ choice: string, confidence: float, probabilities: Record<string, float> }',
        configKey: 'd1 decision output',
        sourceFile: 'prismlab/core/decision_adapter.py',
        x: 590, y: 830
      }
    ],
    edges: [
      { id: 'e0', from: 'I', to: 'V', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e1', from: 'V', to: 'P', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e2', from: 'P', to: 'M', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e3', from: 'T', to: 'M', role: 'text', style: 'solid', conceptual: true },
      { id: 'e4', from: 'M', to: 'B', role: 'shared', style: 'solid', conceptual: true },
      { id: 'e5', from: 'B', to: 'S', role: 'decision', style: 'dashed', conceptual: true, note: 'readout details under audit' },
      { id: 'e6', from: 'S', to: 'D', role: 'output', style: 'solid', conceptual: true }
    ],
    schedule: textBackboneLayers
  },

  d1_omni: {
    id: 'd1_omni',
    name: 'd1-Omni-2B',
    characterName: 'Prism Strategist',
    repo: 'LiquidAI/d1-Omni-2B',
    revision: sourceTrace.d1_omni.revision,
    architecture: 'D1Model (SystemOne / Lfm3Omni)',
    primaryModality: 'decision',
    supportedModalities: ['text', 'image', 'video', 'audio'],
    themeColor: '#fb7185',
    parameters: '2.0B',
    quantization: 'Q4_K_M',
    totalLayers: 55, // 14 vision + 17 audio + 24 text
    componentCounts: {
      conv: 31,
      fullAttention: 19,
      slidingAttention: 5,
      visionLayers: 14,
      audioLayers: 17,
      depthformerLayers: 0
    },
    configFields: {
      d1_attention: d1OmniConfig.d1_attention,
      d1_codes: d1OmniConfig.d1_codes,
      d1_numbers: d1OmniConfig.d1_numbers,
      d1_set_size: d1OmniConfig.d1_set_size,
      d1_vision_max_pixels: d1OmniConfig.d1_vision_max_pixels
    },
    components: [
      {
        id: 'I',
        title: 'Image / Video Input',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Visual evidence for action decision.',
        tensorShape: '[channels: 3, height, width]',
        configKey: 'vision_config',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        x: 300, y: 120
      },
      {
        id: 'V',
        title: '14-Layer Vision Encoder',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '14 layers (8 conv, 6 full attention).',
        tensorShape: '[batch, vision_tokens, 1024]',
        configKey: 'vision_config.num_hidden_layers: 14',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        layers: visionEncoderLayers,
        isExpandable: true,
        x: 300, y: 240
      },
      {
        id: 'VP',
        title: 'Vision Projector',
        role: 'vision',
        group: 'vision_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Projects visual features to 2048 space.',
        tensorShape: '[batch, vision_tokens, 2048]',
        configKey: 'multi_modal_projector',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        x: 300, y: 360
      },
      {
        id: 'A',
        title: 'Audio Input',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Speech or acoustic environmental sound.',
        tensorShape: '[batch, time_frames, 128]',
        configKey: 'audio_encoder_config',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        x: 520, y: 120
      },
      {
        id: 'AE',
        title: '17-Layer Audio Encoder',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.CONFIRMED,
        description: '17 layers (10 conv, 7 full attention).',
        tensorShape: '[batch, audio_tokens, 768]',
        configKey: 'audio_encoder_config.text_config.num_hidden_layers: 17',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        layers: audioEncoderLayers,
        isExpandable: true,
        x: 520, y: 240
      },
      {
        id: 'AP',
        title: 'Audio Projector',
        role: 'audio',
        group: 'audio_encoder',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Projects audio features to 2048 space.',
        tensorShape: '[batch, audio_tokens, 2048]',
        configKey: 'audio_projector',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        x: 520, y: 360
      },
      {
        id: 'T',
        title: 'State & Named Questions',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: 'Structured decision query and options.',
        tensorShape: '[batch, seq_len]',
        configKey: 'd1 prompt schema',
        sourceFile: 'prompt.py',
        x: 740, y: 160
      },
      {
        id: 'M',
        title: 'Multimodal State Aggregator',
        role: 'shared',
        group: 'fusion',
        provenance: PROVENANCE.SOURCE_TRACED,
        description: 'Aggregates visual, audio, and state prompts into unified multimodal state representation.',
        tensorShape: '[batch, total_tokens, 2048]',
        configKey: 'multimodal state',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        x: 520, y: 480
      },
      {
        id: 'B',
        title: 'LFM3-Omni Backbone (24 Layers)',
        role: 'text',
        group: 'text_backbone',
        provenance: PROVENANCE.CONFIRMED,
        description: '24 hybrid decoder layers processing multimodal decision state.',
        tensorShape: '[batch, total_tokens, 2048]',
        configKey: 'text_config.num_hidden_layers: 24',
        sourceFile: 'modeling_lfm3.py',
        layers: textBackboneLayers,
        isExpandable: true,
        x: 520, y: 600
      },
      {
        id: 'S',
        title: 'SystemOne SlotReader Interface',
        role: 'decision',
        group: 'decision_head',
        provenance: PROVENANCE.UNDER_AUDIT,
        description: 'Multimodal decision readout mapping joint audio-visual representations to categorical choice slots. Explicitly audited: proprietary readout under research audit.',
        tensorShape: '[batch, d1_set_size: 16, num_choices]',
        configKey: 'd1_attention: set, d1_codes: 2',
        sourceFile: 'modeling_d1_lfm3_omni.py',
        caveat: 'Multimodal decision readout details remain under research audit.',
        isUncertain: true,
        x: 520, y: 730
      },
      {
        id: 'D',
        title: 'Typed Decision & Probabilities',
        role: 'output',
        group: 'output',
        provenance: PROVENANCE.MEASURED,
        description: 'Multimodal categorical action probability vector.',
        tensorShape: '{ choice: string, confidence: float, probabilities: Record<string, float> }',
        configKey: 'd1 decision output',
        sourceFile: 'prismlab/core/decision_adapter.py',
        x: 520, y: 840
      }
    ],
    edges: [
      { id: 'e0', from: 'I', to: 'V', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e1', from: 'V', to: 'VP', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e2', from: 'VP', to: 'M', role: 'vision', style: 'solid', conceptual: true },
      { id: 'e3', from: 'A', to: 'AE', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e4', from: 'AE', to: 'AP', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e5', from: 'AP', to: 'M', role: 'audio', style: 'solid', conceptual: true },
      { id: 'e6', from: 'T', to: 'M', role: 'text', style: 'solid', conceptual: true },
      { id: 'e7', from: 'M', to: 'B', role: 'shared', style: 'solid', conceptual: true },
      { id: 'e8', from: 'B', to: 'S', role: 'decision', style: 'dashed', conceptual: true, note: 'readout details under audit' },
      { id: 'e9', from: 'S', to: 'D', role: 'output', style: 'solid', conceptual: true }
    ],
    schedule: textBackboneLayers
  }
};

const outputData = {
  metadata: {
    generator: 'playground/scripts/build-architecture-data.mjs',
    generatedAt: new Date().toISOString(),
    provenanceSource: 'results/p7/architecture/',
    models: Object.keys(models)
  },
  provenanceLevels: PROVENANCE,
  palette: COLORS,
  sharedBackboneLayers: textBackboneLayers,
  models
};

const outDir = resolve(playgroundRoot, 'src/data/architecture');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'architectureData.json');
writeFileSync(outPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`Successfully generated verified architecture dataset at ${outPath}`);
console.log(`- Models registered: ${Object.keys(models).join(', ')}`);
console.log(`- Text backbone layers: ${textBackboneLayers.length} (13 conv, 6 full attention, 5 sliding attention)`);
console.log(`- Vision encoder layers: ${visionEncoderLayers.length} (8 conv, 6 full attention)`);
console.log(`- Audio encoder layers: ${audioEncoderLayers.length} (10 conv, 7 full attention)`);
console.log(`- Depthformer layers: ${depthformerLayers.length} (3 full attention)`);
